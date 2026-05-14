// =============================================================================
// SolarMonitor PV - Hook para datos en tiempo real
// =============================================================================

import { useState, useEffect, useRef, useCallback } from 'react';


// =============================================================================
// INTERFACES
// =============================================================================

export interface PowerData {
  voltaje_V: number;
  corriente_mA: number;
  potencia_mW: number;
}

export interface SolarData {
  // Datos reales del Arduino
  ldr: number;
  estadoFotocelda: string;  // "LUZ" | "OSCURIDAD"
  estadoLuces: string;      // "ENCENDIDAS" | "APAGADAS"
  estado: string;      // "CARGANDO" | "EQUILIBRIO" | "DESCARGANDO" | "DESCONOCIDO"
  hora: string | null;
  panel: PowerData;
  bateria: PowerData;
  // Timestamps
  server_timestamp:  string | null;
  circuit_timestamp: string | null;
  // Flags de conexión
  firebase_connected: boolean;
  circuit_connected:  boolean;
  connected: boolean;
  // Control de polling
  polling_active: boolean;
  // Retrocompat
  timestamp: string | null;
}

export interface SystemStatus {
  firebase_connected:  boolean;
  circuit_connected:   boolean;
  firebase_url:        string;
  server_last_check:   string | null;
  circuit_last_data:   string | null;
  circuit_last_hora:   string | null;
  circuit_last_fecha:  string | null;
  circuit_timeout_sec: number;
  location: string;
  hardware: string;
}

export interface HistoryData {
  timestamp: string;
  ldr: number;
  estadoFotocelda: string;
  estadoLuces: string;
  estado: string;
  hora: string;
  fecha: string;
  panel: PowerData;
  bateria: PowerData;
}

export interface DayReading {
  timestamp:  string;
  hora:       string;
  ldr:              number;
  estadoFotocelda:  string;
  estadoLuces:      string;
  estado:     string;
  panel:      PowerData;
  bateria:    PowerData;
}

export interface DayStats {
  fecha:      string;
  count:      number;
  ldr:        { max: number; avg: number };
  encendidos: number;
  readings:   DayReading[];
}

export interface DailySummary {
  [fecha: string]: DayStats;
}

export interface LedSegment {
  estado: 'ENCENDIDAS' | 'APAGADAS';
  hora_inicio: string;
  hora_fin: string;
  duracion_min: number;
}

export interface LedDayAnalysis {
  segmentos: LedSegment[];
  encendidos_count: number;
  total_encendido_min: number;
  total_apagado_min: number;
}

export interface LedAnalysis {
  [fecha: string]: LedDayAnalysis;
}

export interface RealtimePoint {
  timestamp: string;
  value: number;
}

export interface WeatherData {
  temperature_2m: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  precipitation: number;
  weather_code: number;
  cloud_cover: number;
  wind_speed_10m: number;
  is_day: number;
  last_updated: string | null;
}

// =============================================================================
// CONFIGURACIÓN
// =============================================================================

const API_BASE_URL      = 'http://localhost:5000/api';
const REFRESH_INTERVAL  = 5000;   // 5 s (reducido de 2s para ahorrar cuota)
const REALTIME_BUFFER   = 120;    // 4 min de puntos (120 × 5 s)


// =============================================================================
// HOOK - Dato más reciente en tiempo real
// =============================================================================

export function useSolarData() {
  const [data, setData] = useState<SolarData>({
    ldr: 0,
    estadoFotocelda: 'LUZ',
    estadoLuces: 'APAGADAS',
    estado: 'DESCONOCIDO',
    hora: null,
    panel:   { voltaje_V: 0, corriente_mA: 0, potencia_mW: 0 },
    bateria: { voltaje_V: 0, corriente_mA: 0, potencia_mW: 0 },
    server_timestamp: null, circuit_timestamp: null,
    firebase_connected: false, circuit_connected: false,
    connected: false, polling_active: true, timestamp: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [togglingPolling, setTogglingPolling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/data`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d: SolarData = await res.json();
      // retrocompat: mapear timestamp antiguo
      d.timestamp = d.server_timestamp;
      setData(d);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, REFRESH_INTERVAL);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchData]);

  /** Llama a POST /api/polling para activar o pausar el polling en el backend */
  const togglePolling = useCallback(async () => {
    setTogglingPolling(true);
    try {
      const res = await fetch(`${API_BASE_URL}/polling`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !data.polling_active }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Refrescar el estado inmediatamente
      await fetchData();
    } catch (err) {
      console.error('[togglePolling] Error:', err);
    } finally {
      setTogglingPolling(false);
    }
  }, [data.polling_active, fetchData]);

  return { data, loading, error, refresh: fetchData, togglePolling, togglingPolling };
}

// =============================================================================
// HOOK - Buffer de tiempo real para gráficas (acumula puntos cada 2 s)
// =============================================================================

export function useRealtimeBuffer(data: SolarData) {
  const [ldrBuffer, setLdrBuffer] = useState<RealtimePoint[]>([]);
  const [panelVBuffer, setPanelVBuffer] = useState<RealtimePoint[]>([]);
  const [batteryVBuffer, setBatteryVBuffer] = useState<RealtimePoint[]>([]);

  useEffect(() => {
    const ts = new Date().toISOString();
    const isOk = data.circuit_connected;
    
    const ldrVal = isOk ? data.ldr : 0;
    const pVVal = isOk ? data.panel.voltaje_V : 0;
    const bVVal = isOk ? data.bateria.voltaje_V : 0;

    setLdrBuffer(prev => [...prev, { timestamp: ts, value: ldrVal }].slice(-REALTIME_BUFFER));
    setPanelVBuffer(prev => [...prev, { timestamp: ts, value: pVVal }].slice(-REALTIME_BUFFER));
    setBatteryVBuffer(prev => [...prev, { timestamp: ts, value: bVVal }].slice(-REALTIME_BUFFER));
  }, [data.server_timestamp]);

  return { ldrBuffer, panelVBuffer, batteryVBuffer };
}

// =============================================================================
// HOOK - Historial completo de Firebase
// =============================================================================

export function useAvailableDates() {
  const [dates, setDates] = useState<string[]>([]);
  
  useEffect(() => {
    const fetchDates = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/available-dates`);
        if (res.ok) setDates(await res.json());
      } catch (err) {}
    };
    fetchDates();
  }, []);
  
  return dates;
}

export function useHistoryData(date?: string | null) {
  const [history, setHistory] = useState<HistoryData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const url = date && date !== 'ALL' ? `${API_BASE_URL}/history?date=${date}` : `${API_BASE_URL}/history`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setHistory(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchHistory();
    // Quitamos el auto-refresh aquí para evitar llamadas masivas a Firebase
    // Solo se llama 1 sola vez por fecha seleccionada o si le da click en Actualizar.
  }, [fetchHistory]);

  return { history, loading, error, refresh: fetchHistory };
}

// =============================================================================
// HOOK - Resumen diario (para gráficas comparativas por días)
// =============================================================================

export function useDailySummary() {
  const [summary, setSummary] = useState<DailySummary>({});
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/daily-summary`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSummary(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
    const iv = setInterval(fetchSummary, 120_000); // refrescar cada 2 min
    return () => clearInterval(iv);
  }, [fetchSummary]);

  return { summary, loading, error, refresh: fetchSummary };
}

// =============================================================================
// HOOK - Análisis LED por día
// =============================================================================

export function useLedAnalysis() {
  const [analysis, setAnalysis] = useState<LedAnalysis>({});
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const fetchAnalysis = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/led-analysis`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAnalysis(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalysis();
    const iv = setInterval(fetchAnalysis, 60_000);
    return () => clearInterval(iv);
  }, [fetchAnalysis]);

  return { analysis, loading, error, refresh: fetchAnalysis };
}

// =============================================================================
// HOOK - Estadísticas (sobre historial)
// =============================================================================

export function useSolarStats(_data: SolarData, history: HistoryData[]) {
  const stats = {
    ldrMax: 0, ldrMin: 0, ldrAvg: 0,
    totalEncendidos: 0, pctEncendido: 0,
  };

  if (history.length > 0) {
    const ldrs = history.map(h => h.ldr);
    stats.ldrMax = Math.max(...ldrs);
    stats.ldrMin = Math.min(...ldrs);
    stats.ldrAvg = ldrs.reduce((a, b) => a + b, 0) / ldrs.length;
    stats.totalEncendidos = history.filter(h => h.estadoLuces === 'ENCENDIDAS').length;
    stats.pctEncendido = Math.round((stats.totalEncendidos / history.length) * 100);
  }

  return stats;
}

// =============================================================================
// HOOK - Clima actual
// =============================================================================

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWeather = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/weather`);
      if (res.ok) setWeather(await res.json());
    } catch (err) {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWeather();
    const iv = setInterval(fetchWeather, 900_000); // 15 min
    return () => clearInterval(iv);
  }, [fetchWeather]);

  return { weather, loading, refresh: fetchWeather };
}

export default useSolarData;
