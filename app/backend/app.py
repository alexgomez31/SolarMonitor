# =============================================================================
# SolarMonitor PV - Backend Flask
# Plataforma de monitoreo fotovoltaico en tiempo real
# Ubicación: Parque Caldas, Popayán (Cauca, Colombia)
# =============================================================================

import os
from flask import Flask, render_template, jsonify, request, send_file
from flask_cors import CORS
import requests
import threading
import time
from datetime import datetime, date, timedelta

# IA / Machine Learning
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures, StandardScaler
from sklearn.cluster import KMeans
from sklearn.pipeline import Pipeline
from scipy import stats
import warnings
warnings.filterwarnings('ignore')

import ml_engine

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

FIREBASE_URL = "https://caldas-d4fa9-default-rtdb.firebaseio.com"

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
    "ldr":        0,              # valor analógico del fotosensor (0-1024)
    "estadoFotocelda": "LUZ",     # estado fotocelda: LUZ | OSCURIDAD
    "estadoLuces": "APAGADAS",    # estado LED físico: ENCENDIDAS | APAGADAS
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

# Cache para el clima (Popayán, Cauca)
weather_cache = {
    "temperature_2m": 0,
    "relative_humidity_2m": 0,
    "apparent_temperature": 0,
    "precipitation": 0,
    "weather_code": 0,
    "cloud_cover": 0,
    "wind_speed_10m": 0,
    "is_day": 1,
    "last_updated": None
}

def fetch_weather_data():
    """Obtiene el clima actual de Popayán (Centro / Empedrado) vía Open-Meteo"""
    global weather_cache
    try:
        url = "https://api.open-meteo.com/v1/forecast?latitude=2.4382&longitude=-76.6132&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m&timezone=America%2FBogota"
        resp = requests.get(url, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            current = data.get("current", {})
            weather_cache.update({
                "temperature_2m": current.get("temperature_2m", 0),
                "relative_humidity_2m": current.get("relative_humidity_2m", 0),
                "apparent_temperature": current.get("apparent_temperature", 0),
                "precipitation": current.get("precipitation", 0),
                "weather_code": current.get("weather_code", 0),
                "cloud_cover": current.get("cloud_cover", 0),
                "wind_speed_10m": current.get("wind_speed_10m", 0),
                "is_day": current.get("is_day", 1),
                "last_updated": datetime.now().isoformat()
            })
            print(f"[WEATHER] Clima actualizado: {weather_cache['temperature_2m']}°C")
    except Exception as exc:
        print(f"[WEATHER] Error actualizando clima: {exc}")

# =============================================================================
# PARSEO DE FIREBASE
# =============================================================================

def parse_reading(record: dict) -> dict:
    """Parsea un registro tal como lo envía el Arduino:
       { hora, ldr, estadoFotocelda, estadoLuces, panel, bateria, estado }
    """
    panel = record.get("panel", {})
    bateria = record.get("bateria", {})
    return {
        "ldr":              int(record.get("ldr",              0)),
        "estadoFotocelda":  str(record.get("estadoFotocelda",  "LUZ")),
        "estadoLuces":      str(record.get("estadoLuces",      "APAGADAS")),
        "estado":           str(record.get("estado",           "DESCONOCIDO")),
        "hora":             record.get("hora", None),
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
                    "ldr":              latest["ldr"],
                    "estadoFotocelda":  latest["estadoFotocelda"],
                    "estadoLuces":      latest["estadoLuces"],
                    "estado":           latest["estado"],
                    "hora":             hora_str,
                    "panel":            latest["panel"],
                    "bateria":          latest["bateria"],
                })
            else:
                data_cache.update({
                    "ldr": 0, "estadoFotocelda": "LUZ",
                    "estadoLuces": "APAGADAS",
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
    last_weather_fetch = 0
    while True:
        if _state["polling_active"]:
            fetch_data_from_firebase()
        else:
            # Polling pausado: actualizar solo el flag en el cache sin tocar Firebase
            data_cache["polling_active"] = False
            
        # Actualizar clima cada 15 minutos (900 segundos)
        now_ts = time.time()
        if now_ts - last_weather_fetch > 900:
            fetch_weather_data()
            last_weather_fetch = now_ts
            
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
                r["fecha"] = day_key
                # Añadir métricas planas para retrocompatibilidad en otros endpoints si es necesario
                r["voltage"] = r["panel"]["voltaje_V"]
                r["power_mW"] = r["panel"]["potencia_mW"]
                r["bat_voltage"] = r["bateria"]["voltaje_V"]
                history.append(r)
        return history
    except Exception as exc:
        print(f"[IA] Error cargando historial optimizado: {exc}")
        return []


# =============================================================================
# MÓDULO DE IA — MOTOR DE ANALÍTICA
# =============================================================================

def run_anomaly_detection(data: list) -> dict:
    """
    Detecta anomalías multivariantes (LDR y Potencia).
    """
    if len(data) < 10:
        return {"anomalies": [], "total": 0, "pct": 0.0}

    features = np.array([[d["ldr"], d["power_mW"]] for d in data])
    z_scores = np.abs(stats.zscore(features))
    max_z = np.max(z_scores, axis=1) # Tomamos el max Z-score de ambas variables
    
    anomalies = []
    for i, d in enumerate(data):
        score = max_z[i]
        if score > 2.5:
            severity = "critical" if score > 3.5 else "warning"
            
            # Qué variable causó la anomalía?
            if z_scores[i][0] > z_scores[i][1]:
                desc = f"LDR inusual: {d['ldr']} (z={z_scores[i][0]:.2f})"
            else:
                desc = f"Potencia inusual: {d['power_mW']}mW (z={z_scores[i][1]:.2f})"

            anomalies.append({
                "timestamp":  d["ts_iso"],
                "hora":       d["hora"],
                "fecha":      d["fecha"],
                "ldr":        d["ldr"],
                "voltage":    d.get("voltage", 0),
                "current_mA": d.get("current_mA", 0),
                "power_mW":   d.get("power_mW", 0),
                "estadoFotocelda": d["estadoFotocelda"],
                "estadoLuces":  d["estadoLuces"],
                "estado":     d["estado"],
                "z_score":    round(float(score), 2),
                "severity":   severity,
                "description": desc,
            })

    pct = round(len(anomalies) / len(data) * 100, 1) if data else 0.0
    return {"anomalies": anomalies[-20:], "total": len(anomalies), "pct": pct}


def run_clustering(data: list) -> dict:
    """
    K-Means sobre el LDR para clasificar períodos del día.
    """
    if len(data) < 15:
        return {"points": [], "centroids": [], "labels": {}}

    X = np.array([[d["ldr"], d["power_mW"]] for d in data])

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
            "power_mW":      d.get("power_mW", 0),
            "estadoFotocelda": d["estadoFotocelda"],
            "estadoLuces":     d["estadoLuces"],
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
    """Análisis completo de correlación de Pearson."""
    if len(data) < 5:
        return {"matrix": {}, "insights": []}

    vars = ["voltage", "current_mA", "power_mW", "ldr"]
    matrix = {}
    insights = []
    
    for v1 in vars:
        matrix[v1] = {}
        arr1 = np.array([d.get(v1, 0) for d in data])
        for v2 in vars:
            arr2 = np.array([d.get(v2, 0) for d in data])
            if np.std(arr1) == 0 or np.std(arr2) == 0:
                matrix[v1][v2] = {"r": 0.0, "p": 1.0}
            else:
                r, p = stats.pearsonr(arr1, arr2)
                matrix[v1][v2] = {"r": float(r), "p": float(p)}
                
                if v1 != v2 and v1 < v2 and abs(r) > 0.5:
                    insights.append({
                        "var1": v1, "var2": v2, "r": float(r),
                        "description": f"Fuerte correlación ({'positiva' if r > 0 else 'negativa'}) entre {v1} y {v2} (r={r:.2f})."
                    })

    insights.sort(key=lambda x: abs(x["r"]), reverse=True)

    return {
        "matrix": matrix,
        "insights": insights[:5],
    }


def run_power_prediction(data: list) -> dict:
    """Predicción de Potencia mediante Regresión Polinomial en base al LDR."""
    if len(data) < 10:
        return {
            "curve": [], "model_score": 0.0, "model_score_pct": 0.0,
            "current_ldr": 0, "current_prediction": 0,
            "current_real": 0, "std_error": 0, "ldr_range": [0, 1024],
        }

    X = np.array([[d["ldr"]] for d in data])
    y = np.array([d.get("power_mW", 0) for d in data])
    
    pipeline = Pipeline([
        ('poly', PolynomialFeatures(degree=2)),
        ('linear', LinearRegression())
    ])
    
    pipeline.fit(X, y)
    score = pipeline.score(X, y)
    y_pred = pipeline.predict(X)
    
    std_error = np.std(y - y_pred)
    
    min_ldr = max(0, int(np.min(X)))
    max_ldr = min(1024, int(np.max(X)))
    ldr_range = np.linspace(min_ldr, max_ldr, 20)
    curve_pred = pipeline.predict(ldr_range.reshape(-1, 1))
    
    curve = []
    for i, ldr_val in enumerate(ldr_range):
        pred = float(curve_pred[i])
        curve.append({
            "ldr": int(ldr_val),
            "predicted": round(pred, 2),
            "upper": round(pred + std_error, 2),
            "lower": max(0, round(pred - std_error, 2))
        })
        
    current_ldr = data_cache.get("ldr", 0)
    current_real = data_cache.get("panel", {}).get("potencia_mW", 0)
    current_pred = float(pipeline.predict([[current_ldr]])[0])

    return {
        "curve": curve,
        "model_score": round(float(score), 3),
        "model_score_pct": max(0, round(float(score) * 100, 1)),
        "current_ldr": current_ldr,
        "current_prediction": max(0, round(current_pred, 2)),
        "current_real": round(float(current_real), 2),
        "std_error": round(float(std_error), 2),
        "ldr_range": [min_ldr, max_ldr],
    }


def run_trend_analysis(data: list) -> dict:
    """Tendencia temporal de potencia del panel solar."""
    if len(data) < 10:
        return {"trend": "insufficient_data", "slope": 0, "trend_line": [], "trend_label": "📊 Datos insuficientes", "r2": 0}

    # Usar datos con potencia > 0 (cuando hay generación solar)
    active = [d for d in data if d.get("power_mW", 0) > 0]
    if len(active) < 5:
        # Fallback: usar todos los datos
        active = data[-50:]

    X = np.arange(len(active)).reshape(-1, 1)
    y = np.array([d.get("power_mW", 0) for d in active])
    model = LinearRegression()
    model.fit(X, y)
    slope = float(model.coef_[0])
    r2 = float(model.score(X, y))

    if slope > 5:
        trend, trend_label = "increasing", "📈 Potencia en aumento"
    elif slope < -5:
        trend, trend_label = "decreasing", "📉 Potencia en descenso"
    else:
        trend, trend_label = "stable", "➡️ Potencia estable"

    trend_line = [
        {"timestamp": active[i]["ts_iso"], "hora": active[i]["hora"],
         "power_mW": active[i].get("power_mW", 0), "trend": round(float(model.predict([[i]])[0]), 1)}
        for i in range(len(active))
    ]
    return {"trend": trend, "trend_label": trend_label,
            "slope": round(slope, 3), "r2": round(r2, 3), "trend_line": trend_line[-100:]}


def compute_health_score(data: list, anomalies_info: dict, clustering: dict) -> dict:
    """Score de salud 0-100 del sistema fotovoltaico completo."""
    if len(data) < 5:
        return {
            "score": 0, "grade": "N/A", "color": "#6B7280",
            "autonomy_hrs": 0, "avg_efficiency": 0,
            "components": {"stability": 0, "efficiency": 0, "anomalies": 0, "activity": 0},
            "data_points": len(data),
        }

    ldrs = [d["ldr"] for d in data]
    powers = [d.get("power_mW", 0) for d in data]
    bat_powers = [d.get("bat_power_mW", 0) for d in data]

    # 1. Estabilidad del voltaje del panel
    voltages = [d.get("voltage", 0) for d in data if d.get("voltage", 0) > 0]
    if voltages:
        cv_volt = (np.std(voltages) / (np.mean(voltages) + 1e-6)) * 100
        stability_score = max(0, min(100, 100 - cv_volt * 5))
    else:
        cv_ldr = (np.std(ldrs) / (np.mean(ldrs) + 1e-6)) * 100
        stability_score = max(0, min(100, 100 - cv_ldr * 2))

    # 2. Eficiencia de generación (potencia real vs potencia esperada por nivel de luz)
    max_power = max(1, max(powers))
    efficiencies = []
    for d in data:
        sun_intensity = (1024 - d["ldr"]) / 1024.0
        expected_power = sun_intensity * max_power
        if expected_power > 10:  # solo cuando hay luz suficiente
            eff = min(1.0, d.get("power_mW", 0) / expected_power)
            efficiencies.append(eff * 100)
    efficiency_score = np.mean(efficiencies) if efficiencies else 50.0
    efficiency_score = max(0, min(100, efficiency_score))

    # 3. Penalización por anomalías
    anomaly_pct = anomalies_info.get("pct", 0)
    anomaly_score = max(0, 100 - anomaly_pct * 10)

    # 4. Actividad del sistema (% de tiempo generando energía)
    generating = sum(1 for p in powers if p > 0)
    activity_score = (generating / len(data)) * 100 if data else 0

    # Score compuesto
    final_score = (
        stability_score  * 0.25 +
        efficiency_score * 0.35 +
        anomaly_score    * 0.20 +
        activity_score   * 0.20
    )
    final_score = round(min(100, max(0, final_score)), 1)

    # Autonomía estimada: si la batería tiene datos de potencia, calcular horas
    avg_bat_power = np.mean([abs(p) for p in bat_powers if p != 0]) if any(p != 0 for p in bat_powers) else 0
    # Batería LiPo típica 3.7V * 2000mAh = 7400mWh
    bat_capacity_mWh = 7400
    autonomy_hrs = round(bat_capacity_mWh / max(avg_bat_power, 1), 1) if avg_bat_power > 0 else 0
    autonomy_hrs = min(autonomy_hrs, 99)  # Cap para no mostrar valores absurdos

    avg_efficiency = round(float(efficiency_score), 1)

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
        "autonomy_hrs": autonomy_hrs,
        "avg_efficiency": avg_efficiency,
        "components": {
            "stability":  round(stability_score,  1),
            "efficiency": round(efficiency_score, 1),
            "anomalies":  round(anomaly_score,    1),
            "activity":   round(activity_score,   1),
        },
        "data_points": len(data),
    }


def run_hourly_profile(data: list) -> dict:
    """Perfil promedio hora a hora de la potencia del panel."""
    if len(data) < 5:
        return {"profile": [], "peak_hour": None, "total_hours": 0}

    hourly = {}
    for d in data:
        h = d["timestamp"].hour
        hourly.setdefault(h, []).append(d.get("power_mW", 0))

    profile = []
    for h in sorted(hourly.keys()):
        vals = hourly[h]
        profile.append({
            "hour":        h,
            "hour_label":  f"{h:02d}:00",
            "avg_power":   round(np.mean(vals), 1),
            "max_power":   int(np.max(vals)),
            "min_power":   int(np.min(vals)),
            "count":       len(vals),
        })

    peak = max(profile, key=lambda x: x["avg_power"]) if profile else None

    return {
        "profile":    profile,
        "peak_hour":  peak,
        "total_hours": len(profile),
    }


def run_energy_balance(data: list) -> dict:
    """Análisis del balance energético: Panel vs Batería."""
    if len(data) < 5:
        return {
            "balance_points": [], "summary": {},
            "charging_pct": 0, "discharging_pct": 0, "equilibrium_pct": 0,
        }

    balance_points = []
    estados = {"CARGANDO": 0, "DESCARGANDO": 0, "EQUILIBRIO": 0, "DESCONOCIDO": 0}

    for d in data:
        panel_p = d.get("power_mW", 0)
        bat_p = d.get("bat_power_mW", 0)
        net = panel_p - abs(bat_p)
        estado = d.get("estado", "DESCONOCIDO")
        estados[estado] = estados.get(estado, 0) + 1

        balance_points.append({
            "hora":       d["hora"],
            "timestamp":  d["ts_iso"],
            "panel_mW":   round(panel_p, 1),
            "bateria_mW": round(bat_p, 1),
            "balance":    round(net, 1),
            "estado":     estado,
        })

    total = len(data)
    panel_powers = [d.get("power_mW", 0) for d in data]
    bat_powers = [d.get("bat_power_mW", 0) for d in data]

    return {
        "balance_points": balance_points[-150:],
        "summary": {
            "avg_panel_mW": round(np.mean(panel_powers), 1),
            "max_panel_mW": round(max(panel_powers), 1),
            "avg_bat_mW":   round(np.mean(bat_powers), 1),
            "total_energy_panel_mWh": round(sum(panel_powers) * 5 / 3600, 2),  # 5s intervalo
            "total_energy_bat_mWh":   round(sum(bat_powers) * 5 / 3600, 2),
        },
        "charging_pct":    round(estados.get("CARGANDO", 0) / total * 100, 1),
        "discharging_pct": round(estados.get("DESCARGANDO", 0) / total * 100, 1),
        "equilibrium_pct": round(estados.get("EQUILIBRIO", 0) / total * 100, 1),
    }


def run_autonomy_analysis(data: list) -> dict:
    """
    Calcula la autonomía del sistema para múltiples perfiles de consumo.
    Batería: Ultrafire 18650 — 3.7V, 8800mAh (32560 mWh).
    """
    BAT_VOLTAGE = 3.7
    BAT_CAPACITY_mAh = 8800
    BAT_CAPACITY_mWh = BAT_VOLTAGE * BAT_CAPACITY_mAh  # 32560 mWh

    # ── Perfiles teóricos de consumo (mA a 3.7V) ────────────────────────────
    PROFILES = [
        {
            "id": "standby",
            "name": "🔋 Standby (Deep Sleep)",
            "description": "ESP8266 en modo Deep Sleep, periféricos apagados.",
            "consumption_mA": 0.02,
            "color": "#6EE7B7",
        },
        {
            "id": "esp_only",
            "name": "📡 ESP8266 Activo (WiFi)",
            "description": "Microcontrolador con WiFi transmitiendo, sin LED.",
            "consumption_mA": 80,
            "color": "#00D4FF",
        },
        {
            "id": "esp_sensors",
            "name": "📡 ESP + Sensores INA219",
            "description": "ESP8266 con WiFi + 2 sensores INA219 midiendo.",
            "consumption_mA": 82,
            "color": "#A78BFA",
        },
        {
            "id": "full_system",
            "name": "💡 Sistema Completo (LED ON)",
            "description": "ESP8266 + Sensores + LED indicador encendido.",
            "consumption_mA": 102,
            "color": "#F59E0B",
        },
    ]

    # ── Consumo REAL medido por el INA219 de batería ────────────────────────
    discharge_readings = [
        d for d in data
        if d.get("bat_current_mA", 0) < 0 or d.get("estado") == "DESCARGANDO"
    ]

    if discharge_readings:
        real_currents = [abs(d.get("bat_current_mA", 0)) for d in discharge_readings]
        real_avg_mA = float(np.mean(real_currents))
        real_max_mA = float(np.max(real_currents))
        real_min_mA = float(np.min([c for c in real_currents if c > 0])) if any(c > 0 for c in real_currents) else 0
        real_std_mA = float(np.std(real_currents))
    else:
        all_bat = [abs(d.get("bat_current_mA", 0)) for d in data if d.get("bat_current_mA", 0) != 0]
        if all_bat:
            real_avg_mA = float(np.mean(all_bat))
            real_max_mA = float(np.max(all_bat))
            real_min_mA = float(np.min(all_bat))
            real_std_mA = float(np.std(all_bat))
        else:
            real_avg_mA, real_max_mA, real_min_mA, real_std_mA = 85, 120, 20, 25

    PROFILES.append({
        "id": "measured",
        "name": "📊 Consumo Real Medido",
        "description": f"Basado en {len(discharge_readings)} lecturas del INA219.",
        "consumption_mA": round(real_avg_mA, 1),
        "color": "#EF4444",
    })

    # ── Calcular autonomía por perfil ────────────────────────────────────────
    results = []
    for p in PROFILES:
        c_mA = p["consumption_mA"]
        c_mW = c_mA * BAT_VOLTAGE
        if c_mA > 0:
            autonomy_hrs = BAT_CAPACITY_mAh / c_mA
        else:
            autonomy_hrs = 99999

        if autonomy_hrs >= 8760:
            label = f"{autonomy_hrs / 8760:.0f} años"
        elif autonomy_hrs >= 720:
            label = f"{autonomy_hrs / 720:.0f} meses"
        elif autonomy_hrs >= 24:
            label = f"{int(autonomy_hrs / 24)}d {int(autonomy_hrs % 24)}h"
        else:
            label = f"{int(autonomy_hrs)}h {int((autonomy_hrs % 1) * 60)}min"

        results.append({
            "id": p["id"], "name": p["name"], "description": p["description"],
            "color": p["color"],
            "consumption_mA": round(c_mA, 2), "consumption_mW": round(c_mW, 1),
            "autonomy_hrs": round(min(autonomy_hrs, 99999), 1),
            "autonomy_label": label,
        })

    # ── Consumo por hora del día ─────────────────────────────────────────────
    hourly_consumption = {}
    for d in data:
        h = d["timestamp"].hour
        hourly_consumption.setdefault(h, []).append(abs(d.get("bat_current_mA", 0)))
    hourly_profile = []
    for h in sorted(hourly_consumption.keys()):
        vals = hourly_consumption[h]
        hourly_profile.append({
            "hour": h, "hour_label": f"{h:02d}:00",
            "avg_consumption_mA": round(float(np.mean(vals)), 1),
            "max_consumption_mA": round(float(np.max(vals)), 1),
        })

    # ── Tiempo estimado para carga completa ──────────────────────────────────
    charge_readings = [
        abs(d.get("bat_current_mA", 0)) for d in data
        if d.get("bat_current_mA", 0) > 0 or d.get("estado") == "CARGANDO"
    ]
    avg_charge_mA = float(np.mean(charge_readings)) if charge_readings else 0
    full_charge_hrs = round(BAT_CAPACITY_mAh / max(avg_charge_mA, 0.01), 1) if avg_charge_mA > 0 else 0
    full_charge_hrs = min(full_charge_hrs, 9999)

    return {
        "battery_spec": {
            "model": "Ultrafire 18650",
            "voltage_V": BAT_VOLTAGE,
            "capacity_mAh": BAT_CAPACITY_mAh,
            "capacity_mWh": BAT_CAPACITY_mWh,
        },
        "profiles": results,
        "measured_stats": {
            "avg_mA": round(real_avg_mA, 1), "max_mA": round(real_max_mA, 1),
            "min_mA": round(real_min_mA, 1), "std_mA": round(real_std_mA, 1),
            "samples": len(discharge_readings),
        },
        "hourly_consumption": hourly_profile,
        "charge_estimate": {
            "avg_charge_current_mA": round(avg_charge_mA, 1),
            "full_charge_hrs": full_charge_hrs,
            "full_charge_label": f"{int(full_charge_hrs)}h {int((full_charge_hrs % 1) * 60)}min" if full_charge_hrs < 9999 else "N/A",
        },
    }


# =============================================================================
# RUTAS DE LA API
# =============================================================================

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/weather")
def get_weather():
    """Retorna las condiciones climáticas actuales de Popayán."""
    return jsonify(weather_cache)


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


@app.route("/api/available-dates")
def get_available_dates():
    try:
        resp_shallow = requests.get(f"{FIREBASE_URL}/lecturas.json?shallow=true", timeout=8)
        if resp_shallow.status_code == 200:
            dates = sorted(resp_shallow.json().keys(), reverse=True)
            return jsonify(dates)
        return jsonify([])
    except Exception as exc:
        print(f"[Available Dates] Error: {exc}")
        return jsonify([])


@app.route("/api/history")
def get_history():
    """Historial para gráficas (por fecha específica)"""
    try:
        date_param = request.args.get("date")
        if not date_param:
            resp_shallow = requests.get(f"{FIREBASE_URL}/lecturas.json?shallow=true", timeout=8)
            if resp_shallow.status_code != 200:
                return jsonify([])
            dates = sorted(resp_shallow.json().keys())
            if not dates:
                return jsonify([])
            date_param = dates[-1]

        history = []
        resp_day = requests.get(f"{FIREBASE_URL}/lecturas/{date_param}.json", timeout=10)
        if resp_day.status_code == 200:
            day_data = resp_day.json()
            if day_data and isinstance(day_data, dict):
                for push_id in sorted(day_data.keys()):
                    record = day_data[push_id]
                    if not isinstance(record, dict) or "hora" not in record:
                        continue
                    r = parse_reading(record)
                    hora = r["hora"] or "00:00:00"
                    try:
                        ts = datetime.strptime(f"{date_param} {hora}", "%Y-%m-%d %H:%M:%S").isoformat()
                    except ValueError:
                        ts = f"{date_param}T{hora}"
                    history.append({
                        "timestamp":        ts,
                        "ldr":              r["ldr"],
                        "estadoFotocelda":  r["estadoFotocelda"],
                        "estadoLuces":      r["estadoLuces"],
                        "estado":           r["estado"],
                        "hora":             hora,
                        "fecha":            date_param,
                        "panel":            r["panel"],
                        "bateria":          r["bateria"],
                    })
        return jsonify(history)
    except Exception as exc:
        print(f"[History] Error: {exc}")
        return jsonify([])


@app.route("/api/daily-summary")
def get_daily_summary():
    """Resumen estadístico de los últimos 7 días con análisis de batería."""
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
            
            # Batería 3.7V 8800mAh = 32560 mWh
            total_capacity_mWh = 32560
            energy_charged_mWh = 0
            charging_time_sec = 0

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
                if r["estadoLuces"] == "ENCENDIDAS":
                    encendidos += 1
                    
                # Calcular tiempo y energía de carga (asumiendo lectura cada ~5 seg)
                if r["estado"] == "CARGANDO" or r["bateria"]["corriente_mA"] > 0:
                    charging_time_sec += 5
                    # Energía (mWh) = Potencia (mW) * (5s / 3600s/h)
                    energy_charged_mWh += r["bateria"]["potencia_mW"] * (5 / 3600)
                    
                readings_list.append({
                    "timestamp":        ts,
                    "hora":             hora,
                    "ldr":              r["ldr"],
                    "estadoFotocelda":  r["estadoFotocelda"],
                    "estadoLuces":      r["estadoLuces"],
                    "estado":           r["estado"],
                })

            if not ldrs:
                continue

            def safe_max(lst): return round(max(lst), 1) if lst else 0
            def safe_avg(lst): return round(sum(lst)/len(lst), 1) if lst else 0
            
            charging_efficiency = min((energy_charged_mWh / total_capacity_mWh) * 100, 100) if total_capacity_mWh > 0 else 0

            result[day_key] = {
                "fecha":      day_key,
                "count":      len(ldrs),
                "ldr":        {"max": safe_max(ldrs), "avg": safe_avg(ldrs)},
                "encendidos": encendidos,
                "battery": {
                    "energy_charged_mWh": round(energy_charged_mWh, 2),
                    "charging_time_min": round(charging_time_sec / 60, 1),
                    "charging_efficiency_pct": round(charging_efficiency, 2),
                    "capacity_mWh": total_capacity_mWh
                },
                "readings":   readings_list,
            }
        return jsonify(result)
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
                luces_val  = str(record.get("estadoLuces", "APAGADAS")).upper()
                luces_norm = "ENCENDIDAS" if "ENCENDIDAS" in luces_val else "APAGADAS"
                try:
                    t = datetime.strptime(f"{day_key} {hora_str}", "%Y-%m-%d %H:%M:%S")
                except ValueError:
                    continue
                readings.append({"t": t, "led": luces_norm})

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

            encendidas_count = sum(1 for s in segments if s["estado"] == "ENCENDIDAS")
            result[day_key] = {
                "segmentos":             segments,
                "encendidos_count":      encendidas_count,
                "total_encendido_min":   round(sum(s["duracion_min"] for s in segments if s["estado"] == "ENCENDIDAS"), 1),
                "total_apagado_min":     round(sum(s["duracion_min"] for s in segments if s["estado"] == "APAGADAS"),   1),
            }

        return jsonify(result)
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
        energy      = run_energy_balance(data)
        autonomy    = run_autonomy_analysis(data)

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
            "energy_balance":    energy,
            "autonomy":          autonomy,
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


@app.route("/api/ml-predictive")
def get_ml_predictive():
    """Endpoint para el nuevo motor predictivo avanzado (MySQL + Scikit-Learn)"""
    try:
        insights = ml_engine.get_ml_advanced_insights(data_cache)
        return jsonify(insights)
    except Exception as exc:
        print(f"[ML-Predictive] Error: {exc}")
        return jsonify({"status": "error", "message": str(exc)}), 500

@app.route("/api/ml-export-excel")
def export_ml_excel():
    """Genera y descarga el reporte en formato Excel .xlsx con 2000 registros e IA aplicada"""
    try:
        excel_io = ml_engine.generate_excel_report()
        return send_file(
            excel_io,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name=f"DataScience_Solar_Report_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
        )
    except Exception as exc:
        print(f"[ML-Export] Error: {exc}")
        return jsonify({"status": "error", "message": str(exc)}), 500

@app.route("/api/chat", methods=["POST"])
def chat_endpoint():
    """Chatbot IA para consultas sobre el sistema fotovoltaico."""
    try:
        body = request.get_json(silent=True) or {}
        question = body.get("question", "").strip()
        if not question:
            return jsonify({"answer": "Por favor, escribe una pregunta.", "type": "error"})

        answer = process_chat_question(question)
        return jsonify({"answer": answer, "type": "success"})
    except Exception as exc:
        print(f"[Chat] Error: {exc}")
        return jsonify({"answer": f"Error procesando la pregunta: {str(exc)}", "type": "error"})

def process_chat_question(question: str) -> str:
    """Motor de IA avanzado con análisis de datos históricos y telemetría en tiempo real."""
    q = question.lower().strip()
    now = datetime.now()

    # --- AYUDANTE: Obtener datos de un día específico ---
    def fetch_specific_day(day_str):
        try:
            resp = requests.get(f"{FIREBASE_URL}/lecturas/{day_str}.json", timeout=10)
            if resp.status_code == 200 and resp.json():
                day_raw = resp.json()
                parsed = []
                for pid in sorted(day_raw.keys()):
                    rec = day_raw[pid]
                    if isinstance(rec, dict) and "hora" in rec:
                        r = parse_reading(rec)
                        r["fecha"] = day_str
                        parsed.append(r)
                return parsed
        except: pass
        return []

    # --- AYUDANTE: Extracción de Fecha ---
    target_date = None
    import re
    months_map = {
        "enero": "01", "febrero": "02", "marzo": "03", "abril": "04", "mayo": "05", "junio": "06",
        "julio": "07", "agosto": "08", "septiembre": "09", "octubre": "10", "noviembre": "11", "diciembre": "12"
    }
    
    m = re.search(r"(\d{1,2})\s+(?:de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)", q)
    if m:
        target_date = f"2026-{months_map[m.group(2)]}-{int(m.group(1)):02d}"
    
    if not target_date:
        m = re.search(r"(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(\d{1,2})", q)
        if m:
            target_date = f"2026-{months_map[m.group(1)]}-{int(m.group(2)):02d}"
    
    if "hoy" in q: target_date = now.strftime("%Y-%m-%d")
    elif "ayer" in q: target_date = (now - timedelta(days=1)).strftime("%Y-%m-%d")

    # --- CARGA DE CONTEXTO ---
    current = data_cache.copy()
    try: history = load_all_history(limit_days=3)
    except: history = []

    # Variables de telemetría segura
    def get_val(d, *keys):
        for k in keys:
            if isinstance(d, dict): d = d.get(k, 0)
            else: return 0
        return d

    pv = get_val(current, "panel", "voltaje_V")
    pp = get_val(current, "panel", "potencia_mW")
    bv = get_val(current, "bateria", "voltaje_V")
    bc = get_val(current, "bateria", "corriente_mA")
    ldr = current.get("ldr", 0)
    status = "🟢 Activo" if _state.get("circuit_ok") else "🔴 Offline"

    # --- PROCESAMIENTO DE RESPUESTAS ---

    # A. Prioridad: Integrantes e Identidad
    if any(w in q for w in ["integrante", "quienes son", "quiénes son", "equipo", "desarrollador", "quien hizo"]):
        return (
            f"🎓 **Proyecto SolarMonitor PV - Universidad del Cauca / FUP:**\n\n"
            f"Este ecosistema tecnológico fue desarrollado por el equipo de **Ingeniería Informática Nocturna**:\n"
            f"- **Andrés Felipe Suaza Ceron**\n"
            f"- **Duban Alexander Gomez Hoyos**\n"
            f"- **Jessica Vanessa Acosta Galindez**\n"
            f"- **Santiago Prado Astaisa**\n"
            f"- **Santiago Alexis Ordoñez Segura**\n\n"
            f"**Objetivo:** Monitoreo y diagnóstico inteligente de sistemas fotovoltaicos mediante IoT y Machine Learning."
        )

    # A2. Ayuda / Capacidades
    if any(w in q for w in ["ayuda", "que haces", "qué haces", "puedes hacer", "capacidad"]):
        return (
            "🤖 **¿En qué puedo ayudarte?**\n\n"
            "Soy una IA entrenada para auditar este sistema solar. Puedo:\n"
            "1. **Estado Actual:** Pregunta '¿cómo está el sistema?'.\n"
            "2. **Historial:** Pregunta 'Análisis del 14 de mayo' o 'último dato de ayer'.\n"
            "3. **Autonomía:** Pregunta '¿cuánto dura la batería?'.\n"
            "4. **Récords:** Pregunta '¿cuál ha sido el voltaje máximo?'.\n"
            "5. **Clima:** Pregunta '¿cómo está el clima en Popayán?'.\n"
            "6. **Equipo:** Pregunta '¿quiénes son los desarrolladores?'."
        )

    # B. Prioridad: Clima (Específicamente manejado para no chocar con fechas)
    if any(w in q for w in ["clima", "temperatura", "lluvia", "tiempo"]):
        w = weather_cache
        if w.get("temperature_2m"):
            return (
                f"🌤️ **Clima en Popayán:**\n\n"
                f"- **Temperatura:** {w['temperature_2m']}°C\n"
                f"- **Humedad:** {w['relative_humidity_2m']}%\n"
                f"- **Nubes:** {w['cloud_cover']}%\n"
                f"Actualmente, el sistema registra {pv:.2f}V en el panel."
            )

    # C. Análisis por Fecha
    if target_date:
        day_data = [d for d in history if d.get("fecha") == target_date]
        if not day_data: day_data = fetch_specific_day(target_date)
        
        if day_data:
            if any(w in q for w in ["analisis", "análisis", "profundo", "resumen"]):
                charging = [d for d in day_data if get_val(d, "panel", "potencia_mW") > 5]
                max_v = max([get_val(d, "panel", "voltaje_V") for d in day_data])
                avg_p = sum([get_val(d, "panel", "potencia_mW") for d in charging]) / len(charging) if charging else 0
                return (
                    f"📊 **Análisis Analítico ({target_date}):**\n"
                    f"- **Registros:** {len(day_data)}\n"
                    f"- **Tiempo Solar:** {len(charging)/60.0:.2f} horas.\n"
                    f"- **Potencia Promedio:** {avg_p:.1f} mW.\n"
                    f"- **Pico Máximo:** {max_v:.2f} V."
                )
            if any(w in q for w in ["ultimo", "último", "final"]):
                last = day_data[-1]
                return (
                    f"🕒 **Cierre del {target_date}:**\n"
                    f"- **Panel:** {get_val(last, 'panel', 'voltaje_V'):.2f} V\n"
                    f"- **Batería:** {get_val(last, 'bateria', 'voltaje_V'):.2f} V"
                )
            return f"He analizado el **{target_date}**. Se registraron {len(day_data)} lecturas. ¿Deseas un 'análisis profundo'?"
        else:
            return f"❌ No hay datos para el **{target_date}**."

    # D. Autonomía
    if any(w in q for w in ["autonomia", "autonomía", "bateria", "batería", "cuanto dura"]):
        if abs(bc) < 5: return f"🔋 **Batería:** {bv:.2f}V. Autonomía ilimitada (reposo)."
        return f"🔋 **Autonomía:** {(8800/abs(bc)):.1f} horas a un ritmo de {abs(bc):.1f} mA."

    # E. Récords
    if any(w in q for w in ["mayor", "maximo", "máximo", "pico", "record"]):
        if history:
            max_v = max([get_val(d, "panel", "voltaje_V") for d in history])
            return f"🏆 **Récord Histórico:** Voltaje máximo detectado de {max_v:.2f} V."

    # F. Fallback Inteligente (Responde a cualquier cosa con contexto)
    try:
        insights = ml_engine.get_ml_advanced_insights(current)
        ia_diag = insights.get("analisis_general", "El sistema opera con normalidad.")
    except:
        ia_diag = "El motor predictivo está analizando la telemetría actual."

    return (
        f"🤖 **Monitor SolarAI:**\n\n"
        f"Actualmente el sistema está **{status}**.\n"
        f"- **Panel:** {pv:.2f} V | {pp:.1f} mW\n"
        f"- **Batería:** {bv:.2f} V\n\n"
        f"**Diagnóstico IA:** {ia_diag}"
    )


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
    print("  GET  /api/ml-predictive -> [IA] Motor Predictivo Avanzado (MySQL)")
    print("  POST /api/chat          -> [IA] Chatbot SolarAI")
    print("=" * 60)
    
    # Iniciar motor ML predictivo en background
    ml_engine.init_ml_engine()
    
    app.run(host="0.0.0.0", port=5000, debug=True)

