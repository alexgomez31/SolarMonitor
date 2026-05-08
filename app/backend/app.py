# =============================================================================
# SolarMonitor PV - Backend Flask
# Plataforma de monitoreo fotovoltaico en tiempo real
# Ubicación: Parque Caldas, Popayán (Cauca, Colombia)
# =============================================================================

import os
from flask import Flask, render_template, jsonify
from flask_cors import CORS
import requests
import threading
import time
from datetime import datetime, date

# IA / Machine Learning
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures, StandardScaler
from sklearn.cluster import KMeans
from sklearn.pipeline import Pipeline
from scipy import stats
import warnings
warnings.filterwarnings('ignore')

# =============================================================================
# CONFIGURACIÓN DE LA APLICACIÓN
# =============================================================================

_base_dir = os.path.dirname(os.path.abspath(__file__))
_dist_dir = os.path.join(_base_dir, '..', 'dist')

app = Flask(
    __name__,
    template_folder=_dist_dir,
    static_folder=os.path.join(_dist_dir, 'assets'),
    static_url_path='/assets'
)
CORS(app)

FIREBASE_URL = "https://caldas-v2-default-rtdb.firebaseio.com/"

# Tiempo máximo de silencio del circuito antes de considerar desconexión (segundos)
CIRCUIT_TIMEOUT_SEC = 60

# Estado interno del backend
_state = {
    # Conexión App ↔ Firebase (HTTP)
    "firebase_ok":        False,
    "firebase_checked_at": None,   # datetime del último chequeo HTTP

    # Conexión Circuito ↔ Firebase
    "circuit_ok":          False,
    "circuit_last_seen":   None,   # datetime calculado desde hora + fecha del último registro
    "circuit_last_hora":   None,   # string "HH:MM:SS" del último registro del circuito
    "circuit_last_fecha":  None,   # string "YYYY-MM-DD" del último registro

    # Control de polling: si False, el hilo NO consulta Firebase
    "polling_active":      True,
}

# Cache de valores para el frontend
data_cache = {
    # Datos del circuito Arduino (campos reales que manda el ESP8266)
    "ldr":        0,           # valor analógico del fotosensor (0-1024)
    "estadoLDR":  "APAGADO",  # estado calculado del LED: ENCENDIDO | APAGADO
    "estado":     "DESCONOCIDO",  # estado batería/panel: CARGANDO | EQUILIBRIO | DESCARGANDO | DESCONOCIDO
    "hora":       None,
    "panel":      {"voltaje_V": 0, "corriente_mA": 0, "potencia_mW": 0},
    "bateria":    {"voltaje_V": 0, "corriente_mA": 0, "potencia_mW": 0},

    # Timestamps
    "server_timestamp":  None,   # cuándo el backend hizo la última consulta HTTP a Firebase
    "circuit_timestamp": None,   # cuándo el circuito envió su último dato (fecha + hora del registro)

    # Flags de conexión
    "firebase_connected": False,  # App puede hablar con Firebase (HTTP)
    "circuit_connected":  False,  # Circuito sigue enviando datos a Firebase

    # Retrocompatibilidad
    "connected":          False,  # True solo si AMBAS conexiones están OK

    # Control de polling
    "polling_active":     True,   # Si False, el backend NO consulta Firebase
}

# =============================================================================
# PARSEO DE FIREBASE
# =============================================================================

def parse_reading(record: dict) -> dict:
    """Parsea un registro tal como lo envía el Arduino:
       { hora, ldr, estadoLDR, estado }
    """
    panel = record.get("panel", {})
    bateria = record.get("bateria", {})
    return {
        "ldr":       int(record.get("ldr",        0)),
        "estadoLDR": str(record.get("estadoLDR",  "APAGADO")),
        "estado":    str(record.get("estado",     "DESCONOCIDO")),
        "hora":      record.get("hora", None),
        "panel": {
            "voltaje_V": float(panel.get("voltaje_V", 0)),
            "corriente_mA": float(panel.get("corriente_mA", 0)),
            "potencia_mW": float(panel.get("potencia_mW", 0)),
        },
        "bateria": {
            "voltaje_V": float(bateria.get("voltaje_V", 0)),
            "corriente_mA": float(bateria.get("corriente_mA", 0)),
            "potencia_mW": float(bateria.get("potencia_mW", 0)),
        }
    }


def get_latest_with_date(lecturas: dict):
    """
    Retorna (record_dict, fecha_str) del registro más reciente.
    Busca registros que tengan al menos el campo 'hora' (formato del Arduino).
    """
    if not lecturas or not isinstance(lecturas, dict):
        return None, None
    for day_key in sorted(lecturas.keys(), reverse=True):
        day_data = lecturas[day_key]
        if not isinstance(day_data, dict):
            continue
        for push_id in sorted(day_data.keys(), reverse=True):
            record = day_data[push_id]
            if isinstance(record, dict) and "hora" in record:
                return parse_reading(record), day_key
    return None, None


def circuit_datetime_from(fecha: str, hora: str) -> datetime | None:
    """Construye un datetime combinando la fecha del registro y la hora del campo `hora`."""
    try:
        return datetime.strptime(f"{fecha} {hora}", "%Y-%m-%d %H:%M:%S")
    except Exception:
        return None


def fetch_data_from_firebase():
    global data_cache, _state

    now = datetime.now()

    try:
        # 1. Obtener la fecha más reciente (usando shallow para no descargar datos)
        # Esto devuelve un dict con las fechas como llaves y true como valor
        resp_shallow = requests.get(f"{FIREBASE_URL}/lecturas.json?shallow=true", timeout=8)
        if resp_shallow.status_code != 200:
            _state["firebase_ok"] = False
            print(f"[ERROR] Firebase Shallow HTTP {resp_shallow.status_code}")
            return

        _state["firebase_ok"] = True
        _state["firebase_checked_at"] = now
        dates = resp_shallow.json()

        if not dates or not isinstance(dates, dict):
            _state["circuit_ok"] = False
            print("[WARN] No hay fechas en 'lecturas'")
            return

        # Encontrar la fecha más reciente (llave mayor)
        latest_date = sorted(dates.keys())[-1]

        # 2. Obtener SOLO el último registro de esa fecha
        resp_latest = requests.get(
            f"{FIREBASE_URL}/lecturas/{latest_date}.json?orderBy=\"$key\"&limitToLast=1",
            timeout=8
        )

        if resp_latest.status_code == 200:
            latest_day_data = resp_latest.json()
            if not latest_day_data or not isinstance(latest_day_data, dict):
                _state["circuit_ok"] = False
                return

            # Firebase con limitToLast devuelve un dict { "push_id": { ...data... } }
            push_id = list(latest_day_data.keys())[0]
            record = latest_day_data[push_id]
            latest = parse_reading(record)
            fecha = latest_date

            hora_str = latest["hora"] or "00:00:00"
            circuit_dt = circuit_datetime_from(fecha, hora_str)

            # ¿El circuito sigue enviando datos?
            if circuit_dt:
                elapsed = (now - circuit_dt).total_seconds()
                circuit_alive = elapsed <= CIRCUIT_TIMEOUT_SEC
            else:
                circuit_alive = False

            _state["circuit_ok"]         = circuit_alive
            _state["circuit_last_seen"]  = circuit_dt
            _state["circuit_last_hora"]  = hora_str
            _state["circuit_last_fecha"] = fecha

            # Actualizar cache
            if circuit_alive:
                data_cache.update({
                    "ldr":       latest["ldr"],
                    "estadoLDR": latest["estadoLDR"],
                    "estado":    latest["estado"],
                    "hora":      hora_str,
                    "panel":     latest["panel"],
                    "bateria":   latest["bateria"],
                })
            else:
                data_cache.update({
                    "ldr": 0, "estadoLDR": "APAGADO",
                    "estado": "DESCONOCIDO", "hora": hora_str,
                    "panel": {"voltaje_V": 0, "corriente_mA": 0, "potencia_mW": 0},
                    "bateria": {"voltaje_V": 0, "corriente_mA": 0, "potencia_mW": 0},
                })
        else:
            print(f"[ERROR] Firebase Latest HTTP {resp_latest.status_code}")

    except Exception as exc:
        _state["firebase_ok"] = False
        _state["circuit_ok"]  = False
        print(f"[ERROR] Firebase optimization: {exc}")

    # Timestamps y flags para el frontend
    circuit_dt = _state.get("circuit_last_seen")
    data_cache.update({
        "server_timestamp":   now.isoformat(),
        "circuit_timestamp":  circuit_dt.isoformat() if circuit_dt else None,
        "firebase_connected": _state["firebase_ok"],
        "circuit_connected":  _state["circuit_ok"],
        "connected":          _state["firebase_ok"] and _state["circuit_ok"],
        "polling_active":     _state["polling_active"],
    })


def background_data_fetcher():
    while True:
        if _state["polling_active"]:
            fetch_data_from_firebase()
        else:
            # Polling pausado: actualizar solo el flag en el cache sin tocar Firebase
            data_cache["polling_active"] = False
        time.sleep(5)


fetcher_thread = threading.Thread(target=background_data_fetcher, daemon=True)
fetcher_thread.start()


# =============================================================================
# HELPERS — CARGA DE DATOS HISTÓRICOS
# =============================================================================

def load_all_history(limit_days=3) -> list:
    """Carga el historial reciente de Firebase (últimos N días por defecto) para optimizar consumo."""
    try:
        # 1. Obtener lista de fechas
        resp_shallow = requests.get(f"{FIREBASE_URL}/lecturas.json?shallow=true", timeout=8)
        if resp_shallow.status_code != 200:
            return []
        
        dates = sorted(resp_shallow.json().keys())
        # Tomar solo los últimos N días
        recent_dates = dates[-limit_days:]
        
        history = []
        for day_key in recent_dates:
            resp_day = requests.get(f"{FIREBASE_URL}/lecturas/{day_key}.json", timeout=8)
            if resp_day.status_code != 200:
                continue
            
            day_data = resp_day.json()
            if not day_data or not isinstance(day_data, dict):
                continue
                
            for push_id in sorted(day_data.keys()):
                record = day_data[push_id]
                if not isinstance(record, dict) or "hora" not in record:
                    continue
                r = parse_reading(record)
                hora = r["hora"] or "00:00:00"
                try:
                    ts = datetime.strptime(f"{day_key} {hora}", "%Y-%m-%d %H:%M:%S")
                except ValueError:
                    continue
                history.append({
                    "timestamp":   ts,
                    "ts_iso":      ts.isoformat(),
                    "fecha":       day_key,
                    "hora":        hora,
                    "hour_of_day": ts.hour + ts.minute / 60.0,
                    "ldr":         r["ldr"],
                    "estadoLDR":   r["estadoLDR"],
                    "estado":      r["estado"],
                })
        return history
    except Exception as exc:
        print(f"[IA] Error cargando historial optimizado: {exc}")
        return []

    except Exception as exc:
        print(f"[IA] Error cargando historial: {exc}")
        return []


# =============================================================================
# MÓDULO DE IA — MOTOR DE ANALÍTICA
# =============================================================================

def run_anomaly_detection(data: list) -> dict:
    """
    Detecta anomalías usando Z-Score sobre el LDR.
    """
    if len(data) < 10:
        return {"anomalies": [], "total": 0, "pct": 0.0}

    ldrs = np.array([d["ldr"] for d in data])
    anomalies = []
    for i, d in enumerate(data):
        score = abs(stats.zscore(ldrs)[i])
        if score > 2.5:
            severity = "critical" if score > 3.5 else "warning"
            anomalies.append({
                "timestamp":  d["ts_iso"],
                "hora":       d["hora"],
                "fecha":      d["fecha"],
                "ldr":        d["ldr"],
                "estadoLDR":  d["estadoLDR"],
                "estado":     d["estado"],
                "z_score":    round(score, 2),
                "severity":   severity,
                "description": f"LDR inusual: {d['ldr']} (z={score:.2f})",
            })

    pct = round(len(anomalies) / len(data) * 100, 1) if data else 0.0
    return {"anomalies": anomalies[-20:], "total": len(anomalies), "pct": pct}


def run_clustering(data: list) -> dict:
    """
    K-Means sobre el LDR para clasificar períodos del día.
    """
    if len(data) < 15:
        return {"points": [], "centroids": [], "labels": {}}

    X = np.array([[d["ldr"], 0] for d in data])

    # Normalizar
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    k = min(3, len(data))
    km = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels = km.fit_predict(X_scaled)

    # Centroides en escala original
    centroids_orig = scaler.inverse_transform(km.cluster_centers_)

    # Ordenar clusters por potencia media (0=noche, 1=medio, 2=pico)
    cluster_power_means = {}
    for c in range(k):
        idxs = np.where(labels == c)[0]
        cluster_power_means[c] = float(np.mean(X[idxs, 1]))

    sorted_clusters = sorted(cluster_power_means.keys(), key=lambda c: cluster_power_means[c])
    cluster_name_map = {}
    cluster_colors   = {}
    cluster_descs    = {}
    names  = ["🌙 Noche / Sin Sol", "☁️ Rendimiento Medio", "☀️ Rendimiento Óptimo"]
    colors = ["#4B5563", "#F59E0B", "#10B981"]
    for rank, orig_c in enumerate(sorted_clusters):
        cluster_name_map[orig_c] = names[rank]
        cluster_colors[orig_c]   = colors[rank]
        cluster_descs[orig_c]    = names[rank]

    points = []
    for i, d in enumerate(data):
        c = int(labels[i])
        points.append({
            "timestamp":     d["ts_iso"],
            "hora":          d["hora"],
            "ldr":           d["ldr"],
            "estadoLDR":     d["estadoLDR"],
            "estado":        d["estado"],
            "cluster":       c,
            "cluster_name":  cluster_name_map[c],
            "cluster_color": cluster_colors[c],
        })

    centroids_out = []
    for c in range(k):
        centroids_out.append({
            "cluster": c,
            "name":    cluster_name_map[c],
            "color":   cluster_colors[c],
            "ldr_center":   round(float(centroids_orig[c][0]), 1),
            "power_center": round(float(centroids_orig[c][1]), 2),
            "count":   int(np.sum(labels == c)),
        })

    return {
        "points":    points[-200:],  # máx 200 puntos para el frontend
        "centroids": centroids_out,
        "labels":    {str(c): cluster_name_map[c] for c in range(k)},
    }


def run_correlation_analysis(data: list) -> dict:
    """Análisis simplificado: solo LDR disponible del Arduino."""
    if len(data) < 5:
        return {"matrix": {}, "insights": []}
    ldrs = np.array([d["ldr"] for d in data])
    return {
        "matrix": {"ldr": {"ldr": {"r": 1.0, "p": 0.0}}},
        "insights": [{"var1": "LDR", "var2": "LDR",
                      "r": 1.0,
                      "description": f"LDR promedio: {round(float(ldrs.mean()),1)} — rango [{int(ldrs.min())}, {int(ldrs.max())}]"}],
    }


def run_power_prediction(data: list) -> dict:
    """Sin datos de potencia del Arduino — retorna estructura vacía compatible."""
    current_ldr = data_cache.get("ldr", 0)
    return {
        "curve": [], "model_score": 0.0, "model_score_pct": 0.0,
        "current_ldr": current_ldr, "current_prediction": None,
        "current_real": 0, "std_error": 0, "ldr_range": [0, 1024],
    }


def run_trend_analysis(data: list) -> dict:
    """Tendencia basada en LDR (único sensor analógico disponible)."""
    if len(data) < 10:
        return {"trend": "insufficient_data", "slope": 0, "trend_line": []}

    active = [d for d in data if d["estadoLDR"] == "ENCENDIDO"]
    if len(active) < 5:
        return {"trend": "no_active_data", "slope": 0, "trend_line": []}

    X = np.arange(len(active)).reshape(-1, 1)
    y = np.array([d["ldr"] for d in active])
    model = LinearRegression()
    model.fit(X, y)
    slope = float(model.coef_[0])
    r2 = float(model.score(X, y))

    if slope > 5:
        trend, trend_label = "increasing", "📈 LDR en aumento"
    elif slope < -5:
        trend, trend_label = "decreasing", "📉 LDR en descenso"
    else:
        trend, trend_label = "stable", "➡️ LDR estable"

    trend_line = [
        {"timestamp": active[i]["ts_iso"], "hora": active[i]["hora"],
         "ldr": active[i]["ldr"], "trend": round(float(model.predict([[i]])[0]), 1)}
        for i in range(len(active))
    ]
    return {"trend": trend, "trend_label": trend_label,
            "slope": round(slope, 3), "r2": round(r2, 3), "trend_line": trend_line[-100:]}


def compute_health_score(data: list, anomalies_info: dict, clustering: dict) -> dict:
    """Score de salud 0-100 basado en LDR y estadoLDR del Arduino."""
    if len(data) < 5:
        return {"score": 0, "grade": "N/A", "components": {}}

    ldrs = [d["ldr"] for d in data]

    # 1. Estabilidad del LDR
    cv_ldr = (np.std(ldrs) / (np.mean(ldrs) + 1e-6)) * 100
    stability_score = max(0, min(100, 100 - cv_ldr * 2))

    # 2. Eficiencia: no aplica sin datos de potencia
    efficiency_score = 50.0

    # 3. Penalización por anomalías
    anomaly_pct = anomalies_info.get("pct", 0)
    anomaly_score = max(0, 100 - anomaly_pct * 10)

    # 4. Actividad del sistema (% de tiempo con LED encendido)
    encendidos = sum(1 for d in data if d["estadoLDR"] == "ENCENDIDO")
    activity_score = (encendidos / len(data)) * 100

    # Score compuesto (ponderado)
    final_score = (
        stability_score  * 0.30 +
        efficiency_score * 0.35 +
        anomaly_score    * 0.20 +
        activity_score   * 0.15
    )
    final_score = round(min(100, max(0, final_score)), 1)

    if final_score >= 80:
        grade, color = "A — Excelente", "#10B981"
    elif final_score >= 65:
        grade, color = "B — Bueno", "#F59E0B"
    elif final_score >= 50:
        grade, color = "C — Regular", "#F97316"
    else:
        grade, color = "D — Deficiente", "#EF4444"

    return {
        "score": final_score,
        "grade": grade,
        "color": color,
        "components": {
            "stability":  round(stability_score,  1),
            "efficiency": round(efficiency_score, 1),
            "anomalies":  round(anomaly_score,    1),
            "activity":   round(activity_score,   1),
        },
        "data_points": len(data),
    }


def run_hourly_profile(data: list) -> dict:
    """Perfil promedio hora a hora del LDR."""
    if len(data) < 5:
        return {"profile": []}

    hourly = {}
    for d in data:
        h = d["timestamp"].hour
        hourly.setdefault(h, []).append(d["ldr"])

    profile = []
    for h in sorted(hourly.keys()):
        vals = hourly[h]
        enc = sum(1 for d in data if d["timestamp"].hour == h and d["estadoLDR"] == "ENCENDIDO")
        profile.append({
            "hour":        h,
            "hour_label":  f"{h:02d}:00",
            "avg_ldr":     round(np.mean(vals), 1),
            "max_ldr":     int(np.max(vals)),
            "min_ldr":     int(np.min(vals)),
            "encendidos":  enc,
            "count":       len(vals),
        })

    peak = max(profile, key=lambda x: x["avg_ldr"]) if profile else None

    return {
        "profile":    profile,
        "peak_hour":  peak,
        "total_hours": len(profile),
    }


# =============================================================================
# RUTAS DE LA API
# =============================================================================

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/data")
def get_data():
    return jsonify(data_cache)


@app.route("/api/polling", methods=["POST"])
def set_polling():
    """
    Activa o pausa el polling del backend hacia Firebase.
    Body JSON: { "active": true | false }
    o sin body: alterna el estado actual (toggle).
    """
    from flask import request as flask_request
    body = flask_request.get_json(silent=True) or {}
    if "active" in body:
        new_state = bool(body["active"])
    else:
        # Toggle
        new_state = not _state["polling_active"]

    _state["polling_active"]   = new_state
    data_cache["polling_active"] = new_state

    status = "activo" if new_state else "pausado"
    print(f"[POLLING] Estado cambiado → {status.upper()}")
    return jsonify({
        "polling_active": new_state,
        "message": f"Polling {status}",
    })


@app.route("/api/status")
def get_status():
    circuit_dt = _state.get("circuit_last_seen")
    checked_at = _state.get("firebase_checked_at")
    return jsonify({
        "firebase_connected": _state["firebase_ok"],
        "circuit_connected":  _state["circuit_ok"],
        "firebase_url":       FIREBASE_URL,
        "server_last_check":  checked_at.isoformat() if checked_at else None,
        "circuit_last_data":  circuit_dt.isoformat() if circuit_dt else None,
        "circuit_last_hora":  _state.get("circuit_last_hora"),
        "circuit_last_fecha": _state.get("circuit_last_fecha"),
        "circuit_timeout_sec": CIRCUIT_TIMEOUT_SEC,
        "polling_active":     _state["polling_active"],
        "location":   "Parque Caldas, Popayán, Cauca, Colombia",
        "hardware":   "ESP8266 WiFi Module",
    })


@app.route("/api/history")
def get_history():
    """Historial limitado (últimos 200 registros) para reducir transferencia."""
    try:
        # Para simplificar, obtenemos la última fecha y sus registros
        resp_shallow = requests.get(f"{FIREBASE_URL}/lecturas.json?shallow=true", timeout=8)
        if resp_shallow.status_code != 200:
            return jsonify([])
            
        dates = sorted(resp_shallow.json().keys())
        if not dates:
            return jsonify([])
            
        latest_date = dates[-1]
        resp_latest = requests.get(f"{FIREBASE_URL}/lecturas/{latest_date}.json?limitToLast=200", timeout=10)
        
        history = []
        if resp_latest.status_code == 200:
            day_data = resp_latest.json()
            if day_data and isinstance(day_data, dict):
                for push_id in sorted(day_data.keys()):
                    record = day_data[push_id]
                    if not isinstance(record, dict) or "hora" not in record:
                        continue
                    r = parse_reading(record)
                    hora = r["hora"] or "00:00:00"
                    try:
                        ts = datetime.strptime(f"{latest_date} {hora}", "%Y-%m-%d %H:%M:%S").isoformat()
                    except ValueError:
                        ts = f"{latest_date}T{hora}"
                    history.append({
                        "timestamp":  ts,
                        "ldr":        r["ldr"],
                        "estadoLDR":  r["estadoLDR"],
                        "estado":     r["estado"],
                        "hora":       hora,
                        "fecha":      latest_date,
                    })
        return jsonify(history)
    except Exception as exc:
        print(f"[History] Error: {exc}")
        return jsonify([])

    except Exception as exc:
        print(f"[History] Error: {exc}")
        return jsonify([])


@app.route("/api/daily-summary")
def get_daily_summary():
    """Resumen estadístico de los últimos 7 días."""
    try:
        resp_shallow = requests.get(f"{FIREBASE_URL}/lecturas.json?shallow=true", timeout=8)
        if resp_shallow.status_code != 200:
            return jsonify({})
            
        all_dates = sorted(resp_shallow.json().keys())
        recent_dates = all_dates[-7:] # Última semana
        
        result = {}
        for day_key in recent_dates:
            resp_day = requests.get(f"{FIREBASE_URL}/lecturas/{day_key}.json", timeout=10)
            if resp_day.status_code != 200:
                continue
                
            day_data = resp_day.json()
            if not day_data or not isinstance(day_data, dict):
                continue

            ldrs, encendidos = [], 0
            readings_list = []

            for push_id in sorted(day_data.keys()):
                record = day_data[push_id]
                if not isinstance(record, dict) or "hora" not in record:
                    continue
                r = parse_reading(record)
                hora = r["hora"] or "00:00:00"
                try:
                    ts = datetime.strptime(f"{day_key} {hora}", "%Y-%m-%d %H:%M:%S").isoformat()
                except ValueError:
                    ts = f"{day_key}T{hora}"

                ldrs.append(r["ldr"])
                if r["estadoLDR"] == "ENCENDIDO":
                    encendidos += 1
                readings_list.append({
                    "timestamp":  ts,
                    "hora":       hora,
                    "ldr":        r["ldr"],
                    "estadoLDR":  r["estadoLDR"],
                    "estado":     r["estado"],
                })

            if not ldrs:
                continue

            def safe_max(lst): return round(max(lst), 1) if lst else 0
            def safe_avg(lst): return round(sum(lst)/len(lst), 1) if lst else 0

            result[day_key] = {
                "fecha":      day_key,
                "count":      len(ldrs),
                "ldr":        {"max": safe_max(ldrs), "avg": safe_avg(ldrs)},
                "encendidos": encendidos,
                "readings":   readings_list,
            }
        return jsonify(result)
    except Exception as exc:
        print(f"[DailySummary] Error: {exc}")
        return jsonify({})

    except Exception as exc:
        print(f"[DailySummary] Error: {exc}")
        return jsonify({})


@app.route("/api/led-analysis")
def get_led_analysis():
    """Análisis del LED de los últimos 7 días."""
    try:
        resp_shallow = requests.get(f"{FIREBASE_URL}/lecturas.json?shallow=true", timeout=8)
        if resp_shallow.status_code != 200:
            return jsonify({})
            
        all_dates = sorted(resp_shallow.json().keys())
        recent_dates = all_dates[-7:]
        
        result = {}
        for day_key in recent_dates:
            resp_day = requests.get(f"{FIREBASE_URL}/lecturas/{day_key}.json", timeout=10)
            if resp_day.status_code != 200:
                continue
                
            day_data = resp_day.json()
            if not day_data or not isinstance(day_data, dict):
                continue

            readings = []
            for push_id in sorted(day_data.keys()):
                record = day_data[push_id]
                if not isinstance(record, dict) or "hora" not in record:
                    continue
                hora_str   = record.get("hora", "00:00:00")
                led_val    = str(record.get("estadoLDR", "APAGADO")).upper()
                led_norm   = "ENCENDIDO" if "ENCENDIDO" in led_val else "APAGADO"
                try:
                    t = datetime.strptime(f"{day_key} {hora_str}", "%Y-%m-%d %H:%M:%S")
                except ValueError:
                    continue
                readings.append({"t": t, "led": led_norm})

            if not readings:
                continue

            segments = []
            seg_start = readings[0]["t"]
            seg_estado = readings[0]["led"]
            seg_end    = readings[0]["t"]

            for r in readings[1:]:
                if r["led"] == seg_estado:
                    seg_end = r["t"]
                else:
                    dur = round((seg_end - seg_start).total_seconds() / 60, 1)
                    segments.append({
                        "estado": seg_estado,
                        "hora_inicio": seg_start.strftime("%H:%M:%S"),
                        "hora_fin": seg_end.strftime("%H:%M:%S"),
                        "duracion_min": dur,
                    })
                    seg_start  = r["t"]
                    seg_estado = r["led"]
                    seg_end    = r["t"]

            dur = round((seg_end - seg_start).total_seconds() / 60, 1)
            segments.append({
                "estado": seg_estado,
                "hora_inicio": seg_start.strftime("%H:%M:%S"),
                "hora_fin": seg_end.strftime("%H:%M:%S"),
                "duracion_min": dur,
            })

            encendidos_count = sum(1 for s in segments if s["estado"] == "ENCENDIDO")
            result[day_key] = {
                "segmentos":             segments,
                "encendidos_count":      encendidos_count,
                "total_encendido_min":   round(sum(s["duracion_min"] for s in segments if s["estado"] == "ENCENDIDO"), 1),
                "total_apagado_min":     round(sum(s["duracion_min"] for s in segments if s["estado"] == "APAGADO"),   1),
            }

        return jsonify(result)
    except Exception as exc:
        print(f"[LedAnalysis] Error: {exc}")
        return jsonify({})

    except Exception as exc:
        print(f"[LedAnalysis] Error: {exc}")
        return jsonify({})


# =============================================================================
# ENDPOINTS DE IA
# =============================================================================

@app.route("/api/ai-analysis")
def get_ai_analysis():
    """
    Análisis completo de IA sobre los datos históricos de Firebase.
    Este es el endpoint principal del módulo SolarAI.
    """
    try:
        data = load_all_history()

        if len(data) < 5:
            return jsonify({
                "status": "insufficient_data",
                "message": "Se necesitan al menos 5 lecturas para el análisis de IA.",
                "data_points": len(data),
            })

        # Ejecutar todos los modelos
        anomalies   = run_anomaly_detection(data)
        clustering  = run_clustering(data)
        correlation = run_correlation_analysis(data)
        prediction  = run_power_prediction(data)
        trend       = run_trend_analysis(data)
        health      = compute_health_score(data, anomalies, clustering)
        hourly      = run_hourly_profile(data)

        return jsonify({
            "status":      "ok",
            "data_points": len(data),
            "generated_at": datetime.now().isoformat(),
            "health_score":      health,
            "anomaly_detection": anomalies,
            "clustering":        clustering,
            "correlation":       correlation,
            "power_prediction":  prediction,
            "trend_analysis":    trend,
            "hourly_profile":    hourly,
        })

    except Exception as exc:
        print(f"[AI] Error en análisis: {exc}")
        import traceback
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(exc)}), 500


@app.route("/api/ai-predict")
def get_ai_predict():
    """Predicción rápida de potencia para el LDR actual."""
    try:
        data = load_all_history()
        if len(data) < 10:
            return jsonify({"prediction": None, "message": "Datos insuficientes"})
        prediction = run_power_prediction(data)
        return jsonify(prediction)
    except Exception as exc:
        return jsonify({"prediction": None, "error": str(exc)}), 500


# =============================================================================
# INICIO DE LA APLICACIÓN
# =============================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("SolarMonitor PV - Servidor Flask")
    print("=" * 60)
    print(f"Firebase: {FIREBASE_URL}/lecturas.json")
    print(f"Timeout circuito: {CIRCUIT_TIMEOUT_SEC}s")
    print("Endpoints:")
    print("  GET  /api/data          -> Último dato + estado de conexión")
    print("  GET  /api/status        -> Estado detallado de conexiones")
    print("  POST /api/polling       -> Activar/pausar polling a Firebase")
    print("  GET  /api/history       -> Historial completo")
    print("  GET  /api/daily-summary -> Resumen estadístico por día")
    print("  GET  /api/led-analysis  -> Análisis LED por día")
    print("  GET  /api/ai-analysis   -> [IA] Análisis completo de inteligencia artificial")
    print("  GET  /api/ai-predict    -> [IA] Predicción de potencia en tiempo real")
    print("=" * 60)
    app.run(host="0.0.0.0", port=5000, debug=True)
