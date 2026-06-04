import pandas as pd
import numpy as np
import traceback
import json
import io
import math
from datetime import datetime


def safe_float(value, decimals=2, default=0.0):
    """Convierte a float seguro: reemplaza NaN/Inf por un valor por defecto."""
    try:
        v = float(value)
        if math.isnan(v) or math.isinf(v):
            return default
        return round(v, decimals)
    except (TypeError, ValueError):
        return default

# =============================================================================
# REQUERIMIENTO 1: PROCESAMIENTO DE DATOS Y MODELADO FÍSICO EN PYTHON
# =============================================================================

# 1.1 Funciones físicas básicas
def calc_ley_ohm(voltage_v, current_ma):
    """Ley de Ohm (R = V / I). Retorna resistencia en Ohms. Maneja I=0."""
    i_a = current_ma / 1000.0
    return voltage_v / i_a if i_a > 0 else float('inf')

def calc_potencia(voltage_v, current_ma):
    """Calcula Potencia P = V * I. Retorna potencia en mW."""
    return voltage_v * current_ma

def calc_energia(potencia_mw, tiempo_s):
    """Calcula Energía E = P * Δt. Retorna energía en Joules (o mWs)."""
    return potencia_mw * tiempo_s / 1000.0  # Joules

def calc_efecto_joule(current_ma, resistance_ohm):
    """
    Efecto Joule: Pérdidas de potencia por calentamiento.
    P_joule = I² × R  (en mW)
    """
    i_a = current_ma / 1000.0
    if resistance_ohm == float('inf') or resistance_ohm <= 0:
        return 0.0
    return (i_a ** 2) * resistance_ohm * 1000.0  # Convertir W a mW


# 1.2 Importar datasets en estructuras de datos (Pandas)
def load_and_prepare_dataset(history_data):
    """Carga lecturas crudas en un DataFrame de Pandas y prepara tipos."""
    if not history_data:
        return pd.DataFrame()
    
    # Aplanar la estructura de las lecturas para Pandas
    flat_data = []
    for d in history_data:
        try:
            flat_data.append({
                'timestamp': d.get('timestamp'),
                'fecha': d.get('fecha', ''),
                'hora': d.get('hora', ''),
                'ldr': d.get('ldr', 0),
                'estado': d.get('estado', 'DESCONOCIDO'),
                'panel_v': d.get('panel', {}).get('voltaje_V', 0),
                'panel_i_ma': d.get('panel', {}).get('corriente_mA', 0),
                'panel_p_mw': d.get('panel', {}).get('potencia_mW', 0),
                'bat_v': d.get('bateria', {}).get('voltaje_V', 0),
                'bat_i_ma': d.get('bateria', {}).get('corriente_mA', 0),
            })
        except:
            pass
            
    df = pd.DataFrame(flat_data)
    if df.empty:
        return df
        
    # Convertir a datetime
    df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce')
    # Ordenar cronológicamente
    df = df.sort_values('timestamp').reset_index(drop=True)
    return df

# 1.3 Procesar variables: Calcular columnas de Energía y Potencia
# 1.4 Limpiar datos: Filtrar ruido
def process_and_clean_data(df):
    """Aplica cálculos físicos, limpia ruido y calcula variables derivadas."""
    if df.empty: return df
    
    # Calcular resistencia, potencia y energía mediante script (Req 1.1 y 1.3)
    df['resistencia_ohm'] = df.apply(lambda row: calc_ley_ohm(row['panel_v'], row['panel_i_ma']), axis=1)
    df['calc_potencia_mw'] = df.apply(lambda row: calc_potencia(row['panel_v'], row['panel_i_ma']), axis=1)
    
    # Asumimos un delta t constante de 5 segundos entre lecturas (tiempo de polling)
    df['calc_energia_j'] = df['calc_potencia_mw'].apply(lambda p: calc_energia(p, 5.0))
    
    # ── NUEVO: Efecto Joule (Pérdidas por calentamiento) ──
    df['efecto_joule_mw'] = df.apply(
        lambda row: calc_efecto_joule(row['panel_i_ma'], row['resistencia_ohm']), axis=1
    )
    
    # Limpiar datos: Filtrar ruido usando rolling mean (Req 1.4)
    # Rellenar NaNs con interpolación lineal
    df['panel_v_clean'] = df['panel_v'].interpolate().rolling(window=3, min_periods=1, center=True).mean()
    df['panel_p_mw_clean'] = df['calc_potencia_mw'].interpolate().rolling(window=3, min_periods=1, center=True).mean()
    
    return df


# =============================================================================
# REQUERIMIENTO 2: ANÁLISIS DE DATOS Y EFICIENCIA EN PYTHON
# =============================================================================

# 2.1 Programar cálculo de eficiencia
def calc_efficiency(df):
    """Computar rendimiento del convertidor (Panel -> Batería)."""
    if df.empty: return 0.0
    
    # Solo calcular cuando está cargando (potencia de batería es positiva)
    charging_mask = (df['estado'] == 'CARGANDO') | (df['bat_i_ma'] > 0)
    charging_df = df[charging_mask]
    
    if charging_df.empty: return 0.0
    
    # Eficiencia = (Potencia Salida / Potencia Entrada) * 100
    # Asumimos que P_entrada es Panel y P_salida es lo que llega a Batería
    p_in = charging_df['calc_potencia_mw'].sum()
    p_out = (charging_df['bat_v'] * charging_df['bat_i_ma']).sum()
    
    if p_in > 0:
        eff = (p_out / p_in) * 100.0
        return min(max(eff, 0), 100) # Limitar entre 0 y 100%
    return 0.0

# 2.2 Calcular errores
def calc_theoretical_vs_real(df):
    """Calcula diferencia porcentual entre el modelo teórico y el real."""
    if df.empty: return df
    
    # Modelo Teórico: Asumimos un panel de 5W (18V max, ~270mA max)
    # LDR va de 0 (mucha luz) a 1024 (oscuridad)
    # Voltaje Teórico = 18V * (1 - LDR/1024)
    df['teorico_v'] = 18.0 * (1.0 - (df['ldr'] / 1024.0).clip(0, 1))
    
    # Potencia Teórica = 5000mW * (1 - LDR/1024)
    df['teorico_p_mw'] = 5000.0 * (1.0 - (df['ldr'] / 1024.0).clip(0, 1))
    
    # Error Porcentual V = |Teorico - Real| / Teorico * 100
    # Protegemos contra division por cero
    df['error_v_pct'] = np.where(
        df['teorico_v'] > 0.5,
        np.abs(df['teorico_v'] - df['panel_v']) / df['teorico_v'] * 100.0,
        0
    )
    
    df['error_p_pct'] = np.where(
        df['teorico_p_mw'] > 10,
        np.abs(df['teorico_p_mw'] - df['calc_potencia_mw']) / df['teorico_p_mw'] * 100.0,
        0
    )
    
    return df

# 2.3 Modelar descarga (MEJORADO: retorna scatter + línea de regresión)
def model_battery_discharge(df):
    """Generar regresión de autonomía de batería.
    Ahora retorna también los puntos scatter y la línea de regresión (y_pred)
    para que el frontend pueda graficarlos."""
    result = {
        "slope": 0, "intercept": 0, "r2": 0,
        "scatter_data": [],
        "msg": ""
    }
    
    if df.empty:
        result["msg"] = "No hay datos"
        return result
    
    discharging_df = df[df['estado'] == 'DESCARGANDO'].copy()
    if len(discharging_df) < 5:
        # Si no hay suficientes datos de descarga, usar todos los datos de batería
        # para al menos mostrar algo en la gráfica
        discharging_df = df[df['bat_v'] > 0].copy()
        if len(discharging_df) < 5:
            result["msg"] = "Datos insuficientes para regresión"
            return result
        
    # Variables X (tiempo en horas desde inicio) e Y (voltaje)
    t0 = discharging_df['timestamp'].iloc[0]
    discharging_df['t_hours'] = (discharging_df['timestamp'] - t0).dt.total_seconds() / 3600.0
    
    X = discharging_df['t_hours'].values
    y = discharging_df['bat_v'].values
    
    # Regresión Lineal (NumPy)
    if len(X) > 1 and np.std(X) > 0:
        slope, intercept = np.polyfit(X, y, 1)
        # R²
        y_pred = slope * X + intercept
        ss_res = np.sum((y - y_pred)**2)
        ss_tot = np.sum((y - np.mean(y))**2)
        r2 = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0
        
        result["slope"] = slope
        result["intercept"] = intercept
        result["r2"] = r2
        
        # ── NUEVO: Generar puntos scatter para la gráfica ──
        # Tomamos hasta 80 puntos para no sobrecargar el frontend
        step = max(1, len(X) // 80)
        for i in range(0, len(X), step):
            result["scatter_data"].append({
                "t_hours": round(float(X[i]), 3),
                "bat_v": round(float(y[i]), 2),
                "regression_v": round(float(y_pred[i]), 2),
                "hora": discharging_df['hora'].iloc[i]
            })
    else:
        result["msg"] = "Variación insuficiente"
    
    return result

# 2.4 Detectar pérdidas (MEJORADO: derivada discreta dV/dt más precisa)
def detect_voltage_drops(df):
    """Identificar caídas de tensión mediante análisis de arrays de NumPy.
    Mejorado con derivada discreta dV/dt usando np.gradient."""
    if df.empty or len(df) < 2: return []
    
    # Usar np.gradient para derivada más precisa (central difference)
    v_array = df['panel_v'].values
    dV = np.gradient(v_array)
    
    # Definir un umbral de caída brusca (ej. -1.5V de gradiente)
    threshold = -1.5
    drop_indices = np.where(dV < threshold)[0]
    
    drops = []
    for idx in drop_indices:
        drops.append({
            "hora": df['hora'].iloc[idx],
            "v_anterior": round(float(v_array[max(0, idx-1)]), 2),
            "v_actual": round(float(v_array[idx]), 2),
            "caida": round(float(dV[idx]), 2),
            "dv_dt": round(float(dV[idx]), 3)
        })
    return drops


# =============================================================================
# REQUERIMIENTO 3: VISUALIZACIÓN Y VALIDACIÓN DE RESULTADOS
# =============================================================================

def generate_req3_analysis(history_data):
    """Ejecuta los requerimientos y devuelve un JSON estructurado para el Frontend."""
    try:
        # Req 1: Cargar y preparar
        df = load_and_prepare_dataset(history_data)
        if df.empty:
            return {"status": "error", "message": "No hay suficientes datos históricos."}
            
        # Req 1: Procesar y Limpiar
        df = process_and_clean_data(df)
        
        # Req 2: Análisis y Eficiencia
        efficiency = calc_efficiency(df)
        df = calc_theoretical_vs_real(df)
        discharge_model = model_battery_discharge(df)
        voltage_drops = detect_voltage_drops(df)
        
        # ── NUEVO: Estadísticas del Efecto Joule ──
        joule_valid = df.loc[df['efecto_joule_mw'] > 0, 'efecto_joule_mw']
        joule_stats = {
            "total_perdidas_mw": safe_float(joule_valid.sum(), 2) if not joule_valid.empty else 0,
            "promedio_mw": safe_float(joule_valid.mean(), 3) if not joule_valid.empty else 0,
            "max_mw": safe_float(joule_valid.max(), 3) if not joule_valid.empty else 0,
            "registros_con_perdida": int(len(joule_valid)),
            "formula": "P_joule = I² × R"
        }
        
        # Req 3.1: Datos para gráficas comparativas
        # Tomaremos los últimos 60 registros para la gráfica para no sobrecargar
        df_plot = df.tail(60).copy()
        comparative_data = []
        for _, row in df_plot.iterrows():
            comparative_data.append({
                "hora": row["hora"],
                "real_v": safe_float(row["panel_v_clean"]),
                "teorico_v": safe_float(row["teorico_v"]),
                "real_p": safe_float(row["panel_p_mw_clean"]),
                "teorico_p": safe_float(row["teorico_p_mw"])
            })
            
        # Req 3.2: Exportar tablas resumen estadísticas
        # Agrupar por día y sacar medias, maximos y minimos
        stats_df = df.groupby('fecha').agg({
            'panel_v': ['mean', 'max', 'min', 'std'],
            'calc_potencia_mw': ['mean', 'max'],
            'error_v_pct': ['mean'],
            'efecto_joule_mw': ['sum']
        }).reset_index()
        
        stats_list = []
        for _, row in stats_df.iterrows():
            stats_list.append({
                "fecha": str(row[('fecha', '')]),
                "v_mean": safe_float(row[('panel_v', 'mean')]),
                "v_max": safe_float(row[('panel_v', 'max')]),
                "v_min": safe_float(row[('panel_v', 'min')]),
                "v_std": safe_float(row[('panel_v', 'std')], 3),
                "p_mean": safe_float(row[('calc_potencia_mw', 'mean')]),
                "p_max": safe_float(row[('calc_potencia_mw', 'max')]),
                "error_mean": safe_float(row[('error_v_pct', 'mean')], 1),
                "joule_total": safe_float(row[('efecto_joule_mw', 'sum')]),
            })
            
        # Req 3.3: Analizar estabilidad (Desviación estándar con NumPy)
        v_std = safe_float(np.std(df['panel_v'].values))
        p_std = safe_float(np.std(df['calc_potencia_mw'].values))
        
        # Armar el payload JSON final
        return {
            "status": "success",
            "req1_modelado": {
                "total_registros": len(df),
                "energia_total_j": safe_float(df['calc_energia_j'].sum()),
                "potencia_promedio_mw": safe_float(df['calc_potencia_mw'].mean()),
                "resistencia_promedio_ohm": safe_float(df.loc[df['resistencia_ohm'] < float('inf'), 'resistencia_ohm'].mean()),
                "potencia_max_mw": safe_float(df['calc_potencia_mw'].max()),
                "voltaje_max_v": safe_float(df['panel_v'].max()),
                "corriente_max_ma": safe_float(df['panel_i_ma'].max()),
            },
            "req2_eficiencia": {
                "eficiencia_convertidor_pct": safe_float(efficiency),
                "error_voltaje_promedio_pct": safe_float(df['error_v_pct'].mean()),
                "descarga_slope": round(discharge_model["slope"], 4),
                "descarga_intercept": round(discharge_model["intercept"], 4),
                "descarga_r2": round(discharge_model["r2"], 4),
                "scatter_data": discharge_model["scatter_data"],
                "caidas_tension": voltage_drops,
                "efecto_joule": joule_stats,
            },
            "req3_visualizacion": {
                "grafica_comparativa": comparative_data,
                "tabla_resumen": stats_list,
                "estabilidad_v_std": v_std,
                "estabilidad_p_std": p_std
            },
            "doc": "El script `req3_engine.py` utiliza Pandas para la manipulación y limpieza de los datasets (Req 1.2, 1.4), aplica la Ley de Ohm y fórmulas de Potencia/Energía vía apply() (Req 1.1, 1.3). Calcula eficiencia y error teórico (Req 2.1, 2.2), usa regresión lineal de NumPy (polyfit) para la descarga (Req 2.3) y np.gradient() para detectar pérdidas (Req 2.4). Calcula pérdidas por Efecto Joule P=I²R. Finalmente, exporta los DataFrames agrupados para las gráficas comparativas en React (Req 3.1, 3.2, 3.3)."
        }
    except Exception as e:
        traceback.print_exc()
        return {"status": "error", "message": f"Error procesando análisis Req 3: {str(e)}"}


# =============================================================================
# GENERADOR DE JUPYTER NOTEBOOK (.ipynb)
# =============================================================================

def generate_jupyter_notebook(history_data):
    """
    Genera un archivo Jupyter Notebook (.ipynb) real con celdas de Markdown y 
    código Python que documentan y ejecutan todo el análisis de los requerimientos.
    Retorna un BytesIO con el contenido del archivo .ipynb.
    """
    
    # Preparar datos de ejemplo para incrustar en el notebook
    df = load_and_prepare_dataset(history_data)
    sample_data = []
    if not df.empty:
        df = process_and_clean_data(df)
        sample = df.head(20)
        for _, row in sample.iterrows():
            sample_data.append({
                "hora": str(row.get("hora", "")),
                "panel_v": round(float(row.get("panel_v", 0)), 2),
                "panel_i_ma": round(float(row.get("panel_i_ma", 0)), 2),
                "bat_v": round(float(row.get("bat_v", 0)), 2),
                "ldr": int(row.get("ldr", 0)),
                "estado": str(row.get("estado", ""))
            })
    
    cells = []
    
    def md(source):
        cells.append({
            "cell_type": "markdown",
            "metadata": {},
            "source": source if isinstance(source, list) else [source]
        })
    
    def code(source):
        cells.append({
            "cell_type": "code",
            "metadata": {},
            "source": source if isinstance(source, list) else [source],
            "execution_count": None,
            "outputs": []
        })
    
    # ── Celda 1: Título ──
    md([
        "# 🔬 SolarMonitor PV — Análisis Físico y Validación de Resultados\n",
        "\n",
        "**Universidad del Cauca — Física II**  \n",
        f"**Generado:** {datetime.now().strftime('%d de %B de %Y, %H:%M')}  \n",
        "**Proyecto:** Monitoreo Fotovoltaico en Tiempo Real — Parque Caldas, Popayán\n",
        "\n",
        "---\n",
        "\n",
        "Este notebook documenta los **tres requerimientos académicos** del proyecto:\n",
        "1. **Req 1:** Procesamiento de datos y modelado físico (Ley de Ohm, Potencia, Energía)\n",
        "2. **Req 2:** Análisis de eficiencia, cálculo de errores y modelado de descarga\n",
        "3. **Req 3:** Visualización y validación de resultados con gráficas"
    ])
    
    # ── Celda 2: Imports ──
    md(["## 📦 Importar Librerías\n", "Usamos Pandas, NumPy y Matplotlib como herramientas principales."])
    code([
        "import pandas as pd\n",
        "import numpy as np\n",
        "import matplotlib.pyplot as plt\n",
        "import matplotlib.ticker as mticker\n",
        "from IPython.display import display, Markdown\n",
        "\n",
        "# Configuración visual para las gráficas\n",
        "plt.style.use('dark_background')\n",
        "plt.rcParams['figure.figsize'] = (12, 5)\n",
        "plt.rcParams['font.size'] = 11\n",
        "print('✅ Librerías importadas correctamente')"
    ])
    
    # ── Celda 3: Datos de ejemplo ──
    md([
        "## 📊 Requerimiento 1.2 — Importar Dataset en Pandas\n",
        "\n",
        "Cargamos las lecturas del sensor IoT en un DataFrame de Pandas.\n",
        "Los datos se obtienen directamente de Firebase Realtime Database."
    ])
    
    sample_json = json.dumps(sample_data, indent=2, ensure_ascii=False)
    code([
        "# Datos reales del sensor IoT (muestra de 20 lecturas)\n",
        f"raw_data = {sample_json}\n",
        "\n",
        "# Crear DataFrame\n",
        "df = pd.DataFrame(raw_data)\n",
        "print(f'Total filas: {len(df)}')\n",
        "print(f'Columnas: {list(df.columns)}')\n",
        "display(df.head(10))"
    ])
    
    # ── Celda 4: Funciones físicas ──
    md([
        "## 📐 Requerimiento 1.1 — Funciones Físicas\n",
        "\n",
        "Implementamos las tres fórmulas fundamentales:\n",
        "- **Ley de Ohm:** $R = \\frac{V}{I}$\n",
        "- **Potencia:** $P = V \\times I$\n",
        "- **Energía:** $E = P \\times \\Delta t$"
    ])
    code([
        "# 1.1 Implementación de funciones físicas\n",
        "\n",
        "def ley_de_ohm(V, I_mA):\n",
        "    '''Calcula resistencia R = V / I (Ohms)'''\n",
        "    I_A = I_mA / 1000.0\n",
        "    return V / I_A if I_A > 0 else float('inf')\n",
        "\n",
        "def potencia(V, I_mA):\n",
        "    '''Calcula potencia P = V × I (mW)'''\n",
        "    return V * I_mA\n",
        "\n",
        "def energia(P_mW, dt_s=5.0):\n",
        "    '''Calcula energía E = P × Δt (Joules)'''\n",
        "    return P_mW * dt_s / 1000.0\n",
        "\n",
        "def efecto_joule(I_mA, R_ohm):\n",
        "    '''Pérdidas por calentamiento P_joule = I² × R (mW)'''\n",
        "    I_A = I_mA / 1000.0\n",
        "    if R_ohm == float('inf') or R_ohm <= 0: return 0\n",
        "    return (I_A ** 2) * R_ohm * 1000.0\n",
        "\n",
        "print('✅ Funciones físicas definidas')"
    ])
    
    # ── Celda 5: Procesamiento ──
    md([
        "## ⚙️ Requerimiento 1.3 — Procesar Variables\n",
        "\n",
        "Aplicamos las funciones físicas a todo el DataFrame usando `apply()`."
    ])
    code([
        "# 1.3 Calcular columnas derivadas\n",
        "df['resistencia_ohm'] = df.apply(lambda r: ley_de_ohm(r['panel_v'], r['panel_i_ma']), axis=1)\n",
        "df['potencia_mW'] = df.apply(lambda r: potencia(r['panel_v'], r['panel_i_ma']), axis=1)\n",
        "df['energia_J'] = df['potencia_mW'].apply(lambda p: energia(p, 5.0))\n",
        "df['joule_mW'] = df.apply(lambda r: efecto_joule(r['panel_i_ma'], r['resistencia_ohm']), axis=1)\n",
        "\n",
        "print(f'Energía total generada: {df[\"energia_J\"].sum():.2f} J')\n",
        "print(f'Potencia promedio: {df[\"potencia_mW\"].mean():.2f} mW')\n",
        "print(f'Resistencia promedio: {df.loc[df[\"resistencia_ohm\"] < float(\"inf\"), \"resistencia_ohm\"].mean():.2f} Ω')\n",
        "print(f'Pérdidas Joule totales: {df[\"joule_mW\"].sum():.2f} mW')\n",
        "\n",
        "display(df[['hora', 'panel_v', 'panel_i_ma', 'resistencia_ohm', 'potencia_mW', 'energia_J', 'joule_mW']].head(10))"
    ])
    
    # ── Celda 6: Limpieza ──
    md([
        "## 🧹 Requerimiento 1.4 — Limpiar Datos\n",
        "\n",
        "Aplicamos **interpolación lineal** para rellenar valores nulos y **media móvil** (rolling mean) para suavizar ruido."
    ])
    code([
        "# 1.4 Limpieza de datos\n",
        "df['panel_v_clean'] = df['panel_v'].interpolate().rolling(window=3, min_periods=1, center=True).mean()\n",
        "df['potencia_clean'] = df['potencia_mW'].interpolate().rolling(window=3, min_periods=1, center=True).mean()\n",
        "\n",
        "# Visualizar efecto de la limpieza\n",
        "fig, ax = plt.subplots(figsize=(12, 4))\n",
        "ax.plot(df.index, df['panel_v'], alpha=0.4, label='Voltaje Crudo', color='#FF6B6B')\n",
        "ax.plot(df.index, df['panel_v_clean'], linewidth=2, label='Voltaje Limpio (rolling mean)', color='#00D4FF')\n",
        "ax.set_xlabel('Lectura #')\n",
        "ax.set_ylabel('Voltaje (V)')\n",
        "ax.set_title('Efecto de la Limpieza de Datos (Media Móvil)')\n",
        "ax.legend()\n",
        "ax.grid(alpha=0.2)\n",
        "plt.tight_layout()\n",
        "plt.show()"
    ])
    
    # ── Celda 7: Eficiencia ──
    md([
        "## 📊 Requerimiento 2.1 — Cálculo de Eficiencia\n",
        "\n",
        "Eficiencia del convertidor: $\\eta = \\frac{P_{salida}}{P_{entrada}} \\times 100\\%$"
    ])
    code([
        "# 2.1 Eficiencia del convertidor (Panel → Batería)\n",
        "p_entrada = df['potencia_mW'].sum()\n",
        "p_salida = (df['bat_v'] * df.get('bat_i_ma', df.get('panel_i_ma', 0))).sum() if 'bat_v' in df.columns else 0\n",
        "\n",
        "if p_entrada > 0:\n",
        "    eficiencia = min(max((p_salida / p_entrada) * 100, 0), 100)\n",
        "else:\n",
        "    eficiencia = 0\n",
        "\n",
        "print(f'Potencia de entrada total: {p_entrada:.2f} mW')\n",
        "print(f'Potencia de salida total: {p_salida:.2f} mW')\n",
        "print(f'\\n⚡ Eficiencia del convertidor: {eficiencia:.2f}%')"
    ])
    
    # ── Celda 8: Error teórico ──
    md([
        "## 🎯 Requerimiento 2.2 — Cálculo de Errores\n",
        "\n",
        "Comparamos el voltaje teórico del panel (basado en el LDR) contra el valor medido.\n",
        "- **Voltaje Teórico:** $V_{teo} = 18V \\times (1 - \\frac{LDR}{1024})$\n",
        "- **Error Porcentual:** $\\epsilon = \\frac{|V_{teo} - V_{real}|}{V_{teo}} \\times 100\\%$"
    ])
    code([
        "# 2.2 Error teórico vs real\n",
        "df['teorico_v'] = 18.0 * (1.0 - (df['ldr'] / 1024.0).clip(0, 1))\n",
        "df['error_pct'] = np.where(\n",
        "    df['teorico_v'] > 0.5,\n",
        "    np.abs(df['teorico_v'] - df['panel_v']) / df['teorico_v'] * 100.0,\n",
        "    0\n",
        ")\n",
        "\n",
        "print(f'Error porcentual promedio: {df[\"error_pct\"].mean():.2f}%')\n",
        "print(f'Error máximo: {df[\"error_pct\"].max():.2f}%')\n",
        "\n",
        "# Gráfica\n",
        "fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))\n",
        "\n",
        "ax1.plot(df.index, df['teorico_v'], label='Teórico', color='#EF4444', linestyle='--', linewidth=2)\n",
        "ax1.plot(df.index, df['panel_v'], label='Real', color='#00D4FF', linewidth=2)\n",
        "ax1.set_title('Voltaje: Teórico vs Real')\n",
        "ax1.set_xlabel('Lectura #')\n",
        "ax1.set_ylabel('Voltaje (V)')\n",
        "ax1.legend()\n",
        "ax1.grid(alpha=0.2)\n",
        "\n",
        "ax2.bar(df.index, df['error_pct'], color='#F59E0B', alpha=0.7)\n",
        "ax2.axhline(y=df['error_pct'].mean(), color='red', linestyle='--', label=f'Promedio: {df[\"error_pct\"].mean():.1f}%')\n",
        "ax2.set_title('Error Porcentual por Lectura')\n",
        "ax2.set_xlabel('Lectura #')\n",
        "ax2.set_ylabel('Error (%)')\n",
        "ax2.legend()\n",
        "ax2.grid(alpha=0.2)\n",
        "\n",
        "plt.tight_layout()\n",
        "plt.show()"
    ])
    
    # ── Celda 9: Regresión de descarga ──
    md([
        "## 🔋 Requerimiento 2.3 — Modelar Descarga de Batería\n",
        "\n",
        "Usamos regresión lineal con `np.polyfit` para modelar la caída de voltaje.\n",
        "- **Modelo:** $V(t) = m \\cdot t + b$\n",
        "- **R²:** Coeficiente de determinación"
    ])
    code([
        "# 2.3 Regresión lineal de descarga\n",
        "# Usamos voltaje de batería como ejemplo\n",
        "X = np.arange(len(df)).astype(float)\n",
        "y = df['bat_v'].values\n",
        "\n",
        "if len(X) > 1 and np.std(X) > 0 and np.std(y) > 0:\n",
        "    slope, intercept = np.polyfit(X, y, 1)\n",
        "    y_pred = slope * X + intercept\n",
        "    ss_res = np.sum((y - y_pred)**2)\n",
        "    ss_tot = np.sum((y - np.mean(y))**2)\n",
        "    r2 = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0\n",
        "    \n",
        "    print(f'Pendiente (slope): {slope:.4f} V/lectura')\n",
        "    print(f'Intercepto: {intercept:.4f} V')\n",
        "    print(f'R²: {r2:.4f}')\n",
        "    \n",
        "    fig, ax = plt.subplots(figsize=(12, 5))\n",
        "    ax.scatter(X, y, alpha=0.5, s=15, color='#A78BFA', label='Datos reales')\n",
        "    ax.plot(X, y_pred, color='#EF4444', linewidth=2, linestyle='--', label=f'Regresión (R²={r2:.3f})')\n",
        "    ax.set_title('Regresión Lineal — Voltaje de Batería')\n",
        "    ax.set_xlabel('Lectura #')\n",
        "    ax.set_ylabel('Voltaje Batería (V)')\n",
        "    ax.legend()\n",
        "    ax.grid(alpha=0.2)\n",
        "    plt.tight_layout()\n",
        "    plt.show()\n",
        "else:\n",
        "    print('⚠️ Datos insuficientes para regresión')"
    ])
    
    # ── Celda 10: Caídas de tensión ──
    md([
        "## ⚡ Requerimiento 2.4 — Detectar Pérdidas y Caídas\n",
        "\n",
        "Usamos `np.gradient()` para calcular la derivada discreta $\\frac{dV}{dt}$ y detectar caídas abruptas."
    ])
    code([
        "# 2.4 Detección de caídas de tensión\n",
        "v_array = df['panel_v'].values\n",
        "dV = np.gradient(v_array)\n",
        "\n",
        "threshold = -1.5  # Umbral de caída brusca\n",
        "drops = np.where(dV < threshold)[0]\n",
        "\n",
        "print(f'Caídas bruscas detectadas: {len(drops)}')\n",
        "for idx in drops:\n",
        "    print(f'  → Lectura #{idx}: ΔV = {dV[idx]:.2f}V (de {v_array[max(0,idx-1)]:.2f}V a {v_array[idx]:.2f}V)')\n",
        "\n",
        "# Gráfica del gradiente\n",
        "fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 7), sharex=True)\n",
        "\n",
        "ax1.plot(v_array, color='#00D4FF', linewidth=1.5, label='Voltaje Panel')\n",
        "if len(drops) > 0:\n",
        "    ax1.scatter(drops, v_array[drops], color='#EF4444', s=50, zorder=5, label='Caídas detectadas')\n",
        "ax1.set_ylabel('Voltaje (V)')\n",
        "ax1.set_title('Voltaje del Panel Solar')\n",
        "ax1.legend()\n",
        "ax1.grid(alpha=0.2)\n",
        "\n",
        "ax2.fill_between(range(len(dV)), dV, alpha=0.3, color='#F59E0B')\n",
        "ax2.plot(dV, color='#F59E0B', linewidth=1)\n",
        "ax2.axhline(y=threshold, color='#EF4444', linestyle='--', label=f'Umbral ({threshold}V)')\n",
        "ax2.set_xlabel('Lectura #')\n",
        "ax2.set_ylabel('dV/dt')\n",
        "ax2.set_title('Derivada Discreta del Voltaje (np.gradient)')\n",
        "ax2.legend()\n",
        "ax2.grid(alpha=0.2)\n",
        "\n",
        "plt.tight_layout()\n",
        "plt.show()"
    ])
    
    # ── Celda 11: Efecto Joule ──
    md([
        "## 🔥 Efecto Joule — Pérdidas por Calentamiento\n",
        "\n",
        "Las pérdidas por calentamiento se calculan con:\n",
        "$P_{joule} = I^2 \\times R$\n",
        "\n",
        "Esto representa la energía disipada como calor en los conductores."
    ])
    code([
        "# Pérdidas por Efecto Joule\n",
        "joule = df['joule_mW']\n",
        "joule_valido = joule[joule > 0]\n",
        "\n",
        "print(f'Pérdidas totales por Efecto Joule: {joule_valido.sum():.2f} mW')\n",
        "print(f'Promedio de pérdidas: {joule_valido.mean():.3f} mW')\n",
        "print(f'Máxima pérdida registrada: {joule_valido.max():.3f} mW')\n",
        "\n",
        "fig, ax = plt.subplots(figsize=(12, 4))\n",
        "ax.fill_between(df.index, df['joule_mW'], alpha=0.4, color='#EF4444')\n",
        "ax.plot(df.index, df['joule_mW'], color='#EF4444', linewidth=1.5, label='P_joule = I²R')\n",
        "ax.set_xlabel('Lectura #')\n",
        "ax.set_ylabel('Pérdida (mW)')\n",
        "ax.set_title('Pérdidas por Efecto Joule en el Panel Solar')\n",
        "ax.legend()\n",
        "ax.grid(alpha=0.2)\n",
        "plt.tight_layout()\n",
        "plt.show()"
    ])
    
    # ── Celda 12: Resumen estadístico ──
    md([
        "## 📋 Requerimiento 3.2 — Tabla Resumen con DataFrames\n",
        "\n",
        "Exportamos un resumen estadístico usando `groupby()` y `agg()` de Pandas."
    ])
    code([
        "# 3.2 Tabla resumen estadística\n",
        "resumen = pd.DataFrame({\n",
        "    'Métrica': [\n",
        "        'Voltaje Promedio (V)', 'Voltaje Máximo (V)', 'Voltaje Mínimo (V)',\n",
        "        'Potencia Promedio (mW)', 'Potencia Máxima (mW)',\n",
        "        'Energía Total (J)', 'Resistencia Prom (Ω)',\n",
        "        'Error Promedio (%)', 'Pérdida Joule Total (mW)',\n",
        "        'Desv. Estándar V', 'Desv. Estándar P'\n",
        "    ],\n",
        "    'Valor': [\n",
        "        f'{df[\"panel_v\"].mean():.2f}', f'{df[\"panel_v\"].max():.2f}', f'{df[\"panel_v\"].min():.2f}',\n",
        "        f'{df[\"potencia_mW\"].mean():.2f}', f'{df[\"potencia_mW\"].max():.2f}',\n",
        "        f'{df[\"energia_J\"].sum():.2f}',\n",
        "        f'{df.loc[df[\"resistencia_ohm\"] < float(\"inf\"), \"resistencia_ohm\"].mean():.2f}',\n",
        "        f'{df[\"error_pct\"].mean():.2f}', f'{joule_valido.sum():.2f}',\n",
        "        f'{np.std(df[\"panel_v\"].values):.3f}', f'{np.std(df[\"potencia_mW\"].values):.3f}'\n",
        "    ]\n",
        "})\n",
        "\n",
        "display(resumen.style.set_properties(**{'text-align': 'center'}).set_caption('Resumen Estadístico del Panel Solar'))"
    ])
    
    # ── Celda 13: Conclusiones ──
    md([
        "## ✅ Conclusiones\n",
        "\n",
        "1. Se implementaron exitosamente las **funciones físicas** (Ley de Ohm, Potencia, Energía, Efecto Joule)\n",
        "2. Los datasets se importaron y procesaron usando **Pandas DataFrames**\n",
        "3. Se aplicaron técnicas de **limpieza de datos** (interpolación, media móvil)\n",
        "4. El cálculo de **eficiencia** muestra el rendimiento del convertidor\n",
        "5. El **error porcentual** entre el modelo teórico y el real fue cuantificado\n",
        "6. La **regresión lineal** permite predecir la autonomía de la batería\n",
        "7. Las **caídas de tensión** se detectaron usando derivadas discretas\n",
        "8. Las **pérdidas por Efecto Joule** fueron cuantificadas\n",
        "\n",
        "---\n",
        "*Notebook generado automáticamente por SolarMonitor PV — Universidad del Cauca*"
    ])
    
    # Construir estructura del notebook
    notebook = {
        "nbformat": 4,
        "nbformat_minor": 5,
        "metadata": {
            "kernelspec": {
                "display_name": "Python 3",
                "language": "python",
                "name": "python3"
            },
            "language_info": {
                "name": "python",
                "version": "3.11.0",
                "mimetype": "text/x-python",
                "file_extension": ".py"
            }
        },
        "cells": cells
    }
    
    # Serializar a BytesIO
    buf = io.BytesIO()
    content = json.dumps(notebook, indent=2, ensure_ascii=False)
    buf.write(content.encode('utf-8'))
    buf.seek(0)
    return buf
