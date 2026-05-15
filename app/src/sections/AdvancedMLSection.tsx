import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { BrainCircuit, Activity, Zap, ShieldAlert, CheckCircle2, BatteryCharging, AlertTriangle, FileSpreadsheet, Info } from 'lucide-react';

interface PredictiveData {
  status: string;
  last_trained: string;
  is_anomaly: boolean;
  alerts: { type: string; message: string }[];
  analisis_general: string;
  future_predictions: {
    hora: string;
    hour_val: number;
    pred_power_mW: number;
    pred_bat_v: number;
    sim_ldr: number;
    sim_panel_v: number;
    explicacion: string;
  }[];
  efficiency_prediction: {
    next_peak_power: number;
    expected_charge_level: number;
  };
  message?: string;
}

export default function AdvancedMLSection() {
  const [data, setData] = useState<PredictiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPredictiveData = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/ml-predictive');
      if (!res.ok) throw new Error('Error al obtener predicciones ML');
      const json = await res.json();
      if (json.status === 'error') throw new Error(json.message);
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictiveData();
    const interval = setInterval(fetchPredictiveData, 15000); // 15s
    return () => clearInterval(interval);
  }, []);

  const exportToExcel = () => {
    window.open('http://localhost:5000/api/ml-export-excel', '_blank');
  };

  if (loading) {
    return (
      <section className="py-20 bg-void-black text-white min-h-[50vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <BrainCircuit className="w-12 h-12 text-primary animate-pulse" />
          <p className="text-xl font-mono text-gray-400">Iniciando Motor Cuántico Predictivo...</p>
        </div>
      </section>
    );
  }

  if (error || !data || data.status === 'training') {
    return (
      <section className="py-20 bg-void-black text-white">
        <div className="container mx-auto px-4">
          <div className="p-8 border border-red-500/30 bg-red-500/10 rounded-2xl flex flex-col items-center text-center">
            <Activity className="w-16 h-16 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Motor de IA Entrenando o no Disponible</h2>
            <p className="text-gray-300">{error || data?.message || "El sistema está recolectando datos en MySQL para el primer entrenamiento."}</p>
          </div>
        </div>
      </section>
    );
  }

  const isHealthy = !data.is_anomaly && data.alerts.length === 0;

  return (
    <section className="py-24 relative overflow-hidden bg-[#050505] text-white border-t border-white/5">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm font-mono mb-4">
              <BrainCircuit className="w-4 h-4" />
              <span>NÚCLEO ML PREDICTIVO (MySQL)</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              Data Science y Predicción
            </h2>
            <p className="text-gray-400 mt-2 text-lg">Predicciones a 24 horas y Análisis de Explicabilidad (XAI).</p>
          </div>

          <div className="flex gap-4">
            <button onClick={exportToExcel} className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 transition-colors">
              <FileSpreadsheet className="w-5 h-5 text-green-400" />
              <span>Descargar Reporte DataScience (Excel)</span>
            </button>
            <div className={`flex items-center gap-3 px-6 py-3 rounded-xl border backdrop-blur-md transition-all duration-500 ${isHealthy ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)]' : 'bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.2)]'}`}>
              {isHealthy ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6 animate-pulse" />}
              <div>
                <div className="text-xs uppercase tracking-wider opacity-80">Estado Modelo</div>
                <div className="font-bold">{isHealthy ? 'Patrones Normales' : 'Anomalía Detectada'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Explicabilidad del Modelo */}
        <div className="mb-10 p-6 rounded-2xl bg-blue-900/20 border border-blue-500/30 backdrop-blur-md">
          <div className="flex items-center gap-3 mb-4">
            <Info className="w-6 h-6 text-blue-400" />
            <h3 className="text-xl font-bold text-blue-100">Análisis del Comportamiento (Explainable AI)</h3>
          </div>
          <p className="text-blue-200/80 leading-relaxed text-lg">
            {data.analisis_general}
          </p>
        </div>

        {/* Alertas */}
        {data.alerts.length > 0 && (
          <div className="mb-8 space-y-3">
            {data.alerts.map((alert, idx) => (
              <div key={idx} className={`p-4 rounded-lg flex items-center gap-4 border ${alert.type === 'critical' ? 'bg-red-500/20 border-red-500/50 text-red-200' : 'bg-orange-500/20 border-orange-500/50 text-orange-200'}`}>
                <ShieldAlert className="w-6 h-6 flex-shrink-0" />
                <p className="font-medium">{alert.message}</p>
              </div>
            ))}
          </div>
        )}

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          {/* Gráfico Potencia Futura */}
          <div className="bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" /> 
              Proyección de Generación (Próximas 24h)
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.future_predictions}>
                  <defs>
                    <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EAB308" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#EAB308" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="hora" stroke="#ffffff50" tick={{fill: '#ffffff50', fontSize: 12}} />
                  <YAxis stroke="#ffffff50" tick={{fill: '#ffffff50', fontSize: 12}} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }}
                    itemStyle={{ color: '#EAB308' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="pred_power_mW" 
                    name="Potencia (mW)" 
                    stroke="#EAB308" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorPower)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico Batería Futura */}
          <div className="bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <BatteryCharging className="w-5 h-5 text-emerald-500" /> 
              Comportamiento Energético (Voltaje Batería)
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.future_predictions}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="hora" stroke="#ffffff50" tick={{fill: '#ffffff50', fontSize: 12}} />
                  <YAxis domain={['auto', 'auto']} stroke="#ffffff50" tick={{fill: '#ffffff50', fontSize: 12}} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }}
                    itemStyle={{ color: '#10B981' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="pred_bat_v" 
                    name="Voltaje Batería (V)" 
                    stroke="#10B981" 
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: '#10B981', stroke: '#000', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Tabla de Predicciones Detallada */}
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-400" /> 
              DataGrid Predictivo (Próximas 24 Horas)
            </h3>
            <span className="text-sm text-gray-400">Datos proyectados con RandomForestRegressor</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-sm">
                  <th className="py-3 px-4 font-medium">Hora</th>
                  <th className="py-3 px-4 font-medium">Radiación LDR</th>
                  <th className="py-3 px-4 font-medium text-yellow-400">Potencia (mW)</th>
                  <th className="py-3 px-4 font-medium text-emerald-400">Batería (V)</th>
                  <th className="py-3 px-4 font-medium">Explicación de la IA</th>
                </tr>
              </thead>
              <tbody>
                {data.future_predictions.map((p, idx) => (
                  <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors text-sm">
                    <td className="py-3 px-4 font-mono text-gray-300 whitespace-nowrap">{p.hora}</td>
                    <td className="py-3 px-4 font-mono">{p.sim_ldr}</td>
                    <td className="py-3 px-4 font-mono font-bold text-yellow-400">{p.pred_power_mW.toFixed(1)}</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">{p.pred_bat_v.toFixed(2)}</td>
                    <td className="py-3 px-4 text-gray-400 max-w-md">{p.explicacion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </section>
  );
}
