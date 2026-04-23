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
}

# Cache de valores para el frontend
data_cache = {
    # Datos eléctricos (se ponen a 0 cuando circuito desconectado)
    "voltage":    0.0,
    "current":    0.0,
    "current_mA": 0.0,
    "power":      0.0,
    "power_mW":   0.0,
    "ldr":        0,
    "led":        "APAGADO",
    "ambiente":   "NOCHE",
    "hora":       None,

    # Timestamps
    "server_timestamp":  None,   # cuándo el backend hizo la última consulta HTTP a Firebase
    "circuit_timestamp": None,   # cuándo el circuito envió su último dato (fecha + hora del registro)

    # Flags de conexión
    "firebase_connected": False,  # App puede hablar con Firebase (HTTP)
    "circuit_connected":  False,  # Circuito sigue enviando datos a Firebase

    # Retrocompatibilidad
    "connected":          False,  # True solo si AMBAS conexiones están OK
}

# =============================================================================
# PARSEO DE FIREBASE
# =============================================================================

def parse_reading(record: dict) -> dict:
    return {
        "voltage":    float(record.get("voltaje_V",    0.0)),
        "current":    float(record.get("corriente_A",  0.0)),
        "current_mA": float(record.get("corriente_mA", 0.0)),
        "power":      float(record.get("potencia_W",   0.0)),
        "power_mW":   float(record.get("potencia_mW",  0.0)),
        "ldr":        int(record.get("ldr",   0)),
        "led":        str(record.get("led",   "APAGADO")),
        "ambiente":   str(record.get("ambiente", "NOCHE")),
        "hora":       record.get("hora", None),
    }


def get_latest_with_date(lecturas: dict):
    """
    Retorna (record_dict, fecha_str) del registro más reciente.
    """
    if not lecturas or not isinstance(lecturas, dict):
        return None, None
    for day_key in sorted(lecturas.keys(), reverse=True):
        day_data = lecturas[day_key]
        if not isinstance(day_data, dict):
            continue
        for push_id in sorted(day_data.keys(), reverse=True):
            record = day_data[push_id]
            if isinstance(record, dict) and "voltaje_V" in record:
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
        resp = requests.get(f"{FIREBASE_URL}/lecturas.json", timeout=8)
        _state["firebase_checked_at"] = now

        if resp.status_code == 200:
            _state["firebase_ok"] = True
            lecturas = resp.json()
            latest, fecha = get_latest_with_date(lecturas)

            if latest and fecha:
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
                    # Circuito activo → mostrar valores reales
                    data_cache.update({
                        "voltage":    round(latest["voltage"],    3),
                        "current":    round(latest["current"],    5),
                        "current_mA": round(latest["current_mA"], 2),
                        "power":      round(latest["power"],      4),
                        "power_mW":   round(latest["power_mW"],   2),
                        "ldr":        latest["ldr"],
                        "led":        latest["led"],
                        "ambiente":   latest["ambiente"],
                        "hora":       hora_str,
                    })
                    print(f"[OK] circuito vivo ({elapsed:.0f}s) V={data_cache['voltage']}V  I={data_cache['current_mA']}mA")
                else:
                    # Circuito silencioso → poner valores a cero
                    data_cache.update({
                        "voltage": 0.0, "current": 0.0, "current_mA": 0.0,
                        "power": 0.0, "power_mW": 0.0, "ldr": 0,
                        "led": "APAGADO", "ambiente": "NOCHE", "hora": hora_str,
                    })
                    print(f"[WARN] circuito silencioso hace {elapsed:.0f}s — valores a cero")
            else:
                _state["circuit_ok"] = False
                print("[WARN] Sin registros válidos en Firebase")
        else:
            _state["firebase_ok"] = False
            _state["circuit_ok"]  = False
            print(f"[ERROR] Firebase HTTP {resp.status_code}")

    except Exception as exc:
        _state["firebase_ok"] = False
        _state["circuit_ok"]  = False
        print(f"[ERROR] Firebase: {exc}")

    # Timestamps y flags para el frontend
    circuit_dt = _state.get("circuit_last_seen")
    data_cache.update({
        "server_timestamp":   now.isoformat(),
        "circuit_timestamp":  circuit_dt.isoformat() if circuit_dt else None,
        "firebase_connected": _state["firebase_ok"],
        "circuit_connected":  _state["circuit_ok"],
        "connected":          _state["firebase_ok"] and _state["circuit_ok"],
    })


def background_data_fetcher():
    while True:
        fetch_data_from_firebase()
        time.sleep(5)


fetcher_thread = threading.Thread(target=background_data_fetcher, daemon=True)
fetcher_thread.start()


# =============================================================================
# HELPERS — CARGA DE DATOS HISTÓRICOS
# =============================================================================

def load_all_history() -> list:
    """Carga TODO el historial de Firebase y retorna lista de dicts ordenada."""
    try:
        resp = requests.get(f"{FIREBASE_URL}/lecturas.json", timeout=12)
        if resp.status_code != 200:
            return []
        lecturas = resp.json()
        if not lecturas or not isinstance(lecturas, dict):
            return []
        history = []
        for day_key in sorted(lecturas.keys()):
            day_data = lecturas[day_key]
            if not isinstance(day_data, dict):
                continue
            for push_id in sorted(day_data.keys()):
                record = day_data[push_id]
                if not isinstance(record, dict) or "voltaje_V" not in record:
                    continue
                r = parse_reading(record)
                hora = r["hora"] or "00:00:00"
                try:
                    ts = datetime.strptime(f"{day_key} {hora}", "%Y-%m-%d %H:%M:%S")
                except ValueError:
                    continue
                history.append({
                    "timestamp":  ts,
                    "ts_iso":     ts.isoformat(),
                    "fecha":      day_key,
                    "hora":       hora,
                    "hour_of_day": ts.hour + ts.minute / 60.0,
                    "voltage":    round(r["voltage"],    3),
                    "current_mA": round(r["current_mA"], 2),
                    "power_mW":   round(r["power_mW"],   2),
                    "ldr":        r["ldr"],
                    "led":        r["led"],
                    "ambiente":   r["ambiente"],
                })
        return history
    except Exception as exc:
        print(f"[IA] Error cargando historial: {exc}")
        return []


# =============================================================================
# MÓDULO DE IA — MOTOR DE ANALÍTICA
# =============================================================================

def run_anomaly_detection(data: list) -> dict:
    """
    Detecta anomalías usando Z-Score e IQR sobre voltaje, corriente y potencia.
    Retorna índices y valores anómalos.
    """
    if len(data) < 10:
        return {"anomalies": [], "total": 0, "pct": 0.0}

    voltages   = np.array([d["voltage"]    for d in data])
    currents   = np.array([d["current_mA"] for d in data])
    powers     = np.array([d["power_mW"]   for d in data])

    anomalies = []
    for i, d in enumerate(data):
        score_v = abs(stats.zscore(voltages)[i])
        score_c = abs(stats.zscore(currents)[i])
        score_p = abs(stats.zscore(powers)[i])
        max_score = max(score_v, score_c, score_p)

        if max_score > 2.5:
            severity = "critical" if max_score > 3.5 else "warning"
            anomalies.append({
                "timestamp":  d["ts_iso"],
                "hora":       d["hora"],
                "fecha":      d["fecha"],
                "voltage":    d["voltage"],
                "current_mA": d["current_mA"],
                "power_mW":   d["power_mW"],
                "z_score":    round(max_score, 2),
                "severity":   severity,
                "description": _anomaly_desc(d, score_v, score_c, score_p),
            })

    pct = round(len(anomalies) / len(data) * 100, 1) if data else 0.0
    return {
        "anomalies": anomalies[-20:],  # últimas 20
        "total":     len(anomalies),
        "pct":       pct,
    }


def _anomaly_desc(d: dict, sv: float, sc: float, sp: float) -> str:
    parts = []
    if sv > 2.5: parts.append(f"Voltaje inusual ({d['voltage']}V)")
    if sc > 2.5: parts.append(f"Corriente inusual ({d['current_mA']}mA)")
    if sp > 2.5: parts.append(f"Potencia inusual ({d['power_mW']}mW)")
    return "; ".join(parts) if parts else "Anomalía detectada"


def run_clustering(data: list) -> dict:
    """
    K-Means sobre (ldr, power_mW) para clasificar períodos del día.
    Retorna: clusters asignados a cada punto + centroides + etiquetas.
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
            "timestamp": d["ts_iso"],
            "hora":      d["hora"],
            "ldr":       d["ldr"],
            "power_mW":  d["power_mW"],
            "cluster":   c,
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
    """
    Calcula la matriz de correlación de Pearson entre voltage, current_mA, power_mW, ldr.
    """
    if len(data) < 5:
        return {"matrix": {}, "insights": []}

    variables = ["voltage", "current_mA", "power_mW", "ldr"]
    arrays = {v: np.array([d[v] for d in data]) for v in variables}

    matrix = {}
    for v1 in variables:
        matrix[v1] = {}
        for v2 in variables:
            if len(arrays[v1]) > 1 and arrays[v1].std() > 0 and arrays[v2].std() > 0:
                r, p = stats.pearsonr(arrays[v1], arrays[v2])
            else:
                r, p = (1.0 if v1 == v2 else 0.0), 1.0
            matrix[v1][v2] = {"r": round(float(r), 3), "p": round(float(p), 4)}

    # Insights automáticos
    insights = []
    pairs = [
        ("ldr", "power_mW", "LDR (luz solar)", "Potencia"),
        ("ldr", "voltage",  "LDR (luz solar)", "Voltaje"),
        ("voltage", "current_mA", "Voltaje", "Corriente"),
        ("voltage", "power_mW",   "Voltaje", "Potencia"),
    ]
    for v1, v2, n1, n2 in pairs:
        r = matrix[v1][v2]["r"]
        strength = "muy fuerte" if abs(r) > 0.8 else "fuerte" if abs(r) > 0.6 else "moderada" if abs(r) > 0.4 else "débil"
        direction = "positiva" if r > 0 else "negativa"
        if abs(r) > 0.3:
            insights.append({
                "var1": n1, "var2": n2,
                "r": r,
                "description": f"Correlación {strength} {direction} entre {n1} y {n2} (r={r:.2f})"
            })

    return {"matrix": matrix, "insights": insights}


def run_power_prediction(data: list) -> dict:
    """
    Regresión polinomial: ldr → power_mW.
    Genera curva de predicción y predicción para valores actuales de LDR.
    """
    if len(data) < 10:
        return {"curve": [], "model_score": 0.0, "current_prediction": None}

    X = np.array([d["ldr"]      for d in data]).reshape(-1, 1)
    y = np.array([d["power_mW"] for d in data])

    # Pipeline: features polinomiales grado 2 + regresión
    model = Pipeline([
        ("poly",  PolynomialFeatures(degree=2, include_bias=False)),
        ("linreg", LinearRegression()),
    ])
    model.fit(X, y)
    score = round(float(model.score(X, y)), 4)

    # Curva de predicción (100 puntos de LDR min→max)
    ldr_min = int(X.min())
    ldr_max = int(X.max())
    ldr_range = np.linspace(ldr_min, ldr_max, 100).reshape(-1, 1)
    predicted = model.predict(ldr_range)

    # Banda de confianza aproximada (±1 std de residuos)
    residuals = y - model.predict(X)
    std_err   = float(np.std(residuals))

    curve = [
        {
            "ldr":       round(float(ldr_range[i][0]), 1),
            "predicted": round(float(max(0, predicted[i])), 2),
            "upper":     round(float(max(0, predicted[i] + std_err)), 2),
            "lower":     round(float(max(0, predicted[i] - std_err)), 2),
        }
        for i in range(len(ldr_range))
    ]

    # Predicción con LDR actual
    current_ldr = data_cache.get("ldr", 0)
    pred_now    = float(max(0, model.predict([[current_ldr]])[0]))
    real_now    = data_cache.get("power_mW", 0)

    return {
        "curve":               curve,
        "model_score":         score,
        "model_score_pct":     round(score * 100, 1),
        "current_ldr":         current_ldr,
        "current_prediction":  round(pred_now, 2),
        "current_real":        real_now,
        "std_error":           round(std_err, 2),
        "ldr_range":           [ldr_min, ldr_max],
    }


def run_trend_analysis(data: list) -> dict:
    """
    Análisis de tendencia temporal usando regresión lineal sobre índice de tiempo.
    Detecta si el rendimiento está subiendo, bajando o estable.
    """
    if len(data) < 10:
        return {"trend": "insufficient_data", "slope": 0, "trend_line": []}

    # Usar solo registros con potencia > 0 (ignorar noche)
    active = [d for d in data if d["power_mW"] > 0.1]
    if len(active) < 5:
        return {"trend": "no_active_data", "slope": 0, "trend_line": []}

    X = np.arange(len(active)).reshape(-1, 1)
    y = np.array([d["power_mW"] for d in active])

    model = LinearRegression()
    model.fit(X, y)
    slope = float(model.coef_[0])
    r2    = float(model.score(X, y))

    if slope > 0.5:
        trend = "increasing"
        trend_label = "📈 Rendimiento en aumento"
    elif slope < -0.5:
        trend = "decreasing"
        trend_label = "📉 Rendimiento en descenso"
    else:
        trend = "stable"
        trend_label = "➡️ Rendimiento estable"

    trend_line = [
        {
            "timestamp": active[i]["ts_iso"],
            "hora":      active[i]["hora"],
            "power_mW":  round(float(active[i]["power_mW"]), 2),
            "trend":     round(float(model.predict([[i]])[0]), 2),
        }
        for i in range(len(active))
    ]

    return {
        "trend":       trend,
        "trend_label": trend_label,
        "slope":       round(slope, 3),
        "r2":          round(r2, 3),
        "trend_line":  trend_line[-100:],
    }


def compute_health_score(data: list, anomalies_info: dict, clustering: dict) -> dict:
    """
    Score de salud del sistema solar de 0-100.
    Componentes: estabilidad, eficiencia, anomalías, actividad.
    """
    if len(data) < 5:
        return {"score": 0, "grade": "N/A", "components": {}}

    voltages  = [d["voltage"]    for d in data]
    powers    = [d["power_mW"]   for d in data]
    ldrs      = [d["ldr"]        for d in data]

    # 1. Estabilidad de voltaje (coef de variación bajo = bueno)
    cv_v = (np.std(voltages) / (np.mean(voltages) + 1e-6)) * 100
    stability_score = max(0, min(100, 100 - cv_v * 5))

    # 2. Eficiencia energética (potencia vs LDR esperado)
    # Proxied: qué tan alta es la potencia relativa al LDR
    max_possible_power_mW = max(ldrs) * 0.15  # estimación aproximada
    active_powers = [p for p in powers if p > 0]
    if active_powers and max_possible_power_mW > 0:
        efficiency_score = min(100, (np.mean(active_powers) / max_possible_power_mW) * 100)
    else:
        efficiency_score = 0.0

    # 3. Penalización por anomalías
    anomaly_pct = anomalies_info.get("pct", 0)
    anomaly_score = max(0, 100 - anomaly_pct * 10)

    # 4. Actividad del sistema (% de tiempo encendido)
    encendidos = sum(1 for d in data if d["led"] == "ENCENDIDO")
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
    """
    Perfil promedio hora a hora: promedio de potencia por hora del día.
    """
    if len(data) < 5:
        return {"profile": []}

    hourly = {}
    for d in data:
        h = d["timestamp"].hour
        if h not in hourly:
            hourly[h] = []
        hourly[h].append(d["power_mW"])

    profile = []
    for h in sorted(hourly.keys()):
        vals = hourly[h]
        profile.append({
            "hour":       h,
            "hour_label": f"{h:02d}:00",
            "avg_power":  round(np.mean(vals), 2),
            "max_power":  round(np.max(vals),  2),
            "min_power":  round(np.min(vals),  2),
            "count":      len(vals),
        })

    # Hora de pico
    peak = max(profile, key=lambda x: x["avg_power"]) if profile else None

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
        "location":   "Parque Caldas, Popayán, Cauca, Colombia",
        "hardware":   "ESP8266 WiFi Module",
    })


@app.route("/api/history")
def get_history():
    """Historial completo de Firebase organizado cronológicamente."""
    try:
        resp = requests.get(f"{FIREBASE_URL}/lecturas.json", timeout=10)
        history = []
        if resp.status_code == 200:
            lecturas = resp.json()
            if lecturas and isinstance(lecturas, dict):
                for day_key in sorted(lecturas.keys()):
                    day_data = lecturas[day_key]
                    if not isinstance(day_data, dict):
                        continue
                    for push_id in sorted(day_data.keys()):
                        record = day_data[push_id]
                        if not isinstance(record, dict) or "voltaje_V" not in record:
                            continue
                        r = parse_reading(record)
                        hora = r["hora"] or "00:00:00"
                        try:
                            ts = datetime.strptime(f"{day_key} {hora}", "%Y-%m-%d %H:%M:%S").isoformat()
                        except ValueError:
                            ts = f"{day_key}T{hora}"
                        history.append({
                            "timestamp":  ts,
                            "voltage":    round(r["voltage"],    3),
                            "current":    round(r["current"],    5),
                            "current_mA": round(r["current_mA"], 2),
                            "power":      round(r["power"],      4),
                            "power_mW":   round(r["power_mW"],   2),
                            "ldr":        r["ldr"],
                            "led":        r["led"],
                            "ambiente":   r["ambiente"],
                            "hora":       hora,
                            "fecha":      day_key,
                        })
        return jsonify(history)
    except Exception as exc:
        print(f"[History] Error: {exc}")
        return jsonify([])


@app.route("/api/daily-summary")
def get_daily_summary():
    """
    Resumen estadístico por día con todos los valores:
    voltaje, corriente, potencia, ldr, encendidos.
    Para gráficas comparativas entre días.
    """
    try:
        resp = requests.get(f"{FIREBASE_URL}/lecturas.json", timeout=10)
        result = {}
        if resp.status_code == 200:
            lecturas = resp.json()
            if lecturas and isinstance(lecturas, dict):
                for day_key in sorted(lecturas.keys()):
                    day_data = lecturas[day_key]
                    if not isinstance(day_data, dict):
                        continue

                    voltages, currents_mA, powers_mW, ldrs = [], [], [], []
                    readings_list = []

                    for push_id in sorted(day_data.keys()):
                        record = day_data[push_id]
                        if not isinstance(record, dict) or "voltaje_V" not in record:
                            continue
                        r = parse_reading(record)
                        hora = r["hora"] or "00:00:00"
                        try:
                            ts = datetime.strptime(f"{day_key} {hora}", "%Y-%m-%d %H:%M:%S").isoformat()
                        except ValueError:
                            ts = f"{day_key}T{hora}"

                        voltages.append(r["voltage"])
                        currents_mA.append(r["current_mA"])
                        powers_mW.append(r["power_mW"])
                        ldrs.append(r["ldr"])
                        readings_list.append({
                            "timestamp":  ts,
                            "hora":       hora,
                            "voltage":    round(r["voltage"],    3),
                            "current_mA": round(r["current_mA"], 2),
                            "power_mW":   round(r["power_mW"],   2),
                            "ldr":        r["ldr"],
                            "led":        r["led"],
                        })

                    if not voltages:
                        continue

                    def safe_max(lst): return round(max(lst), 3) if lst else 0
                    def safe_avg(lst): return round(sum(lst)/len(lst), 3) if lst else 0

                    result[day_key] = {
                        "fecha":     day_key,
                        "count":     len(voltages),
                        "voltage":   {"max": safe_max(voltages),   "avg": safe_avg(voltages)},
                        "current_mA":{"max": safe_max(currents_mA),"avg": safe_avg(currents_mA)},
                        "power_mW":  {"max": safe_max(powers_mW),  "avg": safe_avg(powers_mW)},
                        "ldr":       {"max": safe_max(ldrs),        "avg": safe_avg(ldrs)},
                        "readings":  readings_list,
                    }
        return jsonify(result)
    except Exception as exc:
        print(f"[DailySummary] Error: {exc}")
        return jsonify({})


@app.route("/api/led-analysis")
def get_led_analysis():
    """Análisis del LED (ENCENDIDO/APAGADO) por segmentos y por día."""
    try:
        resp = requests.get(f"{FIREBASE_URL}/lecturas.json", timeout=10)
        result = {}
        if resp.status_code != 200:
            return jsonify({})

        lecturas = resp.json()
        if not lecturas or not isinstance(lecturas, dict):
            return jsonify({})

        for day_key in sorted(lecturas.keys()):
            day_data = lecturas[day_key]
            if not isinstance(day_data, dict):
                continue

            readings = []
            for push_id in sorted(day_data.keys()):
                record = day_data[push_id]
                if not isinstance(record, dict) or "voltaje_V" not in record:
                    continue
                hora_str = record.get("hora", "00:00:00")
                led_val  = str(record.get("led", "APAGADO")).upper()
                led_norm = "ENCENDIDO" if "ENCENDIDO" in led_val else "APAGADO"
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
    print("  GET /api/data          -> Último dato + estado de conexión")
    print("  GET /api/status        -> Estado detallado de conexiones")
    print("  GET /api/history       -> Historial completo")
    print("  GET /api/daily-summary -> Resumen estadístico por día")
    print("  GET /api/led-analysis  -> Análisis LED por día")
    print("  GET /api/ai-analysis   -> [IA] Análisis completo de inteligencia artificial")
    print("  GET /api/ai-predict    -> [IA] Predicción de potencia en tiempo real")
    print("=" * 60)
    app.run(host="0.0.0.0", port=5000, debug=True)
