// =============================================================================
// SolarMonitor PV — useAI Hook
// Consume el endpoint /api/ai-analysis del backend Flask
// =============================================================================

import { useState, useEffect, useCallback } from "react";

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface HealthScore {
  score: number;
  grade: string;
  color: string;
  autonomy_hrs: number;
  avg_efficiency: number;
  components: {
    stability: number;
    efficiency: number;
    anomalies: number;
    activity: number;
  };
  data_points: number;
}

export interface Anomaly {
  timestamp: string;
  hora: string;
  fecha: string;
  ldr: number;
  voltage: number;
  current_mA: number;
  power_mW: number;
  z_score: number;
  severity: "warning" | "critical";
  description: string;
}

export interface AnomalyDetection {
  anomalies: Anomaly[];
  total: number;
  pct: number;
}

export interface ClusterPoint {
  timestamp: string;
  hora: string;
  ldr: number;
  power_mW: number;
  cluster: number;
  cluster_name: string;
  cluster_color: string;
}

export interface ClusterCentroid {
  cluster: number;
  name: string;
  color: string;
  ldr_center: number;
  power_center: number;
  count: number;
}

export interface Clustering {
  points: ClusterPoint[];
  centroids: ClusterCentroid[];
  labels: Record<string, string>;
}

export interface CorrelationMatrix {
  matrix: Record<string, Record<string, { r: number; p: number }>>;
  insights: { var1: string; var2: string; r: number; description: string }[];
}

export interface PredictionCurvePoint {
  ldr: number;
  predicted: number;
  upper: number;
  lower: number;
}

export interface PowerPrediction {
  curve: PredictionCurvePoint[];
  model_score: number;
  model_score_pct: number;
  current_ldr: number;
  current_prediction: number;
  current_real: number;
  std_error: number;
  ldr_range: [number, number];
}

export interface TrendPoint {
  timestamp: string;
  hora: string;
  power_mW: number;
  trend: number;
}

export interface TrendAnalysis {
  trend: "increasing" | "decreasing" | "stable" | "insufficient_data" | "no_active_data";
  trend_label: string;
  slope: number;
  r2: number;
  trend_line: TrendPoint[];
}

export interface HourlyPoint {
  hour: number;
  hour_label: string;
  avg_power: number;
  max_power: number;
  min_power: number;
  count: number;
}

export interface HourlyProfile {
  profile: HourlyPoint[];
  peak_hour: HourlyPoint | null;
  total_hours: number;
}

export interface EnergyBalancePoint {
  hora: string;
  timestamp: string;
  panel_mW: number;
  bateria_mW: number;
  balance: number;
  estado: string;
}

export interface EnergyBalance {
  balance_points: EnergyBalancePoint[];
  summary: {
    avg_panel_mW: number;
    max_panel_mW: number;
    avg_bat_mW: number;
    total_energy_panel_mWh: number;
    total_energy_bat_mWh: number;
  };
  charging_pct: number;
  discharging_pct: number;
  equilibrium_pct: number;
}

export interface AutonomyProfile {
  id: string;
  name: string;
  description: string;
  color: string;
  consumption_mA: number;
  consumption_mW: number;
  autonomy_hrs: number;
  autonomy_label: string;
}

export interface AutonomyAnalysis {
  battery_spec: {
    model: string;
    voltage_V: number;
    capacity_mAh: number;
    capacity_mWh: number;
  };
  profiles: AutonomyProfile[];
  measured_stats: {
    avg_mA: number;
    max_mA: number;
    min_mA: number;
    std_mA: number;
    samples: number;
  };
  hourly_consumption: {
    hour: number;
    hour_label: string;
    avg_consumption_mA: number;
    max_consumption_mA: number;
  }[];
  charge_estimate: {
    avg_charge_current_mA: number;
    full_charge_hrs: number;
    full_charge_label: string;
  };
}

export interface AIAnalysis {
  status: "ok" | "insufficient_data" | "error";
  data_points: number;
  generated_at: string;
  health_score: HealthScore;
  anomaly_detection: AnomalyDetection;
  clustering: Clustering;
  correlation: CorrelationMatrix;
  power_prediction: PowerPrediction;
  trend_analysis: TrendAnalysis;
  hourly_profile: HourlyProfile;
  energy_balance: EnergyBalance;
  autonomy: AutonomyAnalysis;
  message?: string;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

const API_BASE =
  import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : "http://localhost:5000/api";

export function useAI(autoRefreshMs = 60_000) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetch_ai = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`${API_BASE}/ai-analysis`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: AIAnalysis = await res.json();
      setAnalysis(data);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_ai();
    const id = setInterval(fetch_ai, autoRefreshMs);
    return () => clearInterval(id);
  }, [fetch_ai, autoRefreshMs]);

  return { analysis, loading, error, lastUpdated, refresh: fetch_ai };
}
