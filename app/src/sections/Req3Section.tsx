import { useState } from "react";
import { useReq3 } from "../hooks/useReq3";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line,
  ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter, AreaChart, Area
} from "recharts";

const API_BASE_URL = "http://localhost:5000/api";

// ── Tooltip Custom ────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(10,10,18,0.95)", border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: "0.75rem", padding: "0.8rem 1rem", fontSize: "0.82rem",
      color: "rgba(255,255,255,0.8)", backdropFilter: "blur(12px)"
    }}>
      <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: "0.35rem", fontSize: "0.75rem" }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color, margin: 0 }}>
          {p.name}: <strong style={{color: "white"}}>{typeof p.value === "number" ? p.value.toFixed(2) : p.value}</strong>
        </p>
      ))}
    </div>
  );
}

// ── Metric Card ──────────────────────────────────────────────────────────
function MetricCard({ title, value, unit, color, subtitle, icon }: {
  title: string; value: string | number; unit?: string; color: string; subtitle: string; icon: string;
}) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: "1.25rem", padding: "1.5rem", backdropFilter: "blur(10px)",
      transition: "all 0.3s ease", position: "relative", overflow: "hidden"
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.border = `1px solid ${color}33`;
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.border = "1px solid rgba(255,255,255,0.07)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
      }}
    >
      <div style={{
        position: "absolute", top: "-20px", right: "-20px", fontSize: "5rem", opacity: 0.04
      }}>{icon}</div>
      <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", fontWeight: 600, marginBottom: "0.75rem", textTransform: "uppercase" as const }}>
        {title}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.3rem" }}>
        <span style={{ fontSize: "2.2rem", fontWeight: 800, color, lineHeight: 1 }}>{value}</span>
        {unit && <span style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.35)", marginTop: "0.4rem" }}>{subtitle}</div>
    </div>
  );
}

// ── Code Block ───────────────────────────────────────────────────────────
function CodeBlock({ code, language = "python" }: { code: string; language?: string }) {
  return (
    <div style={{
      background: "rgba(0,0,0,0.5)", borderRadius: "0.75rem", padding: "1rem 1.25rem",
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: "0.78rem",
      color: "#A78BFA", lineHeight: 1.7, overflowX: "auto",
      border: "1px solid rgba(167,139,250,0.15)"
    }}>
      <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.25)", marginBottom: "0.5rem", fontFamily: "inherit" }}>
        # {language}
      </div>
      <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{code}</pre>
    </div>
  );
}

export default function Req3Section() {
  const { data, loading, error, refresh } = useReq3(60000);
  const [activeTab, setActiveTab] = useState<"req1" | "req2" | "req3">("req1");
  const [downloadingNb, setDownloadingNb] = useState(false);

  const tabs = [
    { id: "req1", label: "📐 Req 1: Modelado Físico", desc: "Ley de Ohm, Potencia, Energía" },
    { id: "req2", label: "📊 Req 2: Eficiencia", desc: "Errores, Descarga, Pérdidas" },
    { id: "req3", label: "📈 Req 3: Visualización", desc: "Gráficas, Tablas, Notebook" },
  ] as const;

  const handleDownloadNotebook = async () => {
    setDownloadingNb(true);
    try {
      const res = await fetch(`${API_BASE_URL}/req3-download-notebook`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SolarMonitor_Requerimientos.ipynb`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Error descargando el notebook: " + (err instanceof Error ? err.message : "desconocido"));
    } finally {
      setDownloadingNb(false);
    }
  };

  return (
    <section id="req3" style={{
      padding: "6rem 2rem", background: "linear-gradient(180deg, #050508 0%, #081010 40%, #050508 100%)",
      position: "relative", minHeight: "100vh"
    }}>
      {/* Decorative orbs */}
      <div style={{
        position: "absolute", top: "10%", left: "5%", width: "400px", height: "400px",
        background: "radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)",
        borderRadius: "50%", pointerEvents: "none"
      }} />
      <div style={{
        position: "absolute", bottom: "10%", right: "5%", width: "350px", height: "350px",
        background: "radial-gradient(circle, rgba(167,139,250,0.05) 0%, transparent 70%)",
        borderRadius: "50%", pointerEvents: "none"
      }} />

      {/* Header */}
      <div style={{ textAlign: "center", maxWidth: "800px", margin: "0 auto 3rem", position: "relative" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "0.5rem",
          background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)",
          color: "#10B981", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.15em",
          padding: "0.35rem 1rem", borderRadius: "2rem", marginBottom: "1.25rem"
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", animation: "pulse 2s infinite" }} />
          REQUERIMIENTOS ACADÉMICOS #3
        </div>
        <h2 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "1rem", color: "white" }}>
          <span style={{
            background: "linear-gradient(135deg, #10B981 0%, #00D4FF 50%, #A78BFA 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"
          }}>
            Análisis y Validación Físico-Matemática
          </span>
        </h2>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "1.05rem", lineHeight: 1.7, marginBottom: "1.5rem" }}>
          Implementación de la Ley de Ohm, cálculo de potencia, modelado de descarga, análisis de eficiencia, 
          Efecto Joule y generación de informes con <strong style={{color: "rgba(255,255,255,0.75)"}}>Pandas</strong> y <strong style={{color: "rgba(255,255,255,0.75)"}}>NumPy</strong>.
        </p>
        
        <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
          <button onClick={refresh} disabled={loading} style={{
            background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)",
            color: "#10B981", fontSize: "0.8rem", fontWeight: 600, padding: "0.5rem 1.2rem",
            borderRadius: "2rem", cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.2s ease"
          }}>
            {loading ? "⏳ Procesando..." : "↻ Recalcular Análisis"}
          </button>
          <button onClick={handleDownloadNotebook} disabled={downloadingNb} style={{
            background: "linear-gradient(135deg, rgba(167,139,250,0.2), rgba(0,212,255,0.15))",
            border: "1px solid rgba(167,139,250,0.4)", color: "#A78BFA",
            fontSize: "0.8rem", fontWeight: 600, padding: "0.5rem 1.2rem",
            borderRadius: "2rem", cursor: downloadingNb ? "not-allowed" : "pointer",
            transition: "all 0.2s ease"
          }}>
            {downloadingNb ? "⏳ Generando..." : "📓 Descargar Jupyter Notebook"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", color: "#EF4444", padding: "2rem", background: "rgba(239,68,68,0.1)", borderRadius: "1rem", border: "1px solid rgba(239,68,68,0.2)" }}>
          <h3 style={{ marginBottom: "0.5rem" }}>⚠️ Error cargando datos</h3>
          <p style={{ fontSize: "0.9rem" }}>{error}</p>
        </div>
      )}

      {loading && !data && (
        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", marginTop: "3rem" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem", animation: "pulse 1.5s infinite" }}>⚙️</div>
          <p>Procesando estructuras de datos en Pandas y calculando variables físicas...</p>
        </div>
      )}

      {data && data.status === "success" && (
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          
          {/* Tabs */}
          <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginBottom: "2.5rem", flexWrap: "wrap" }}>
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  background: activeTab === t.id ? "rgba(16,185,129,0.18)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${activeTab === t.id ? "rgba(16,185,129,0.5)" : "rgba(255,255,255,0.08)"}`,
                  color: activeTab === t.id ? "#10B981" : "rgba(255,255,255,0.5)",
                  fontWeight: activeTab === t.id ? 700 : 500,
                  fontSize: "0.9rem", padding: "0.6rem 1.2rem", borderRadius: "2rem",
                  cursor: "pointer", transition: "all 0.2s ease"
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── TAB 1: MODELADO FÍSICO ── */}
          {activeTab === "req1" && (
            <div>
              {/* Metrics Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
                <MetricCard icon="Ω" title="Ley de Ohm (R = V/I)" value={data.req1_modelado.resistencia_promedio_ohm} unit="Ω" color="#00D4FF" subtitle="Resistencia promedio del panel" />
                <MetricCard icon="⚡" title="Potencia (P = V×I)" value={data.req1_modelado.potencia_promedio_mw} unit="mW" color="#10B981" subtitle="Promedio de generación" />
                <MetricCard icon="🔋" title="Energía (E = P×Δt)" value={data.req1_modelado.energia_total_j} unit="J" color="#F59E0B" subtitle="Joules totales generados" />
                <MetricCard icon="📊" title="Dataset Pandas" value={data.req1_modelado.total_registros} unit="filas" color="#A78BFA" subtitle="Importadas y procesadas" />
              </div>

              {/* Detalles adicionales */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
                
                {/* Card: Funciones Físicas Detalladas */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1.25rem", padding: "1.75rem", backdropFilter: "blur(10px)" }}>
                  <h3 style={{ color: "white", fontSize: "1.1rem", marginBottom: "0.5rem", fontWeight: 700 }}>
                    📐 1.1 Funciones Físicas Aplicadas
                  </h3>
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
                    Cada lectura del sensor IoT se procesa con estas fórmulas en Python
                  </p>
                  
                  <CodeBlock code={`# Ley de Ohm
R = V / I   →  ${data.req1_modelado.resistencia_promedio_ohm} Ω

# Potencia eléctrica
P = V × I   →  ${data.req1_modelado.potencia_promedio_mw} mW (prom)
              →  ${data.req1_modelado.potencia_max_mw} mW (máx)

# Energía acumulada
E = P × Δt  →  ${data.req1_modelado.energia_total_j} J (total)

# Efecto Joule (pérdidas)
P_j = I² × R`} />

                  <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div style={{ background: "rgba(0,212,255,0.08)", padding: "0.75rem", borderRadius: "0.75rem", textAlign: "center" }}>
                      <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#00D4FF" }}>{data.req1_modelado.voltaje_max_v}V</div>
                      <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>Voltaje Máximo</div>
                    </div>
                    <div style={{ background: "rgba(16,185,129,0.08)", padding: "0.75rem", borderRadius: "0.75rem", textAlign: "center" }}>
                      <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#10B981" }}>{data.req1_modelado.corriente_max_ma}mA</div>
                      <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>Corriente Máxima</div>
                    </div>
                  </div>
                </div>

                {/* Card: Importación y Limpieza */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1.25rem", padding: "1.75rem", backdropFilter: "blur(10px)" }}>
                  <h3 style={{ color: "white", fontSize: "1.1rem", marginBottom: "0.5rem", fontWeight: 700 }}>
                    🧹 1.2-1.4 Importar, Procesar y Limpiar Datos
                  </h3>
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
                    Pipeline de procesamiento de datos con Pandas
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {[
                      { step: "1", title: "Importar Dataset", desc: "Firebase → pd.DataFrame()", color: "#A78BFA", code: "df = pd.DataFrame(flat_data)" },
                      { step: "2", title: "Convertir Tipos", desc: "pd.to_datetime() + sort_values()", color: "#00D4FF", code: "df['timestamp'] = pd.to_datetime(...)" },
                      { step: "3", title: "Calcular Variables", desc: "df.apply(ley_ohm, potencia, energia)", color: "#10B981", code: "df['R'] = df.apply(lambda r: V/I)" },
                      { step: "4", title: "Limpiar Ruido", desc: "interpolate() + rolling(window=3).mean()", color: "#F59E0B", code: "df['clean'] = df['v'].rolling(3).mean()" },
                    ].map(item => (
                      <div key={item.step} style={{
                        display: "flex", alignItems: "center", gap: "0.75rem",
                        background: "rgba(0,0,0,0.25)", padding: "0.75rem 1rem", borderRadius: "0.75rem",
                        borderLeft: `3px solid ${item.color}`
                      }}>
                        <div style={{
                          width: "28px", height: "28px", borderRadius: "50%",
                          background: `${item.color}20`, color: item.color,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "0.75rem", fontWeight: 800, flexShrink: 0
                        }}>{item.step}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: "white", fontSize: "0.85rem", fontWeight: 600 }}>{item.title}</div>
                          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>{item.desc}</div>
                        </div>
                        <code style={{ fontSize: "0.65rem", color: item.color, opacity: 0.6 }}>{item.code}</code>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: ANÁLISIS DE DATOS Y EFICIENCIA ── */}
          {activeTab === "req2" && (
            <div>
              {/* Top Metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
                <MetricCard icon="⚡" title="Eficiencia del Convertidor" value={data.req2_eficiencia.eficiencia_convertidor_pct} unit="%" color="#10B981" subtitle="Panel → Batería (η = Pout/Pin)" />
                <MetricCard icon="🎯" title="Error Promedio" value={data.req2_eficiencia.error_voltaje_promedio_pct} unit="%" color="#EF4444" subtitle="|V_teo - V_real| / V_teo × 100" />
                <MetricCard icon="📉" title="Pendiente Descarga" value={data.req2_eficiencia.descarga_slope} unit="V/hr" color="#A78BFA" subtitle={`R² = ${data.req2_eficiencia.descarga_r2}`} />
                <MetricCard icon="🔥" title="Pérdidas Joule" value={data.req2_eficiencia.efecto_joule?.total_perdidas_mw || 0} unit="mW" color="#F59E0B" subtitle={`P = I²R (${data.req2_eficiencia.efecto_joule?.registros_con_perdida || 0} lecturas)`} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
                
                {/* Card 2.1-2.2: Eficiencia + Error */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1.25rem", padding: "1.75rem", backdropFilter: "blur(10px)" }}>
                  <h3 style={{ color: "white", fontSize: "1.1rem", marginBottom: "0.5rem", fontWeight: 700 }}>
                    ⚡ 2.1 Eficiencia de Transferencia
                  </h3>
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
                    Rendimiento del convertidor DC-DC entre Panel Solar y Batería
                  </p>

                  {/* Circular Progress */}
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
                    <div style={{ position: "relative", width: "140px", height: "140px" }}>
                      <svg viewBox="0 0 120 120" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                        <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                        <circle cx="60" cy="60" r="50" fill="none" stroke="#10B981" strokeWidth="10"
                          strokeDasharray={`${data.req2_eficiencia.eficiencia_convertidor_pct * 3.14} 314`}
                          strokeLinecap="round" style={{ transition: "stroke-dasharray 1s ease" }}
                        />
                      </svg>
                      <div style={{
                        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                        textAlign: "center"
                      }}>
                        <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#10B981" }}>
                          {data.req2_eficiencia.eficiencia_convertidor_pct}%
                        </div>
                        <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)" }}>eficiencia</div>
                      </div>
                    </div>
                  </div>

                  <CodeBlock code={`# η = (P_salida / P_entrada) × 100
eficiencia = (bat_v × bat_i) / (panel_v × panel_i) × 100
# Resultado: ${data.req2_eficiencia.eficiencia_convertidor_pct}%`} />
                </div>

                {/* Card 2.2: Error con barra */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1.25rem", padding: "1.75rem", backdropFilter: "blur(10px)" }}>
                  <h3 style={{ color: "white", fontSize: "1.1rem", marginBottom: "0.5rem", fontWeight: 700 }}>
                    🎯 2.2 Error Teórico vs Real
                  </h3>
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
                    Desviación del voltaje medido respecto al modelo teórico basado en LDR
                  </p>

                  <div style={{ margin: "1.5rem 0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem" }}>Error Voltaje</span>
                      <span style={{ color: "#EF4444", fontWeight: 700 }}>{data.req2_eficiencia.error_voltaje_promedio_pct}%</span>
                    </div>
                    <div style={{ height: "8px", background: "rgba(255,255,255,0.06)", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: `${Math.min(data.req2_eficiencia.error_voltaje_promedio_pct, 100)}%`,
                        background: "linear-gradient(90deg, #10B981, #F59E0B, #EF4444)",
                        borderRadius: "4px", transition: "width 1s ease"
                      }} />
                    </div>
                  </div>

                  <CodeBlock code={`# V_teórico = 18V × (1 - LDR/1024)
# ε = |V_teo - V_real| / V_teo × 100
error_prom = ${data.req2_eficiencia.error_voltaje_promedio_pct}%`} />

                  {/* Efecto Joule detalle */}
                  {data.req2_eficiencia.efecto_joule && (
                    <div style={{ marginTop: "1.25rem", background: "rgba(245,158,11,0.08)", borderRadius: "0.75rem", padding: "1rem", border: "1px solid rgba(245,158,11,0.15)" }}>
                      <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#F59E0B", marginBottom: "0.5rem" }}>
                        🔥 Efecto Joule (P = I²R)
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.78rem" }}>
                        <div>
                          <span style={{ color: "rgba(255,255,255,0.4)" }}>Total pérdidas:</span>
                          <div style={{ color: "#F59E0B", fontWeight: 700 }}>{data.req2_eficiencia.efecto_joule.total_perdidas_mw} mW</div>
                        </div>
                        <div>
                          <span style={{ color: "rgba(255,255,255,0.4)" }}>Promedio:</span>
                          <div style={{ color: "#F59E0B", fontWeight: 700 }}>{data.req2_eficiencia.efecto_joule.promedio_mw} mW</div>
                        </div>
                        <div>
                          <span style={{ color: "rgba(255,255,255,0.4)" }}>Máxima pérdida:</span>
                          <div style={{ color: "#F59E0B", fontWeight: 700 }}>{data.req2_eficiencia.efecto_joule.max_mw} mW</div>
                        </div>
                        <div>
                          <span style={{ color: "rgba(255,255,255,0.4)" }}>Registros:</span>
                          <div style={{ color: "#F59E0B", fontWeight: 700 }}>{data.req2_eficiencia.efecto_joule.registros_con_perdida}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card 2.3: Scatter Plot de Regresión */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1.25rem", padding: "1.75rem", backdropFilter: "blur(10px)", gridColumn: "1 / -1" }}>
                  <h3 style={{ color: "white", fontSize: "1.1rem", marginBottom: "0.5rem", fontWeight: 700 }}>
                    🔋 2.3 Regresión de Descarga — Scatter Plot con Línea de Tendencia
                  </h3>
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
                    Modelo lineal: V(t) = {data.req2_eficiencia.descarga_slope}t + {data.req2_eficiencia.descarga_intercept} | 
                    R² = {data.req2_eficiencia.descarga_r2} | Calculado con <code style={{color: "#A78BFA"}}>np.polyfit(X, y, 1)</code>
                  </p>
                  
                  {data.req2_eficiencia.scatter_data && data.req2_eficiencia.scatter_data.length > 0 ? (
                    <div style={{ height: "320px", width: "100%" }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis 
                            dataKey="t_hours" 
                            name="Tiempo" 
                            unit=" hr" 
                            stroke="rgba(255,255,255,0.3)" 
                            tick={{fill:"rgba(255,255,255,0.5)", fontSize: 10}} 
                            label={{ value: "Tiempo (horas)", position: "insideBottom", offset: -5, fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                          />
                          <YAxis 
                            dataKey="bat_v" 
                            name="Voltaje" 
                            unit=" V"
                            stroke="rgba(255,255,255,0.3)" 
                            tick={{fill:"rgba(255,255,255,0.5)", fontSize: 10}}
                            label={{ value: "Voltaje (V)", angle: -90, position: "insideLeft", offset: 15, fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Scatter name="Datos Reales" data={data.req2_eficiencia.scatter_data} fill="#A78BFA" fillOpacity={0.6} />
                          <Scatter name="Regresión Lineal" data={data.req2_eficiencia.scatter_data.map(p => ({...p, bat_v: p.regression_v}))} fill="#EF4444" shape="diamond" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", padding: "3rem" }}>
                      <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📉</div>
                      <p>No hay suficientes datos de descarga para la regresión. Se necesitan al menos 5 registros en estado "DESCARGANDO".</p>
                    </div>
                  )}
                </div>

                {/* Card 2.4: Caídas de Tensión */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1.25rem", padding: "1.75rem", backdropFilter: "blur(10px)", gridColumn: "1 / -1" }}>
                  <h3 style={{ color: "white", fontSize: "1.1rem", marginBottom: "0.5rem", fontWeight: 700 }}>
                    ⚠️ 2.4 Detectar Caídas de Tensión (np.gradient)
                  </h3>
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
                    Gradientes negativos abruptos detectados vía derivada discreta dV/dt con <code style={{color: "#A78BFA"}}>np.gradient()</code>
                  </p>
                  <div style={{ maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {data.req2_eficiencia.caidas_tension.length === 0 ? (
                      <div style={{ color: "#10B981", textAlign: "center", padding: "1.5rem", background: "rgba(16,185,129,0.08)", borderRadius: "0.75rem" }}>
                        ✅ No se detectaron caídas bruscas de tensión (umbral: -1.5V)
                      </div>
                    ) : (
                      data.req2_eficiencia.caidas_tension.map((c, i) => (
                        <div key={i} style={{
                          background: "rgba(239,68,68,0.08)", borderLeft: "3px solid #EF4444",
                          padding: "0.75rem 1rem", borderRadius: "0 0.5rem 0.5rem 0",
                          display: "flex", justifyContent: "space-between", alignItems: "center"
                        }}>
                          <div>
                            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>🕐 {c.hora}</div>
                            <div style={{ fontWeight: 700, color: "white", fontSize: "0.9rem" }}>Caída: {c.caida}V</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>De {c.v_anterior}V → {c.v_actual}V</div>
                            <div style={{ fontSize: "0.7rem", color: "#EF4444" }}>dV/dt = {c.dv_dt}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 3: VISUALIZACIÓN ── */}
          {activeTab === "req3" && (
            <div style={{ display: "grid", gap: "1.5rem" }}>
              
              {/* Card 3.1: Gráficas comparativas - Voltaje */}
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1.25rem", padding: "1.75rem", backdropFilter: "blur(10px)" }}>
                <h3 style={{ color: "white", fontSize: "1.1rem", marginBottom: "0.5rem", fontWeight: 700 }}>
                  📈 3.1 Gráfica Comparativa — Voltaje: Teórico vs Real
                </h3>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
                  Curvas superpuestas de las últimas 60 lecturas del panel solar
                </p>
                <div style={{ height: "300px", width: "100%" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.req3_visualizacion.grafica_comparativa} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradReal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#00D4FF" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#00D4FF" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="hora" stroke="rgba(255,255,255,0.3)" tick={{fill:"rgba(255,255,255,0.5)", fontSize: 10}} />
                      <YAxis stroke="rgba(255,255,255,0.3)" tick={{fill:"rgba(255,255,255,0.5)", fontSize: 10}} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Area type="monotone" dataKey="real_v" name="Voltaje Real (V)" stroke="#00D4FF" strokeWidth={2} fill="url(#gradReal)" />
                      <Line type="monotone" dataKey="teorico_v" name="Voltaje Teórico (V)" stroke="#EF4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Card 3.1b: Gráfica de Potencia */}
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1.25rem", padding: "1.75rem", backdropFilter: "blur(10px)" }}>
                <h3 style={{ color: "white", fontSize: "1.1rem", marginBottom: "0.5rem", fontWeight: 700 }}>
                  ⚡ 3.1 Gráfica Comparativa — Potencia: Teórica vs Real
                </h3>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
                  Comparación de la potencia calculada vs el modelo teórico basado en LDR
                </p>
                <div style={{ height: "280px", width: "100%" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.req3_visualizacion.grafica_comparativa} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="hora" stroke="rgba(255,255,255,0.3)" tick={{fill:"rgba(255,255,255,0.5)", fontSize: 9}} />
                      <YAxis stroke="rgba(255,255,255,0.3)" tick={{fill:"rgba(255,255,255,0.5)", fontSize: 10}} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="real_p" name="Potencia Real (mW)" fill="#10B981" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
                      <Bar dataKey="teorico_p" name="Potencia Teórica (mW)" fill="#EF4444" fillOpacity={0.4} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
                
                {/* Card 3.2: Tablas resumen */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1.25rem", padding: "1.75rem", backdropFilter: "blur(10px)" }}>
                  <h3 style={{ color: "white", fontSize: "1.1rem", marginBottom: "0.5rem", fontWeight: 700 }}>
                    📋 3.2 Tabla Resumen (DataFrames Pandas)
                  </h3>
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginBottom: "1rem" }}>
                    Agrupado por día usando <code style={{color: "#A78BFA"}}>df.groupby('fecha').agg()</code>
                  </p>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", color: "rgba(255,255,255,0.8)" }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid rgba(16,185,129,0.3)", textAlign: "left" }}>
                          <th style={{ padding: "0.6rem 0.5rem", color: "#10B981", fontWeight: 700 }}>Fecha</th>
                          <th style={{ padding: "0.6rem 0.5rem", color: "#00D4FF" }}>V̄ (V)</th>
                          <th style={{ padding: "0.6rem 0.5rem", color: "#00D4FF" }}>V_max</th>
                          <th style={{ padding: "0.6rem 0.5rem", color: "#00D4FF" }}>V_min</th>
                          <th style={{ padding: "0.6rem 0.5rem", color: "#A78BFA" }}>σ(V)</th>
                          <th style={{ padding: "0.6rem 0.5rem", color: "#10B981" }}>P̄ (mW)</th>
                          <th style={{ padding: "0.6rem 0.5rem", color: "#EF4444" }}>ε (%)</th>
                          <th style={{ padding: "0.6rem 0.5rem", color: "#F59E0B" }}>Joule</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.req3_visualizacion.tabla_resumen.map((r, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", transition: "background 0.2s" }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                          >
                            <td style={{ padding: "0.5rem", fontWeight: 600 }}>{r.fecha}</td>
                            <td style={{ padding: "0.5rem", color: "#00D4FF" }}>{r.v_mean}</td>
                            <td style={{ padding: "0.5rem", color: "#00D4FF" }}>{r.v_max}</td>
                            <td style={{ padding: "0.5rem", color: "#00D4FF" }}>{r.v_min}</td>
                            <td style={{ padding: "0.5rem", color: "#A78BFA" }}>{r.v_std}</td>
                            <td style={{ padding: "0.5rem", color: "#10B981" }}>{r.p_mean}</td>
                            <td style={{ padding: "0.5rem", color: "#EF4444" }}>{r.error_mean}%</td>
                            <td style={{ padding: "0.5rem", color: "#F59E0B" }}>{r.joule_total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  {/* Card 3.3: Estabilidad (Desviación) */}
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1.25rem", padding: "1.75rem", backdropFilter: "blur(10px)", flex: 1 }}>
                    <h3 style={{ color: "white", fontSize: "1.1rem", marginBottom: "0.5rem", fontWeight: 700 }}>
                      📊 3.3 Análisis de Estabilidad
                    </h3>
                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginBottom: "1rem" }}>
                      Desviación Estándar calculada con <code style={{color: "#A78BFA"}}>np.std()</code>
                    </p>
                    <div style={{ display: "flex", justifyContent: "space-around", marginTop: "1.5rem" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "#00D4FF", lineHeight: 1 }}>{data.req3_visualizacion.estabilidad_v_std}</div>
                        <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", marginTop: "0.5rem" }}>σ Voltaje</div>
                        <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", marginTop: "0.2rem" }}>
                          {data.req3_visualizacion.estabilidad_v_std < 2 ? "✅ Estable" : "⚠️ Variable"}
                        </div>
                      </div>
                      <div style={{ width: "1px", background: "rgba(255,255,255,0.1)" }} />
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "#F59E0B", lineHeight: 1 }}>{data.req3_visualizacion.estabilidad_p_std}</div>
                        <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", marginTop: "0.5rem" }}>σ Potencia</div>
                        <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", marginTop: "0.2rem" }}>
                          {data.req3_visualizacion.estabilidad_p_std < 200 ? "✅ Estable" : "⚠️ Variable"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 3.4: Documentación + Notebook */}
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1.25rem", padding: "1.75rem", backdropFilter: "blur(10px)", flex: 1 }}>
                    <h3 style={{ color: "white", fontSize: "1.1rem", marginBottom: "0.5rem", fontWeight: 700 }}>
                      📓 3.4 Documentación y Jupyter Notebook
                    </h3>
                    <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.82rem", lineHeight: 1.7, marginBottom: "1rem" }}>
                      {data.doc}
                    </p>
                    <button onClick={handleDownloadNotebook} disabled={downloadingNb} style={{
                      width: "100%",
                      background: "linear-gradient(135deg, rgba(167,139,250,0.2), rgba(0,212,255,0.15))",
                      border: "1px solid rgba(167,139,250,0.4)", color: "white",
                      fontSize: "0.9rem", fontWeight: 700, padding: "0.8rem 1.5rem",
                      borderRadius: "0.75rem", cursor: downloadingNb ? "not-allowed" : "pointer",
                      transition: "all 0.3s ease", display: "flex", alignItems: "center",
                      justifyContent: "center", gap: "0.5rem"
                    }}
                      onMouseEnter={e => { if (!downloadingNb) (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg, rgba(167,139,250,0.35), rgba(0,212,255,0.25))"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg, rgba(167,139,250,0.2), rgba(0,212,255,0.15))"; }}
                    >
                      <span style={{ fontSize: "1.2rem" }}>📓</span>
                      {downloadingNb ? "Generando Notebook..." : "Descargar Jupyter Notebook (.ipynb)"}
                    </button>
                    <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", textAlign: "center", marginTop: "0.5rem" }}>
                      Incluye celdas de Markdown con teoría y celdas de código Python con Pandas, NumPy y Matplotlib
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      )}
    </section>
  );
}
