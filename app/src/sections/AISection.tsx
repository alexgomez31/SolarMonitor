// =============================================================================
// SolarMonitor PV — AISection
// Módulo de Analítica Inteligente con Machine Learning
// =============================================================================

import { useAI } from "../hooks/useAI";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid,
  Tooltip, ScatterChart, Scatter, BarChart, Bar, Cell,
  ComposedChart, Line, ReferenceLine, Area, PieChart, Pie,
} from "recharts";
import { useState, useEffect, useRef } from "react";

// ── Animación del Score Circular ─────────────────────────────────────────────
function HealthGauge({ score, grade, color }: { score: number; grade: string; color: string }) {
  const [displayed, setDisplayed] = useState(0);
  const animRef = useRef<number>(null);

  useEffect(() => {
    const duration = 1500;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(score * ease));
      if (progress < 1) animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [score]);

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayed / 100) * circumference;

  return (
    <div className="ai-gauge-wrap">
      <svg width="200" height="200" viewBox="0 0 200 200">
        {/* Track */}
        <circle cx="100" cy="100" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14" />
        {/* Glow ring */}
        <circle
          cx="100" cy="100" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 100 100)"
          style={{ transition: "stroke-dashoffset 0.1s ease", filter: `drop-shadow(0 0 8px ${color})` }}
        />
        {/* Score text */}
        <text x="100" y="95" textAnchor="middle" fill="white" fontSize="36" fontWeight="800" fontFamily="Inter">
          {displayed}
        </text>
        <text x="100" y="118" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="12" fontFamily="Inter">
          / 100
        </text>
      </svg>
      <p className="ai-gauge-grade" style={{ color }}>{grade}</p>
    </div>
  );
}

// ── Badge de severidad ────────────────────────────────────────────────────────
function SeverityBadge({ severity }: { severity: "warning" | "critical" }) {
  return (
    <span className={`ai-badge ai-badge--${severity}`}>
      {severity === "critical" ? "⚠ Crítico" : "◉ Alerta"}
    </span>
  );
}

// ── Tooltip personalizado ─────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="ai-tooltip">
      <p className="ai-tooltip__label">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <strong>{typeof p.value === "number" ? p.value.toFixed(2) : p.value}</strong>
        </p>
      ))}
    </div>
  );
}

// ── Mapa de Calor de Correlaciones ───────────────────────────────────────────
function CorrelationHeatmap({ matrix }: { matrix: Record<string, Record<string, { r: number; p: number }>> }) {
  const vars = ["voltage", "current_mA", "power_mW", "ldr"];
  const labels: Record<string, string> = {
    voltage: "Voltaje", current_mA: "Corriente", power_mW: "Potencia", ldr: "LDR"
  };

  const getColor = (r: number) => {
    const abs = Math.abs(r);
    if (r > 0) return `rgba(16, 185, 129, ${0.15 + abs * 0.85})`;
    return `rgba(239, 68, 68, ${0.15 + abs * 0.85})`;
  };

  return (
    <div className="ai-heatmap">
      <div className="ai-heatmap__grid" style={{ gridTemplateColumns: `80px repeat(${vars.length}, 1fr)` }}>
        {/* Header row */}
        <div />
        {vars.map(v => (
          <div key={v} className="ai-heatmap__col-header">{labels[v]}</div>
        ))}
        {/* Data rows */}
        {vars.map(v1 => (
          <>
            <div key={`row-${v1}`} className="ai-heatmap__row-header">{labels[v1]}</div>
            {vars.map(v2 => {
              const val = matrix[v1]?.[v2]?.r ?? 0;
              return (
                <div
                  key={`${v1}-${v2}`}
                  className="ai-heatmap__cell"
                  style={{ background: getColor(val) }}
                  title={`${labels[v1]} vs ${labels[v2]}: r=${val.toFixed(3)}`}
                >
                  <span style={{ color: "white", fontWeight: 700, fontSize: "0.85rem" }}>
                    {val.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </>
        ))}
      </div>
      <div className="ai-heatmap__legend">
        <span style={{ color: "#EF4444" }}>■ Negativa</span>
        <span style={{ color: "rgba(255,255,255,0.4)" }}>◼ Nula</span>
        <span style={{ color: "#10B981" }}>■ Positiva</span>
      </div>
    </div>
  );
}

// ── Score de componentes (radar) ──────────────────────────────────────────────
function ComponentsRadar({ components }: { components: Record<string, number> }) {
  const data = [
    { subject: "Estabilidad", value: components.stability },
    { subject: "Eficiencia",  value: components.efficiency },
    { subject: "Sin Anomalías", value: components.anomalies },
    { subject: "Actividad",   value: components.activity },
  ];
  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={data}>
        <PolarGrid stroke="rgba(255,255,255,0.1)" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
        <Radar name="Score" dataKey="value" stroke="#00D4FF" fill="#00D4FF" fillOpacity={0.15}
          strokeWidth={2} dot={{ r: 4, fill: "#00D4FF" }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function AISkeleton() {
  return (
    <div className="ai-skeleton-wrap">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="ai-skeleton-card">
          <div className="ai-skeleton-line ai-skeleton-line--title" />
          <div className="ai-skeleton-line ai-skeleton-line--body" />
          <div className="ai-skeleton-line ai-skeleton-line--body" style={{ width: "70%" }} />
        </div>
      ))}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function AISection() {
  const { analysis, loading, error, lastUpdated, refresh } = useAI(60_000);
  const [activeTab, setActiveTab] = useState<
    "health" | "prediction" | "clusters" | "anomalies" | "correlation" | "hourly" | "energy"
  >("health");

  const tabs = [
    { id: "health",      label: "🏥 Salud",       title: "Score de Salud" },
    { id: "prediction",  label: "🔮 Predicción",  title: "Modelo Predictivo" },
    { id: "clusters",    label: "☀️ Clusters",    title: "Clasificación K-Means" },
    { id: "anomalies",   label: "⚠️ Anomalías",   title: "Detección de Anomalías" },
    { id: "correlation", label: "🔗 Correlaciones",title: "Matriz de Correlación" },
    { id: "hourly",      label: "🕐 Perfil",       title: "Perfil Horario" },
    { id: "energy",      label: "🔋 Energía",      title: "Balance Energético" },
  ] as const;

  return (
    <section id="ai" className="ai-section">
      {/* ── Header ── */}
      <div className="ai-section__header">
        <div className="ai-section__badge">
          <span className="ai-badge-pulse" />
          INTELIGENCIA ARTIFICIAL
        </div>
        <h2 className="ai-section__title">
          <span className="ai-gradient-text">SolarAI Analytics</span>
        </h2>
        <p className="ai-section__subtitle">
          Machine Learning aplicado a los datos del sistema fotovoltaico —
          predicciones, anomalías, clustering y análisis estadístico en tiempo real.
        </p>
        <div className="ai-section__meta">
          {analysis && (
            <span className="ai-meta-chip">
              📊 {analysis.data_points} lecturas analizadas
            </span>
          )}
          {lastUpdated && (
            <span className="ai-meta-chip">
              🕐 Actualizado {lastUpdated.toLocaleTimeString("es-CO")}
            </span>
          )}
          <button className="ai-refresh-btn" onClick={refresh} disabled={loading}>
            {loading ? "⏳ Analizando..." : "↺ Actualizar"}
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      {loading && !analysis && <AISkeleton />}

      {error && (
        <div className="ai-error">
          <span>⚠</span>
          <p>Error conectando con el motor de IA: <strong>{error}</strong></p>
          <button onClick={refresh}>Reintentar</button>
        </div>
      )}

      {analysis && analysis.status === "insufficient_data" && (
        <div className="ai-empty">
          <div className="ai-empty__icon">🤖</div>
          <h3>Esperando más datos…</h3>
          <p>{analysis.message}</p>
          <p className="ai-empty__sub">El sistema necesita al menos 5 lecturas en Firebase para ejecutar los modelos de IA.</p>
        </div>
      )}

      {analysis && analysis.status === "ok" && (
        <div className="ai-content">

          {/* Mini KPIs siempre visibles */}
          <div className="ai-kpis">
            <div className="ai-kpi" style={{ "--accent": analysis.health_score.color } as any}>
              <span className="ai-kpi__icon">❤️</span>
              <span className="ai-kpi__value" style={{ color: analysis.health_score.color }}>
                {analysis.health_score.score}
              </span>
              <span className="ai-kpi__label">Salud del Sistema</span>
            </div>
            <div className="ai-kpi" style={{ "--accent": "#10B981" } as any}>
              <span className="ai-kpi__icon">🔋</span>
              <span className="ai-kpi__value" style={{ color: "#10B981" }}>
                {analysis.health_score.autonomy_hrs}h
              </span>
              <span className="ai-kpi__label">Autonomía Est.</span>
            </div>
            <div className="ai-kpi" style={{ "--accent": "#00D4FF" } as any}>
              <span className="ai-kpi__icon">⚡</span>
              <span className="ai-kpi__value" style={{ color: "#00D4FF" }}>
                {analysis.health_score.avg_efficiency}%
              </span>
              <span className="ai-kpi__label">Eficiencia Prom.</span>
            </div>
            <div className="ai-kpi" style={{ "--accent": "#F59E0B" } as any}>
              <span className="ai-kpi__icon">⚠️</span>
              <span className="ai-kpi__value" style={{ color: "#F59E0B" }}>
                {analysis.anomaly_detection.total}
              </span>
              <span className="ai-kpi__label">Anomalías</span>
            </div>
          </div>

          {/* Tabs de navegación */}
          <div className="ai-tabs">
            {tabs.map(t => (
              <button
                key={t.id}
                className={`ai-tab ${activeTab === t.id ? "ai-tab--active" : ""}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Tab: SALUD ── */}
          {activeTab === "health" && (
            <div className="ai-panel">
              <div className="ai-panel__grid ai-panel__grid--health">

                {/* Gauge circular */}
                <div className="ai-card ai-card--center">
                  <h3 className="ai-card__title">Score de Salud del Sistema</h3>
                  <HealthGauge
                    score={analysis.health_score.score}
                    grade={analysis.health_score.grade}
                    color={analysis.health_score.color}
                  />
                  <p className="ai-card__sub">{analysis.health_score.data_points} puntos de datos analizados</p>
                </div>

                {/* Radar de componentes */}
                <div className="ai-card">
                  <h3 className="ai-card__title">Componentes del Score</h3>
                  <ComponentsRadar components={analysis.health_score.components} />
                  <div className="ai-component-list">
                    {Object.entries(analysis.health_score.components).map(([k, v]) => {
                      const names: Record<string, string> = {
                        stability: "Estabilidad de Voltaje",
                        efficiency: "Eficiencia Energética",
                        anomalies: "Ausencia de Anomalías",
                        activity: "Actividad del Sistema",
                      };
                      const color = v >= 70 ? "#10B981" : v >= 40 ? "#F59E0B" : "#EF4444";
                      return (
                        <div key={k} className="ai-comp-row">
                          <span>{names[k]}</span>
                          <div className="ai-comp-bar">
                            <div className="ai-comp-bar__fill" style={{ width: `${v}%`, background: color }} />
                          </div>
                          <span style={{ color, minWidth: 40, textAlign: "right" }}>{v}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ── Tab: PREDICCIÓN ── */}
          {activeTab === "prediction" && (
            <div className="ai-panel">
              {/* Stat de predicción actual */}
              <div className="ai-prediction-hero">
                <div className="ai-pred-stat">
                  <span className="ai-pred-stat__label">LDR Actual</span>
                  <span className="ai-pred-stat__value" style={{ color: "#F59E0B" }}>
                    {analysis.power_prediction.current_ldr}
                  </span>
                </div>
                <div className="ai-pred-arrow">→</div>
                <div className="ai-pred-stat">
                  <span className="ai-pred-stat__label">Potencia Predicha</span>
                  <span className="ai-pred-stat__value" style={{ color: "#00D4FF" }}>
                    {analysis.power_prediction.current_prediction} mW
                  </span>
                </div>
                <div className="ai-pred-arrow">vs</div>
                <div className="ai-pred-stat">
                  <span className="ai-pred-stat__label">Potencia Real</span>
                  <span className="ai-pred-stat__value" style={{ color: "#10B981" }}>
                    {analysis.power_prediction.current_real} mW
                  </span>
                </div>
                <div className="ai-pred-score">
                  <span>R² = {analysis.power_prediction.model_score}</span>
                  <span className="ai-pred-score__sub">Precisión del modelo</span>
                </div>
              </div>

              {/* Curva de predicción vs LDR con banda de confianza */}
              <div className="ai-card">
                <h3 className="ai-card__title">Curva de Predicción — LDR → Potencia (mW)</h3>
                <p className="ai-card__sub">Regresión Polinomial Grado 2 con banda de confianza ±1σ</p>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={analysis.power_prediction.curve} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#00D4FF" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="ldr" stroke="rgba(255,255,255,0.3)" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} label={{ value: "LDR", position: "insideBottomRight", fill: "rgba(255,255,255,0.5)", offset: -5 }} />
                    <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} label={{ value: "mW", angle: -90, position: "insideLeft", fill: "rgba(255,255,255,0.5)" }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="upper" stroke="none" fill="rgba(0,212,255,0.1)" name="Límite superior" />
                    <Area type="monotone" dataKey="lower" stroke="none" fill="rgba(0,0,0,0)" name="Límite inferior" />
                    <Line type="monotone" dataKey="predicted" stroke="#00D4FF" strokeWidth={2.5} dot={false} name="Predicho (mW)" />
                    {analysis.power_prediction.current_ldr > 0 && (
                      <ReferenceLine x={analysis.power_prediction.current_ldr} stroke="#F59E0B" strokeDasharray="4 4" label={{ value: "LDR actual", fill: "#F59E0B", fontSize: 11 }} />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Tendencia temporal */}
              {analysis.trend_analysis.trend_line.length > 0 && (
                <div className="ai-card">
                  <h3 className="ai-card__title">Tendencia Temporal de Potencia</h3>
                  <p className="ai-card__sub">{analysis.trend_analysis.trend_label} — pendiente: {analysis.trend_analysis.slope} mW/lectura</p>
                  <ResponsiveContainer width="100%" height={250}>
                    <ComposedChart data={analysis.trend_analysis.trend_line} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="hora" stroke="rgba(255,255,255,0.3)" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
                      <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="power_mW" stroke="#10B981" fill="rgba(16,185,129,0.1)" strokeWidth={1.5} dot={false} name="Potencia real (mW)" />
                      <Line type="monotone" dataKey="trend" stroke="#A78BFA" strokeWidth={2} strokeDasharray="6 3" dot={false} name="Tendencia" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: CLUSTERS ── */}
          {activeTab === "clusters" && (
            <div className="ai-panel">
              {/* Leyenda de clusters */}
              <div className="ai-cluster-legend">
                {analysis.clustering.centroids.map(c => (
                  <div key={c.cluster} className="ai-cluster-badge" style={{ borderColor: c.color }}>
                    <span className="ai-cluster-dot" style={{ background: c.color }} />
                    <div>
                      <p style={{ color: c.color, fontWeight: 700 }}>{c.name}</p>
                      <p className="ai-cluster-badge__sub">{c.count} lecturas · LDR prom: {c.ldr_center.toFixed(0)} · {c.power_center.toFixed(1)} mW</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Scatter plot de clusters */}
              <div className="ai-card">
                <h3 className="ai-card__title">Clasificación K-Means — LDR vs Potencia</h3>
                <p className="ai-card__sub">Cada punto representa una lectura · Los grupos identifican patrones de rendimiento</p>
                <ResponsiveContainer width="100%" height={350}>
                  <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="ldr" name="LDR" type="number" stroke="rgba(255,255,255,0.3)" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} label={{ value: "LDR (luz)", position: "insideBottomRight", fill: "rgba(255,255,255,0.5)", offset: -5 }} />
                    <YAxis dataKey="power_mW" name="Potencia" type="number" stroke="rgba(255,255,255,0.3)" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} label={{ value: "mW", angle: -90, position: "insideLeft", fill: "rgba(255,255,255,0.5)" }} />
                    <Tooltip cursor={{ strokeDasharray: "3 3" }} content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div className="ai-tooltip">
                          <p style={{ color: d?.cluster_color, fontWeight: 700 }}>{d?.cluster_name}</p>
                          <p>LDR: {d?.ldr}</p>
                          <p>Potencia: {d?.power_mW} mW</p>
                          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>{d?.hora}</p>
                        </div>
                      );
                    }} />
                    {analysis.clustering.centroids.map(c => (
                      <Scatter
                        key={c.cluster}
                        name={c.name}
                        data={analysis.clustering.points.filter(p => p.cluster === c.cluster)}
                        fill={c.color}
                        fillOpacity={0.75}
                        r={4}
                      />
                    ))}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              {/* Distribución porcentual */}
              <div className="ai-card">
                <h3 className="ai-card__title">Distribución de Períodos</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={analysis.clustering.centroids}
                    margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }} />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Lecturas" radius={[6, 6, 0, 0]}>
                      {analysis.clustering.centroids.map(c => (
                        <Cell key={c.cluster} fill={c.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Tab: ANOMALÍAS ── */}
          {activeTab === "anomalies" && (
            <div className="ai-panel">
              <div className="ai-anomaly-summary">
                <div className="ai-anomaly-stat">
                  <span style={{ fontSize: "2.5rem", fontWeight: 800, color: analysis.anomaly_detection.total > 0 ? "#F59E0B" : "#10B981" }}>
                    {analysis.anomaly_detection.total}
                  </span>
                  <span>anomalías detectadas</span>
                </div>
                <div className="ai-anomaly-stat">
                  <span style={{ fontSize: "2.5rem", fontWeight: 800, color: "#A78BFA" }}>
                    {analysis.anomaly_detection.pct}%
                  </span>
                  <span>del total de lecturas</span>
                </div>
              </div>

              {analysis.anomaly_detection.anomalies.length === 0 ? (
                <div className="ai-empty ai-empty--small">
                  <div className="ai-empty__icon">✅</div>
                  <h3>¡Sin anomalías críticas!</h3>
                  <p>El sistema opera dentro de los rangos normales.</p>
                </div>
              ) : (
                <div className="ai-anomaly-list">
                  {analysis.anomaly_detection.anomalies.slice(-15).reverse().map((a, i) => (
                    <div key={i} className={`ai-anomaly-card ai-anomaly-card--${a.severity}`}>
                      <div className="ai-anomaly-card__header">
                        <SeverityBadge severity={a.severity} />
                        <span className="ai-anomaly-card__time">{a.fecha} {a.hora}</span>
                        <span className="ai-anomaly-card__zscore">Z = {a.z_score}</span>
                      </div>
                      <p className="ai-anomaly-card__desc">{a.description}</p>
                      <div className="ai-anomaly-card__vals">
                        <span>V: {a.voltage}V</span>
                        <span>I: {a.current_mA}mA</span>
                        <span>P: {a.power_mW}mW</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Tab: CORRELACIONES ── */}
          {activeTab === "correlation" && (
            <div className="ai-panel">
              <div className="ai-card">
                <h3 className="ai-card__title">Matriz de Correlación de Pearson</h3>
                <p className="ai-card__sub">Verde = correlación positiva · Rojo = correlación negativa · Intensidad = fuerza</p>
                <CorrelationHeatmap matrix={analysis.correlation.matrix} />
              </div>

              <div className="ai-card">
                <h3 className="ai-card__title">Insights Automáticos</h3>
                <div className="ai-insights">
                  {analysis.correlation.insights.map((ins, i) => (
                    <div key={i} className="ai-insight">
                      <div
                        className="ai-insight__bar"
                        style={{
                          width: `${Math.abs(ins.r) * 100}%`,
                          background: ins.r > 0 ? "#10B981" : "#EF4444",
                        }}
                      />
                      <p>{ins.description}</p>
                      <span className="ai-insight__r" style={{ color: ins.r > 0 ? "#10B981" : "#EF4444" }}>
                        r = {ins.r.toFixed(3)}
                      </span>
                    </div>
                  ))}
                  {analysis.correlation.insights.length === 0 && (
                    <p style={{ color: "rgba(255,255,255,0.4)" }}>No hay suficientes datos para calcular correlaciones significativas.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Tab: PERFIL HORARIO ── */}
          {activeTab === "hourly" && (
            <div className="ai-panel">
              {analysis.hourly_profile.peak_hour && (
                <div className="ai-peak-banner">
                  <span>⚡ Hora pico de generación:</span>
                  <strong style={{ color: "#F59E0B" }}>
                    {analysis.hourly_profile.peak_hour.hour_label}
                  </strong>
                  <span>con promedio de</span>
                  <strong style={{ color: "#10B981" }}>
                    {analysis.hourly_profile.peak_hour.avg_power} mW
                  </strong>
                </div>
              )}
              <div className="ai-card">
                <h3 className="ai-card__title">Perfil Diario de Potencia por Hora</h3>
                <p className="ai-card__sub">Promedio histórico de generación por franja horaria</p>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={analysis.hourly_profile.profile} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="hourlyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="hour_label" stroke="rgba(255,255,255,0.3)" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
                    <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} label={{ value: "mW", angle: -90, position: "insideLeft", fill: "rgba(255,255,255,0.5)" }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="avg_power" stroke="#F59E0B" fill="url(#hourlyGrad)" strokeWidth={2.5} dot={false} name="Potencia promedio (mW)" />
                    <Line type="monotone" dataKey="max_power" stroke="#10B981" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="Potencia máx (mW)" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Tabla resumen */}
              <div className="ai-card">
                <h3 className="ai-card__title">Tabla de Rendimiento Horario</h3>
                <div className="ai-table-wrap">
                  <table className="ai-table">
                    <thead>
                      <tr>
                        <th>Hora</th>
                        <th>Promedio (mW)</th>
                        <th>Máximo (mW)</th>
                        <th>Mínimo (mW)</th>
                        <th>Lecturas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.hourly_profile.profile.map((h) => {
                        const isPeak = h.hour === analysis.hourly_profile.peak_hour?.hour;
                        return (
                          <tr key={h.hour} className={isPeak ? "ai-table__row--peak" : ""}>
                            <td>{h.hour_label} {isPeak && "⚡"}</td>
                            <td style={{ color: "#00D4FF" }}>{h.avg_power}</td>
                            <td style={{ color: "#10B981" }}>{h.max_power}</td>
                            <td style={{ color: "#6B7280" }}>{h.min_power}</td>
                            <td style={{ color: "rgba(255,255,255,0.4)" }}>{h.count}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── Tab: BALANCE ENERGÉTICO ── */}
          {activeTab === "energy" && analysis.energy_balance && (
            <div className="ai-panel">
              {/* Estado de carga summary */}
              <div className="ai-prediction-hero">
                <div className="ai-pred-stat">
                  <span className="ai-pred-stat__label">Cargando</span>
                  <span className="ai-pred-stat__value" style={{ color: "#10B981" }}>
                    {analysis.energy_balance.charging_pct}%
                  </span>
                </div>
                <div className="ai-pred-stat">
                  <span className="ai-pred-stat__label">Equilibrio</span>
                  <span className="ai-pred-stat__value" style={{ color: "#00D4FF" }}>
                    {analysis.energy_balance.equilibrium_pct}%
                  </span>
                </div>
                <div className="ai-pred-stat">
                  <span className="ai-pred-stat__label">Descargando</span>
                  <span className="ai-pred-stat__value" style={{ color: "#EF4444" }}>
                    {analysis.energy_balance.discharging_pct}%
                  </span>
                </div>
              </div>

              {/* Resumen energético */}
              {analysis.energy_balance.summary && (
                <div className="ai-kpis">
                  <div className="ai-kpi" style={{ "--accent": "#F59E0B" } as any}>
                    <span className="ai-kpi__icon">☀️</span>
                    <span className="ai-kpi__value" style={{ color: "#F59E0B" }}>
                      {analysis.energy_balance.summary.avg_panel_mW}
                    </span>
                    <span className="ai-kpi__label">Panel Prom. (mW)</span>
                  </div>
                  <div className="ai-kpi" style={{ "--accent": "#A78BFA" } as any}>
                    <span className="ai-kpi__icon">🔋</span>
                    <span className="ai-kpi__value" style={{ color: "#A78BFA" }}>
                      {analysis.energy_balance.summary.avg_bat_mW}
                    </span>
                    <span className="ai-kpi__label">Batería Prom. (mW)</span>
                  </div>
                  <div className="ai-kpi" style={{ "--accent": "#10B981" } as any}>
                    <span className="ai-kpi__icon">⚡</span>
                    <span className="ai-kpi__value" style={{ color: "#10B981" }}>
                      {analysis.energy_balance.summary.total_energy_panel_mWh}
                    </span>
                    <span className="ai-kpi__label">Energía Panel (mWh)</span>
                  </div>
                </div>
              )}

              {/* Gráfica Panel vs Batería */}
              {analysis.energy_balance.balance_points.length > 0 && (
                <div className="ai-card">
                  <h3 className="ai-card__title">Balance Energético — Panel vs Batería</h3>
                  <p className="ai-card__sub">Potencia del panel solar comparada con consumo/carga de la batería</p>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={analysis.energy_balance.balance_points} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="hora" stroke="rgba(255,255,255,0.3)" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
                      <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} label={{ value: "mW", angle: -90, position: "insideLeft", fill: "rgba(255,255,255,0.5)" }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="balance" stroke="#10B981" fill="url(#balGrad)" strokeWidth={1} name="Balance neto (mW)" />
                      <Line type="monotone" dataKey="panel_mW" stroke="#F59E0B" strokeWidth={2} dot={false} name="Panel (mW)" />
                      <Line type="monotone" dataKey="bateria_mW" stroke="#A78BFA" strokeWidth={2} dot={false} name="Batería (mW)" />
                      <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Distribución de estados como donut */}
              <div className="ai-card">
                <h3 className="ai-card__title">Distribución de Estados Energéticos</h3>
                <p className="ai-card__sub">Porcentaje del tiempo en cada modo operativo</p>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Cargando", value: analysis.energy_balance.charging_pct, fill: "#10B981" },
                        { name: "Equilibrio", value: analysis.energy_balance.equilibrium_pct, fill: "#00D4FF" },
                        { name: "Descargando", value: analysis.energy_balance.discharging_pct, fill: "#EF4444" },
                      ].filter(d => d.value > 0)}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {[
                        { fill: "#10B981" },
                        { fill: "#00D4FF" },
                        { fill: "#EF4444" },
                      ].filter((_, i) => [
                        analysis.energy_balance.charging_pct,
                        analysis.energy_balance.equilibrium_pct,
                        analysis.energy_balance.discharging_pct,
                      ][i] > 0).map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

        </div>
      )}
    </section>
  );
}
