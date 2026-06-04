import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = 'http://localhost:5000/api';

export interface Req1Modelado {
  total_registros: number;
  energia_total_j: number;
  potencia_promedio_mw: number;
  resistencia_promedio_ohm: number;
  potencia_max_mw: number;
  voltaje_max_v: number;
  corriente_max_ma: number;
}

export interface CaidaTension {
  hora: string;
  v_anterior: number;
  v_actual: number;
  caida: number;
  dv_dt: number;
}

export interface EfectoJoule {
  total_perdidas_mw: number;
  promedio_mw: number;
  max_mw: number;
  registros_con_perdida: number;
  formula: string;
}

export interface ScatterPoint {
  t_hours: number;
  bat_v: number;
  regression_v: number;
  hora: string;
}

export interface Req2Eficiencia {
  eficiencia_convertidor_pct: number;
  error_voltaje_promedio_pct: number;
  descarga_slope: number;
  descarga_intercept: number;
  descarga_r2: number;
  scatter_data: ScatterPoint[];
  caidas_tension: CaidaTension[];
  efecto_joule: EfectoJoule;
}

export interface GraficaComparativa {
  hora: string;
  real_v: number;
  teorico_v: number;
  real_p: number;
  teorico_p: number;
}

export interface TablaResumen {
  fecha: string;
  v_mean: number;
  v_max: number;
  v_min: number;
  v_std: number;
  p_mean: number;
  p_max: number;
  error_mean: number;
  joule_total: number;
}

export interface Req3Visualizacion {
  grafica_comparativa: GraficaComparativa[];
  tabla_resumen: TablaResumen[];
  estabilidad_v_std: number;
  estabilidad_p_std: number;
}

export interface Req3Data {
  status: string;
  message?: string;
  req1_modelado: Req1Modelado;
  req2_eficiencia: Req2Eficiencia;
  req3_visualizacion: Req3Visualizacion;
  doc: string;
}

export function useReq3(pollIntervalMs: number = 60000) {
  const [data, setData] = useState<Req3Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/req3-analysis`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.status === "error") throw new Error(json.message);
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    if (pollIntervalMs > 0) {
      const interval = setInterval(fetchData, pollIntervalMs);
      return () => clearInterval(interval);
    }
  }, [fetchData, pollIntervalMs]);

  return { data, loading, error, refresh: fetchData };
}
