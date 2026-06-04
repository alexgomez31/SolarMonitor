import { useState } from "react";
import { useReq3 } from "../hooks/useReq3";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from "recharts";

// ── Tooltip Custom ────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="req3-tooltip" style={{
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

export default function Req3Section() {
  const { data, loading, error, refresh } = useReq3(60000);
  const [activeTab, setActiveTab] = useState<"req1" | "req2" | "req3">("req1");

  const tabs = [
    { id: "req1", label: "📐 Req 1: Modelado Físico" },
    { id: "req2", label: "📊 Req 2: Eficiencia" },
    { id: "req3", label: "📈 Req 3: Visualización" },
  ] as const;

  return (
    <section id="req3" className="req3-section" style={{
      padding: "6rem 2rem", background: "linear-gradient(180deg, #050508 0%, #081010 40%, #050508 100%)",
      position: "relative", minHeight: "100vh"
    }}>
      {/* Header */}
      <div className="req3-header" style={{ textAlign: "center", maxWidth: "800px", margin: "0 auto 3rem" }}>
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
          Implementación de la Ley de Ohm, cálculo de potencia, modelado de descarga, análisis de eficiencia y generación de informes con Pandas y NumPy.
        </p>
        
        <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
          <button onClick={refresh} disabled={loading} style={{
            background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)",
            color: "#10B981", fontSize: "0.8rem", fontWeight: 600, padding: "0.5rem 1.2rem",
            borderRadius: "2rem", cursor: loading ? "not-allowed" : "pointer"
          }}>
            {loading ? "⏳ Procesando..." : "↻ Recalcular Análisis"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", color: "#EF4444", padding: "2rem", background: "rgba(239,68,68,0.1)", borderRadius: "1rem" }}>
          <h3>Error cargando datos</h3>
          <p>{error}</p>
        </div>
      )}

      {loading && !data && (
        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", marginTop: "3rem" }}>
          <p>⏳ Procesando estructuras de datos en Pandas y calculando variables físicas...</p>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
              
              {/* Card 1.1: Funciones físicas */}
              <div className="req3-card" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1.25rem", padding: "1.75rem", backdropFilter: "blur(10px)" }}>
                <h3 style={{ color: "white", fontSize: "1.1rem", marginBottom: "0.5rem", fontWeight: 700 }}>1.1 Funciones Físicas</h3>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>Aplicación de fórmulas en Python para cada lectura</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ background: "rgba(0,0,0,0.3)", padding: "1rem", borderRadius: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                      <span style={{ color: "#00D4FF" }}>Ley de Ohm (R = V/I)</span>
                      <strong>{data.req1_modelado.resistencia_promedio_ohm} Ω</strong>
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>Promedio histórico del panel</span>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.3)", padding: "1rem", borderRadius: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                      <span style={{ color: "#10B981" }}>Potencia (P = V×I)</span>
                      <strong>{data.req1_modelado.potencia_promedio_mw} mW</strong>
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>Promedio de generación</span>
                  </div>
                </div>
              </div>

              {/* Card 1.2: Datasets Pandas */}
              <div className="req3-card" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1.25rem", padding: "1.75rem", backdropFilter: "blur(10px)" }}>
                <h3 style={{ color: "white", fontSize: "1.1rem", marginBottom: "0.5rem", fontWeight: 700 }}>1.2 Importar Datasets</h3>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>Lecturas cargadas en DataFrame de Pandas</p>
                <div style={{ textAlign: "center", marginTop: "2rem" }}>
                  <div style={{ fontSize: "3rem", fontWeight: 800, color: "#A78BFA", lineHeight: 1 }}>{data.req1_modelado.total_registros}</div>
                  <div style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.6)", marginTop: "0.5rem" }}>filas importadas y procesadas</div>
                </div>
              </div>

              {/* Card 1.3: Energía Total */}
              <div className="req3-card" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1.25rem", padding: "1.75rem", backdropFilter: "blur(10px)" }}>
                <h3 style={{ color: "white", fontSize: "1.1rem", marginBottom: "0.5rem", fontWeight: 700 }}>1.3 Procesar Variables</h3>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>Cálculo de columnas de Energía en mWs (Joules)</p>
                <div style={{ textAlign: "center", marginTop: "2rem" }}>
                  <div style={{ fontSize: "3rem", fontWeight: 800, color: "#F59E0B", lineHeight: 1 }}>{data.req1_modelado.energia_total_j}</div>
                  <div style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.6)", marginTop: "0.5rem" }}>Joules totales generados</div>
                </div>
              </div>

              {/* Card 1.4: Limpiar Datos */}
              <div className="req3-card" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1.25rem", padding: "1.75rem", backdropFilter: "blur(10px)" }}>
                <h3 style={{ color: "white", fontSize: "1.1rem", marginBottom: "0.5rem", fontWeight: 700 }}>1.4 Limpiar Datos</h3>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>Técnicas de filtrado aplicadas al DataFrame</p>
                <ul style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.9rem", paddingLeft: "1.2rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <li><strong>Interpolación:</strong> Relleno de datos nulos (Na/NaN) linealmente.</li>
                  <li><strong>Media Móvil:</strong> Suavizado de ruido con <code style={{color:"#00D4FF"}}>rolling(window=3).mean()</code>.</li>
                  <li><strong>Clip:</strong> Limitación de rangos anómalos.</li>
                </ul>
              </div>
            </div>
          )}

          {/* ── TAB 2: ANÁLISIS DE DATOS Y EFICIENCIA ── */}
          {activeTab === "req2" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
              
              {/* Card 2.1: Eficiencia */}
              <div className="req3-card" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1.25rem", padding: "1.75rem", backdropFilter: "blur(10px)" }}>
                <h3 style={{ color: "white", fontSize: "1.1rem", marginBottom: "0.5rem", fontWeight: 700 }}>2.1 Eficiencia de Transferencia</h3>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>Rendimiento del convertidor (Panel a Batería)</p>
                <div style={{ textAlign: "center", marginTop: "1rem" }}>
                  <div style={{ fontSize: "3.5rem", fontWeight: 800, color: "#10B981", lineHeight: 1 }}>{data.req2_eficiencia.eficiencia_convertidor_pct}%</div>
                  <div style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.6)", marginTop: "0.5rem" }}>de eficiencia promedio calculada</div>
                </div>
              </div>

              {/* Card 2.2: Error Teórico */}
              <div className="req3-card" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1.25rem", padding: "1.75rem", backdropFilter: "blur(10px)" }}>
                <h3 style={{ color: "white", fontSize: "1.1rem", marginBottom: "0.5rem", fontWeight: 700 }}>2.2 Error Porcentual</h3>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>Desviación del voltaje medido respecto al teórico (según LDR)</p>
                <div style={{ textAlign: "center", marginTop: "1rem" }}>
                  <div style={{ fontSize: "3.5rem", fontWeight: 800, color: "#EF4444", lineHeight: 1 }}>{data.req2_eficiencia.error_voltaje_promedio_pct}%</div>
                  <div style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.6)", marginTop: "0.5rem" }}>de error promedio global</div>
                </div>
              </div>

              {/* Card 2.3: Modelar Descarga */}
              <div className="req3-card" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1.25rem", padding: "1.75rem", backdropFilter: "blur(10px)" }}>
                <h3 style={{ color: "white", fontSize: "1.1rem", marginBottom: "0.5rem", fontWeight: 700 }}>2.3 Regresión de Descarga</h3>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>Modelo lineal de batería en estado de descarga</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "0.5rem" }}>
                    <span style={{ color: "rgba(255,255,255,0.6)" }}>Pendiente (Slope)</span>
                    <strong style={{ color: "#A78BFA" }}>{data.req2_eficiencia.descarga_slope} V/hr</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "0.5rem" }}>
                    <span style={{ color: "rgba(255,255,255,0.6)" }}>Coef. Determinación (R²)</span>
                    <strong style={{ color: "#00D4FF" }}>{data.req2_eficiencia.descarga_r2}</strong>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>Calculado usando np.polyfit(X, y, 1)</span>
                </div>
              </div>

              {/* Card 2.4: Pérdidas */}
              <div className="req3-card" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1.25rem", padding: "1.75rem", backdropFilter: "blur(10px)" }}>
                <h3 style={{ color: "white", fontSize: "1.1rem", marginBottom: "0.5rem", fontWeight: 700 }}>2.4 Detectar Caídas de Tensión</h3>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>Gradientes negativos abruptos detectados vía np.diff()</p>
                <div style={{ maxHeight: "150px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {data.req2_eficiencia.caidas_tension.length === 0 ? (
                    <div style={{ color: "#10B981", textAlign: "center", marginTop: "1rem" }}>✅ No se detectaron caídas bruscas.</div>
                  ) : (
                    data.req2_eficiencia.caidas_tension.map((c, i) => (
                      <div key={i} style={{ background: "rgba(239,68,68,0.1)", borderLeft: "3px solid #EF4444", padding: "0.5rem", borderRadius: "0.5rem" }}>
                        <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>Hora: {c.hora}</div>
                        <div style={{ fontWeight: 700, color: "white" }}>Caída: {c.caida}V</div>
                        <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>De {c.v_anterior}V a {c.v_actual}V</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 3: VISUALIZACIÓN ── */}
          {activeTab === "req3" && (
            <div style={{ display: "grid", gap: "1.5rem" }}>
              
              {/* Card 3.1: Gráficas comparativas */}
              <div className="req3-card" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1.25rem", padding: "1.75rem", backdropFilter: "blur(10px)" }}>
                <h3 style={{ color: "white", fontSize: "1.1rem", marginBottom: "0.5rem", fontWeight: 700 }}>3.1 Gráfica Comparativa (Voltaje: Teórico vs Real)</h3>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>Curvas superpuestas de las últimas 60 lecturas</p>
                <div style={{ height: "300px", width: "100%" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.req3_visualizacion.grafica_comparativa} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="hora" stroke="rgba(255,255,255,0.3)" tick={{fill:"rgba(255,255,255,0.5)", fontSize: 10}} />
                      <YAxis stroke="rgba(255,255,255,0.3)" tick={{fill:"rgba(255,255,255,0.5)", fontSize: 10}} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="real_v" name="Voltaje Real (V)" stroke="#00D4FF" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="teorico_v" name="Voltaje Teórico (V)" stroke="#EF4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
                {/* Card 3.2: Tablas resumen */}
                <div className="req3-card" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1.25rem", padding: "1.75rem", backdropFilter: "blur(10px)" }}>
                  <h3 style={{ color: "white", fontSize: "1.1rem", marginBottom: "0.5rem", fontWeight: 700 }}>3.2 Tabla Resumen (DataFrames Pandas)</h3>
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>Agrupado por día (mean, max)</p>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", color: "rgba(255,255,255,0.8)" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", textAlign: "left" }}>
                          <th style={{ padding: "0.5rem" }}>Fecha</th>
                          <th style={{ padding: "0.5rem" }}>V_Prom</th>
                          <th style={{ padding: "0.5rem" }}>V_Max</th>
                          <th style={{ padding: "0.5rem" }}>Error%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.req3_visualizacion.tabla_resumen.map((r, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            <td style={{ padding: "0.5rem" }}>{r.fecha}</td>
                            <td style={{ padding: "0.5rem", color: "#00D4FF" }}>{r.v_mean}V</td>
                            <td style={{ padding: "0.5rem", color: "#10B981" }}>{r.v_max}V</td>
                            <td style={{ padding: "0.5rem", color: "#EF4444" }}>{r.error_mean}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  {/* Card 3.3: Estabilidad (Desviación) */}
                  <div className="req3-card" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1.25rem", padding: "1.75rem", backdropFilter: "blur(10px)", flex: 1 }}>
                    <h3 style={{ color: "white", fontSize: "1.1rem", marginBottom: "0.5rem", fontWeight: 700 }}>3.3 Análisis de Estabilidad</h3>
                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>Desviación Estándar calculada con NumPy</p>
                    <div style={{ display: "flex", justifyContent: "space-around", marginTop: "2rem" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "#00D4FF", lineHeight: 1 }}>{data.req3_visualizacion.estabilidad_v_std}</div>
                        <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", marginTop: "0.5rem" }}>Voltaje (σ)</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "#F59E0B", lineHeight: 1 }}>{data.req3_visualizacion.estabilidad_p_std}</div>
                        <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", marginTop: "0.5rem" }}>Potencia (σ)</div>
                      </div>
                    </div>
                  </div>

                  {/* Card 3.4: Documentación */}
                  <div className="req3-card" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1.25rem", padding: "1.75rem", backdropFilter: "blur(10px)", flex: 1 }}>
                    <h3 style={{ color: "white", fontSize: "1.1rem", marginBottom: "0.5rem", fontWeight: 700 }}>3.4 Documentación de Código</h3>
                    <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem", lineHeight: 1.6 }}>
                      {data.doc}
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
