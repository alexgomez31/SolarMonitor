// =============================================================================
// SolarMonitor PV - Sección Histórico por Días
// Adaptado a los campos reales del Arduino: ldr, estadoLDR, estado
// =============================================================================

import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  BarChart2, TrendingUp, Eye, Lightbulb, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useDailySummary, useLedAnalysis } from '../hooks/useSolarData';
import type { DayStats, LedSegment } from '../hooks/useSolarData';

gsap.registerPlugin(ScrollTrigger);

// =============================================================================
// GRÁFICA LDR POR DÍA (SVG)
// =============================================================================

const LdrLineChart: React.FC<{ readings: DayStats['readings']; height?: number }> = ({
  readings, height = 200,
}) => {
  if (readings.length < 2) {
    return (
      <div className="flex items-center justify-center text-white/30 font-mono-custom text-sm"
        style={{ height }}>
        Sin suficientes datos
      </div>
    );
  }

  const W = 800; const H = height;
  const PAD = { t: 12, r: 16, b: 32, l: 44 };
  const cW = W - PAD.l - PAD.r;
  const cH = H - PAD.t - PAD.b;

  const ldrs  = readings.map(r => r.ldr);
  const maxLdr = Math.max(...ldrs, 1);

  const toX = (i: number) => PAD.l + (i / (readings.length - 1)) * cW;
  const toY = (v: number) => PAD.t + cH - (v / maxLdr) * cH;

  const path = readings.map((r, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)},${toY(r.ldr)}`).join(' ');

  const step = Math.max(1, Math.floor(readings.length / 6));
  const xLabels = readings
    .map((r, i) => ({ i, hora: r.hora.slice(0, 5) }))
    .filter((_, i) => i % step === 0 || i === readings.length - 1);

  const encendidos = readings.filter(r => r.estadoLDR === 'ENCENDIDO');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
        <line key={i}
          x1={PAD.l} y1={PAD.t + cH * (1 - f)}
          x2={PAD.l + cW} y2={PAD.t + cH * (1 - f)}
          stroke="rgba(255,255,255,0.06)" strokeWidth={1}
        />
      ))}
      {/* Puntos encendidos */}
      {encendidos.map((r, idx) => {
        const i = readings.indexOf(r);
        return <circle key={idx} cx={toX(i)} cy={toY(r.ldr)} r={3}
          fill="#FBBF24" opacity={0.8} />;
      })}
      {/* Línea LDR */}
      <path d={path} fill="none" stroke="#F59E0B" strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
      {/* Eje X */}
      {xLabels.map(({ i, hora }) => (
        <text key={i} x={toX(i)} y={H - 4}
          textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.3)">
          {hora}
        </text>
      ))}
      {/* Y max label */}
      <text x={PAD.l - 4} y={PAD.t + 4} textAnchor="end" fontSize={9} fill="rgba(255,255,255,0.25)">
        {maxLdr}
      </text>
      <text x={PAD.l - 4} y={PAD.t + cH} textAnchor="end" fontSize={9} fill="rgba(255,255,255,0.25)">
        0
      </text>
    </svg>
  );
};

// =============================================================================
// BARRAS COMPARATIVAS (LDR por día)
// =============================================================================

const CompareBar: React.FC<{
  days: string[];
  summary: Record<string, DayStats>;
  type: 'max' | 'avg';
}> = ({ days, summary, type }) => {
  const values = days.map(d => summary[d]?.ldr?.[type] ?? 0);
  const maxVal = Math.max(...values, 1);

  return (
    <div className="space-y-2">
      {days.map((day, i) => {
        const val = values[i];
        const pct = (val / maxVal) * 100;
        const short = day.slice(5);
        return (
          <div key={day} className="flex items-center gap-3">
            <span className="font-mono-custom text-[10px] text-white/40 w-10 flex-shrink-0">{short}</span>
            <div className="flex-1 h-5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: '#F59E0B' }} />
            </div>
            <span className="font-mono-custom text-xs text-white/70 w-14 text-right flex-shrink-0">
              {val.toFixed(0)}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// =============================================================================
// TARJETA DE UN DÍA
// =============================================================================

function durLabel(min: number): string {
  if (min < 1) return `${Math.round(min * 60)}s`;
  if (min < 60) return `${min.toFixed(0)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

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

        <div className="flex items-center gap-2 flex-wrap">
          <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 font-mono-custom text-[10px] text-amber-400">
            <Eye className="w-2.5 h-2.5" /> LDR máx {stats.ldr.max}
          </span>
          {(stats.encendidos ?? 0) > 0 && (
            <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-400/10 border border-yellow-400/20 font-mono-custom text-[10px] text-yellow-400">
              <Lightbulb className="w-2.5 h-2.5" /> {stats.encendidos}× enc.
            </span>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-6 border-t border-white/5">
          {/* Stats rápidos */}
          <div className="grid grid-cols-3 gap-3 mt-4 mb-5">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
              <p className="font-mono-custom text-[10px] text-white/40 uppercase mb-1">LDR Máx</p>
              <p className="font-display text-xl text-amber-400">{stats.ldr.max}</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
              <p className="font-mono-custom text-[10px] text-white/40 uppercase mb-1">LDR Prom</p>
              <p className="font-display text-xl text-amber-400/70">{stats.ldr.avg}</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
              <p className="font-mono-custom text-[10px] text-white/40 uppercase mb-1">Encendidos</p>
              <p className="font-display text-xl text-yellow-400">{stats.encendidos ?? 0}</p>
            </div>
          </div>

          {/* LED info */}
          {ledData && (
            <div className="flex items-center gap-4 mb-4 p-3 rounded-xl bg-amber-400/5 border border-amber-400/15">
              <Lightbulb className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <span className="font-mono-custom text-xs text-white/60">
                Luces encendidas <strong className="text-amber-400">{ledData.encendidos_count} veces</strong>
                {' '}· tiempo total: <strong className="text-amber-400">{durLabel(ledData.total_encendido_min)}</strong>
              </span>
            </div>
          )}

          {/* Gráfica LDR */}
          <div className="mt-2">
            <p className="font-mono-custom text-xs text-white/40 uppercase mb-2 flex items-center gap-2">
              <Eye className="w-3 h-3 text-amber-400" />
              LDR a lo largo del día
              <span className="ml-1 text-amber-400">● ENCENDIDO</span>
            </p>
            <div className="rounded-xl bg-void-black/40 p-3 border border-white/5">
              <LdrLineChart readings={stats.readings} height={200} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

const HistoricoSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef  = useRef<HTMLDivElement>(null);

  const { summary, loading: loadSum, refresh: refreshSum } = useDailySummary();
  const { analysis } = useLedAnalysis();

  const days = Object.keys(summary).sort().reverse();
  const [cmpType, setCmpType] = useState<'max' | 'avg'>('max');

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
        <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
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
            Evolución del sensor LDR y estado de las luces del parque agrupados por día.
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
            {/* Panel comparativo */}
            <div className="p-6 rounded-2xl bg-void-dark/40 border border-white/10 backdrop-blur-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <h4 className="font-display text-lg text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-neon-cyan" />
                  Comparativa LDR entre días
                </h4>
                <div className="flex gap-1">
                  {(['max', 'avg'] as const).map(t => (
                    <button key={t} onClick={() => setCmpType(t)}
                      className={`px-3 py-1 rounded-lg font-mono-custom text-[10px] uppercase transition-all border
                        ${cmpType === t ? 'bg-white/10 text-white border-white/20' : 'text-white/30 border-white/10'}`}>
                      {t === 'max' ? 'Máx' : 'Prom'}
                    </button>
                  ))}
                </div>
              </div>
              <CompareBar days={[...days].reverse()} summary={summary} type={cmpType} />
            </div>

            {/* Tarjetas por día */}
            <h3 className="font-display text-xl text-white flex items-center gap-2 mt-8">
              <Eye className="w-5 h-5 text-amber-400" />
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
