// =============================================================================
// SolarMonitor PV - Sección Histórico por Días
// Gráficas comparativas multi-variable con barras por día
// =============================================================================

import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  BarChart2, TrendingUp, Zap, Activity, Power,
  Lightbulb, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useDailySummary, useLedAnalysis } from '../hooks/useSolarData';
import type { DayStats, DayReading, LedSegment } from '../hooks/useSolarData';

gsap.registerPlugin(ScrollTrigger);

// =============================================================================
// COLORES POR MÉTRICA
// =============================================================================

const METRICS = [
  { key: 'voltage',    label: 'Voltaje',    unit: 'V',   color: '#00D4FF', maxDefault: 5   },
  { key: 'current_mA',label: 'Corriente',  unit: 'mA',  color: '#4D7CFF', maxDefault: 10  },
  { key: 'power_mW',  label: 'Potencia',   unit: 'mW',  color: '#10B981', maxDefault: 50  },
  { key: 'ldr',       label: 'LDR',        unit: '',    color: '#F59E0B', maxDefault: 1024 },
] as const;

type MetricKey = 'voltage' | 'current_mA' | 'power_mW' | 'ldr';

// =============================================================================
// BARRAS COMPARATIVAS (un valor por día)
// =============================================================================

const CompareBar: React.FC<{
  days: string[];
  summary: Record<string, DayStats>;
  metric: (typeof METRICS)[number];
  type: 'max' | 'avg';
}> = ({ days, summary, metric, type }) => {
  const values = days.map(d => (summary[d] as any)[metric.key]?.[type] ?? 0);
  const maxVal = Math.max(...values, 0.001);

  return (
    <div className="space-y-2">
      {days.map((day, i) => {
        const val = values[i];
        const pct = (val / maxVal) * 100;
        const shortDate = day.slice(5); // MM-DD
        return (
          <div key={day} className="flex items-center gap-3">
            <span className="font-mono-custom text-[10px] text-white/40 w-10 flex-shrink-0">{shortDate}</span>
            <div className="flex-1 h-5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: metric.color }}
              />
            </div>
            <span className="font-mono-custom text-xs text-white/70 w-14 text-right flex-shrink-0">
              {val.toFixed(val < 10 ? 2 : 0)} {metric.unit}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// =============================================================================
// GRÁFICA MULTI-LÍNEA SVG POR DÍA
// Todas las métricas en la misma gráfica, normalizadas 0-1, diferenciadas por color
// =============================================================================

const MultiLineChart: React.FC<{ readings: DayReading[]; height?: number }> = ({
  readings, height = 220,
}) => {
  if (readings.length < 2) {
    return (
      <div className="flex items-center justify-center text-white/30 font-mono-custom text-sm"
        style={{ height }}>
        Sin suficientes datos
      </div>
    );
  }

  const W = 800;
  const H = height;
  const PAD = { t: 12, r: 16, b: 32, l: 40 };
  const cW = W - PAD.l - PAD.r;
  const cH = H - PAD.t - PAD.b;

  // Normalizar cada métrica independientemente para que todas sean visibles
  const maxes: Record<MetricKey, number> = {
    voltage:    Math.max(...readings.map(r => r.voltage)),
    current_mA: Math.max(...readings.map(r => r.current_mA)),
    power_mW:   Math.max(...readings.map(r => r.power_mW)),
    ldr:        Math.max(...readings.map(r => r.ldr)),
  };

  const toX = (i: number) => PAD.l + (i / (readings.length - 1)) * cW;
  const toY = (val: number, mx: number) =>
    PAD.t + cH - (mx > 0 ? (val / mx) * cH : 0);

  const makePath = (key: MetricKey) => {
    const pts = readings.map((r, i) => `${toX(i)},${toY((r as any)[key], maxes[key])}`);
    return `M ${pts.join(' L ')}`;
  };

  // Etiquetas del eje X (hora) — mostrar solo algunas
  const step = Math.max(1, Math.floor(readings.length / 6));
  const xLabels = readings
    .map((r, i) => ({ i, hora: r.hora.slice(0, 5) }))
    .filter((_, i) => i % step === 0 || i === readings.length - 1);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height }}
      preserveAspectRatio="none"
    >
      {/* Grid horizontal */}
      {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
        <line key={i}
          x1={PAD.l} y1={PAD.t + cH * (1 - f)}
          x2={PAD.l + cW} y2={PAD.t + cH * (1 - f)}
          stroke="rgba(255,255,255,0.06)" strokeWidth={1}
        />
      ))}

      {/* Líneas de cada métrica */}
      {METRICS.map(m => (
        <path
          key={m.key}
          d={makePath(m.key)}
          fill="none"
          stroke={m.color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.9}
        />
      ))}

      {/* Eje X */}
      {xLabels.map(({ i, hora }) => (
        <text key={i} x={toX(i)} y={H - 4}
          textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.3)">
          {hora}
        </text>
      ))}
    </svg>
  );
};

// =============================================================================
// LEYENDA DE COLORES PARA EL GRÁFICO MULTI-LÍNEA
// =============================================================================

const ChartLegend: React.FC = () => (
  <div className="flex flex-wrap gap-4 mt-2 mb-3">
    {METRICS.map(m => (
      <div key={m.key} className="flex items-center gap-1.5">
        <div className="w-5 h-1.5 rounded-full" style={{ backgroundColor: m.color }} />
        <span className="font-mono-custom text-[10px] text-white/50 uppercase">
          {m.label} {m.unit && `(${m.unit})`}
        </span>
      </div>
    ))}
  </div>
);

// =============================================================================
// DURACIÓN FORMATEADA
// =============================================================================

function durLabel(min: number): string {
  if (min < 1) return `${Math.round(min * 60)}s`;
  if (min < 60) return `${min.toFixed(0)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

// =============================================================================
// TARJETA DE UN DÍA
// =============================================================================

const DayCard: React.FC<{
  fecha: string;
  stats: DayStats;
  ledData?: { encendidos_count: number; total_encendido_min: number; segmentos: LedSegment[] };
}> = ({ fecha, stats, ledData }) => {
  const [open, setOpen] = useState(false);

  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const [y, m, d] = fecha.split('-');
  const label = `${d} ${meses[parseInt(m) - 1]} ${y}`;

  return (
    <div className="rounded-2xl border border-white/10 bg-void-dark/40 backdrop-blur-sm overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neon-cyan/10 flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-neon-cyan" />
          </div>
          <div className="text-left">
            <p className="font-display text-white text-base">{label}</p>
            <p className="font-mono-custom text-xs text-white/40">{stats.count} registros</p>
          </div>
        </div>

        {/* Badges resumen */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-400/10 border border-cyan-400/20 font-mono-custom text-[10px] text-cyan-400">
            <Zap className="w-2.5 h-2.5" /> {stats.voltage.max}V
          </span>
          <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-400/10 border border-green-400/20 font-mono-custom text-[10px] text-green-400">
            <Power className="w-2.5 h-2.5" /> {stats.power_mW.max}mW
          </span>
          {ledData && ledData.encendidos_count > 0 && (
            <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 font-mono-custom text-[10px] text-amber-400">
              <Lightbulb className="w-2.5 h-2.5" /> {ledData.encendidos_count}× enc.
            </span>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-6 border-t border-white/5">

          {/* Estadísticas rápidas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 mb-5">
            {METRICS.map(metric => {
              const d = (stats as any)[metric.key];
              return (
                <div key={metric.key} className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-1 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: metric.color }} />
                    <span className="font-mono-custom text-[10px] text-white/40 uppercase">{metric.label}</span>
                  </div>
                  <p className="font-display text-lg" style={{ color: metric.color }}>
                    {d.max.toFixed(d.max < 10 ? 2 : 0)} <span className="text-xs text-white/40">{metric.unit}</span>
                  </p>
                  <p className="font-mono-custom text-[10px] text-white/30">
                    prom: {d.avg.toFixed(d.avg < 10 ? 2 : 0)} {metric.unit}
                  </p>
                </div>
              );
            })}
          </div>

          {/* LED info si existe */}
          {ledData && (
            <div className="flex items-center gap-4 mb-4 p-3 rounded-xl bg-amber-400/5 border border-amber-400/15">
              <Lightbulb className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <span className="font-mono-custom text-xs text-white/60">
                Luces encendidas <strong className="text-amber-400">{ledData.encendidos_count} veces</strong>
                {' '}· tiempo total encendido: <strong className="text-amber-400">{durLabel(ledData.total_encendido_min)}</strong>
              </span>
            </div>
          )}

          {/* Gráfica multi-línea */}
          <div className="mt-2">
            <p className="font-mono-custom text-xs text-white/40 uppercase mb-1">
              Todas las métricas — escala normalizada independiente
            </p>
            <ChartLegend />
            <div className="rounded-xl bg-void-black/40 p-3 border border-white/5">
              <MultiLineChart readings={stats.readings} height={220} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// BARRAS COMPARATIVAS POR DÍA (panel completo)
// =============================================================================

const ComparativePanel: React.FC<{
  days: string[];
  summary: Record<string, DayStats>;
}> = ({ days, summary }) => {
  const [metric, setMetric] = useState<(typeof METRICS)[number]>(METRICS[0]);
  const [type, setType]     = useState<'max' | 'avg'>('max');

  return (
    <div className="p-6 rounded-2xl bg-void-dark/40 border border-white/10 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h4 className="font-display text-lg text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-neon-cyan" />
          Comparativa entre días
        </h4>
        <div className="flex items-center gap-2">
          {/* Selector de métrica */}
          <div className="flex gap-1">
            {METRICS.map(m => (
              <button key={m.key}
                onClick={() => setMetric(m)}
                className="px-2 py-1 rounded-lg font-mono-custom text-[10px] uppercase transition-all"
                style={{
                  backgroundColor: metric.key === m.key ? `${m.color}25` : 'rgba(255,255,255,0.05)',
                  color: metric.key === m.key ? m.color : 'rgba(255,255,255,0.4)',
                  border: metric.key === m.key ? `1px solid ${m.color}50` : '1px solid rgba(255,255,255,0.1)',
                }}>
                {m.label}
              </button>
            ))}
          </div>
          {/* Max / Promedio */}
          <div className="flex gap-1">
            {(['max', 'avg'] as const).map(t => (
              <button key={t}
                onClick={() => setType(t)}
                className={`px-2 py-1 rounded-lg font-mono-custom text-[10px] uppercase transition-all border
                  ${type === t
                    ? 'bg-white/10 text-white border-white/20'
                    : 'bg-transparent text-white/30 border-white/10'}`}>
                {t === 'max' ? 'Máx' : 'Prom'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <CompareBar days={days} summary={summary} metric={metric} type={type} />
    </div>
  );
};

// =============================================================================
// COMPONENTE PRINCIPAL - HistoricoSection
// =============================================================================

const HistoricoSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef  = useRef<HTMLDivElement>(null);

  const { summary, loading: loadSum, refresh: refreshSum } = useDailySummary();
  const { analysis }                                         = useLedAnalysis();

  const days = Object.keys(summary).sort().reverse();

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(headerRef.current, { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 82%' } });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="historico"
      ref={sectionRef}
      className="relative w-full min-h-screen bg-void-black py-20 px-4 sm:px-6 lg:px-8"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-neon-cyan/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">

        {/* Header */}
        <div ref={headerRef} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 mb-6">
            <BarChart2 className="w-4 h-4 text-neon-cyan" />
            <span className="font-mono-custom text-xs uppercase tracking-wider text-neon-cyan">
              Historial Completo
            </span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl text-white mb-4">
            Análisis por<span className="text-neon-cyan"> Días</span>
          </h2>
          <p className="font-mono-custom text-white/50 max-w-2xl mx-auto">
            Voltaje, corriente, potencia y LDR agrupados por día en la misma gráfica.
            Barras comparativas y detalle de encendidos de luces.
          </p>
        </div>

        {/* Refresh */}
        <div className="flex justify-end mb-6">
          <button onClick={refreshSum}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 text-white/60
              hover:border-neon-cyan/40 hover:text-neon-cyan transition-all font-mono-custom text-xs uppercase">
            <RefreshCw className="w-3 h-3" />
            Actualizar
          </button>
        </div>

        {loadSum ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : days.length === 0 ? (
          <div className="text-center py-20 text-white/30 font-mono-custom">Sin datos históricos</div>
        ) : (
          <div className="space-y-6">
            {/* Panel comparativo entre días */}
            <ComparativePanel days={[...days].reverse()} summary={summary} />

            {/* Tarjetas por día */}
            <h3 className="font-display text-xl text-white flex items-center gap-2 mt-8">
              <Activity className="w-5 h-5 text-neon-cyan" />
              Detalle por Día
            </h3>
            {days.map(fecha => (
              <DayCard
                key={fecha}
                fecha={fecha}
                stats={summary[fecha]}
                ledData={analysis[fecha]}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default HistoricoSection;
