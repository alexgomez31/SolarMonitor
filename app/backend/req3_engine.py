import pandas as pd
import numpy as np
import traceback

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

# 2.3 Modelar descarga
def model_battery_discharge(df):
    """Generar regresión de autonomía de batería."""
    if df.empty: return {"slope": 0, "intercept": 0, "r2": 0}
    
    discharging_df = df[df['estado'] == 'DESCARGANDO'].copy()
    if len(discharging_df) < 5:
        return {"slope": 0, "intercept": 0, "r2": 0, "msg": "Datos insuficientes"}
        
    # Variables X (tiempo en horas desde inicio) e Y (voltaje)
    t0 = discharging_df['timestamp'].iloc[0]
    discharging_df['t_hours'] = (discharging_df['timestamp'] - t0).dt.total_seconds() / 3600.0
    
    X = discharging_df['t_hours'].values
    y = discharging_df['bat_v'].values
    
    # Regresión Lineal (NumPy)
    if len(X) > 1 and np.std(X) > 0:
        slope, intercept = np.polyfit(X, y, 1)
        # R^2
        y_pred = slope * X + intercept
        ss_res = np.sum((y - y_pred)**2)
        ss_tot = np.sum((y - np.mean(y))**2)
        r2 = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0
        return {"slope": slope, "intercept": intercept, "r2": r2}
    return {"slope": 0, "intercept": 0, "r2": 0}

# 2.4 Detectar pérdidas
def detect_voltage_drops(df):
    """Identificar caídas de tensión mediante análisis de arrays de NumPy."""
    if df.empty or len(df) < 2: return []
    
    # Usar np.diff para calcular el gradiente de voltaje
    v_array = df['panel_v'].values
    dV = np.diff(v_array)
    
    # Definir un umbral de caída brusca (ej. -2.0V de una lectura a otra)
    threshold = -2.0
    drop_indices = np.where(dV < threshold)[0]
    
    drops = []
    for idx in drop_indices:
        drops.append({
            "hora": df['hora'].iloc[idx+1],
            "v_anterior": round(float(v_array[idx]), 2),
            "v_actual": round(float(v_array[idx+1]), 2),
            "caida": round(float(dV[idx]), 2)
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
        
        # Req 3.1: Datos para gráficas comparativas
        # Tomaremos los últimos 60 registros para la gráfica para no sobrecargar
        df_plot = df.tail(60).copy()
        comparative_data = []
        for _, row in df_plot.iterrows():
            comparative_data.append({
                "hora": row["hora"],
                "real_v": round(float(row["panel_v_clean"]), 2),
                "teorico_v": round(float(row["teorico_v"]), 2),
                "real_p": round(float(row["panel_p_mw_clean"]), 2),
                "teorico_p": round(float(row["teorico_p_mw"]), 2)
            })
            
        # Req 3.2: Exportar tablas resumen estadísticas
        # Agrupar por día y sacar medias, maximos y minimos
        stats_df = df.groupby('fecha').agg({
            'panel_v': ['mean', 'max'],
            'calc_potencia_mw': ['mean', 'max'],
            'error_v_pct': ['mean']
        }).reset_index()
        
        stats_list = []
        for _, row in stats_df.iterrows():
            stats_list.append({
                "fecha": str(row[('fecha', '')]),
                "v_mean": round(float(row[('panel_v', 'mean')]), 2),
                "v_max": round(float(row[('panel_v', 'max')]), 2),
                "p_mean": round(float(row[('calc_potencia_mw', 'mean')]), 2),
                "p_max": round(float(row[('calc_potencia_mw', 'max')]), 2),
                "error_mean": round(float(row[('error_v_pct', 'mean')]), 1),
            })
            
        # Req 3.3: Analizar estabilidad (Desviación estándar con NumPy)
        v_std = round(float(np.std(df['panel_v'].values)), 2)
        p_std = round(float(np.std(df['calc_potencia_mw'].values)), 2)
        
        # Armar el payload JSON final
        return {
            "status": "success",
            "req1_modelado": {
                "total_registros": len(df),
                "energia_total_j": round(float(df['calc_energia_j'].sum()), 2),
                "potencia_promedio_mw": round(float(df['calc_potencia_mw'].mean()), 2),
                "resistencia_promedio_ohm": round(float(df.loc[df['resistencia_ohm'] < float('inf'), 'resistencia_ohm'].mean()), 2)
            },
            "req2_eficiencia": {
                "eficiencia_convertidor_pct": round(efficiency, 2),
                "error_voltaje_promedio_pct": round(float(df['error_v_pct'].mean()), 2),
                "descarga_slope": round(discharge_model["slope"], 4),
                "descarga_r2": round(discharge_model["r2"], 4),
                "caidas_tension": voltage_drops
            },
            "req3_visualizacion": {
                "grafica_comparativa": comparative_data,
                "tabla_resumen": stats_list,
                "estabilidad_v_std": v_std,
                "estabilidad_p_std": p_std
            },
            "doc": "El script `req3_engine.py` utiliza Pandas para la manipulación y limpieza de los datasets (Req 1.2, 1.4), aplica la Ley de Ohm y fórmulas de Potencia/Energía vía apply() (Req 1.1, 1.3). Calcula eficiencia y error teórico (Req 2.1, 2.2), usa regresión lineal de NumPy (polyfit) para la descarga (Req 2.3) y np.diff() para detectar pérdidas (Req 2.4). Finalmente, exporta los DataFrames agrupados para las gráficas comparativas en React (Req 3.1, 3.2, 3.3)."
        }
    except Exception as e:
        traceback.print_exc()
        return {"status": "error", "message": f"Error procesando análisis Req 3: {str(e)}"}
