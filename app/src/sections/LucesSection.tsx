// =============================================================================
// SolarMonitor PV - Sección Luces del Parque
// Análisis detallado del estado de las luces LED (ENCENDIDAS/APAGADAS) por día
// =============================================================================

import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Moon, CloudSun, Clock, BarChart2, ChevronDown, ChevronUp, RefreshCw, Lightbulb, LightbulbOff,
} from 'lucide-react';

import { useLedAnalysis, useSolarData } from '../hooks/useSolarData';
import type { LedSegment } from '../hooks/useSolarData';

gsap.registerPlugin(ScrollTrigger);

// =============================================================================
// UTILIDADES
// =============================================================================

function duracionLabel(min: number): string {
  if (min < 1) return `${Math.round(min * 60)}s`;
  if (min < 60) return `${min.toFixed(0)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

// =============================================================================
// SUB-COMPONENTE: Timeline de un día
// =============================================================================

const DayTimeline: React.FC<{ segmentos: LedSegment[] }> = ({ segmentos }) => {
  // Calcular rango total del día en minutos para escalar la barra
  if (segmentos.length === 0) return null;

  const toMin = (hora: string) => {
    const [h, m, s] = hora.split(':').map(Number);
    return h * 60 + m + (s || 0) / 60;
  };

  const dayStart = toMin(segmentos[0].hora_inicio);
  const dayEnd   = toMin(segmentos[segmentos.length - 1].hora_fin);
  const daySpan  = Math.max(dayEnd - dayStart, 1);

  return (
    <div className="mt-3 mb-1">
      <div className="flex text-[10px] font-mono-custom text-white/30 justify-between mb-1">
        <span>{segmentos[0].hora_inicio.slice(0, 5)}</span>
        <span>{segmentos[segmentos.length - 1].hora_fin.slice(0, 5)}</span>
      </div>
      <div className="relative h-6 rounded-full overflow-hidden bg-white/5 flex">
        {segmentos.map((seg, i) => {
          const start  = toMin(seg.hora_inicio);
          const end    = toMin(seg.hora_fin);
          const left   = ((start - dayStart) / daySpan) * 100;
          const width  = Math.max(((end - start) / daySpan) * 100, 0.5);
          return (
            <div
              key={i}
              className="absolute h-full rounded-sm transition-all"
              style={{
                left:  `${left}%`,
                width: `${width}%`,
                backgroundColor: seg.estado === 'ENCENDIDAS'
                  ? 'rgba(251,191,36,0.85)'
                  : 'rgba(99,102,241,0.2)',
              }}
              title={`${seg.estado} · ${seg.hora_inicio} → ${seg.hora_fin} (${duracionLabel(seg.duracion_min)})`}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-1">
        <span className="flex items-center gap-1 text-[10px] font-mono-custom text-amber-400/70">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Encendidas
        </span>
        <span className="flex items-center gap-1 text-[10px] font-mono-custom text-indigo-400/70">
          <span className="w-2 h-2 rounded-full bg-indigo-400/40 inline-block" /> Apagadas
        </span>
      </div>
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTE: Tarjeta de un día
// =============================================================================

const DayCard: React.FC<{
  fecha: string;
  data: {
    segmentos: LedSegment[];
    encendidos_count: number;
    total_encendido_min: number;
    total_apagado_min: number;
  };
}> = ({ fecha, data }) => {
  const [open, setOpen] = useState(false);

  const formatFecha = (f: string) => {
    const [y, m, d] = f.split('-');
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${d} ${meses[parseInt(m) - 1]} ${y}`;
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-void-dark/40 backdrop-blur-sm overflow-hidden">
      {/* Header de la tarjeta */}
      <button
        className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center
            ${data.encendidos_count > 0 ? 'bg-amber-400/20' : 'bg-white/5'}`}>
            <Lightbulb className={`w-5 h-5 ${data.encendidos_count > 0 ? 'text-amber-400' : 'text-white/30'}`} />
          </div>
          <div className="text-left">
            <p className="font-display text-white text-base">{formatFecha(fecha)}</p>
            <p className="font-mono-custom text-xs text-white/40">
              {data.encendidos_count === 0
                ? 'Sin luces registradas'
                : data.encendidos_count === 1
                  ? '1 periodo con luces'
                  : `${data.encendidos_count} periodos con luces`}
            </p>
          </div>
        </div>

        {/* Badges rápidos */}
        <div className="flex items-center gap-3">
          {data.total_encendido_min > 0 && (
            <div className="hidden sm:flex items-center gap-1 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20">
              <Lightbulb className="w-3 h-3 text-amber-400" />
              <span className="font-mono-custom text-xs text-amber-400">
                {duracionLabel(data.total_encendido_min)} enc.
              </span>
            </div>
          )}
          {data.total_apagado_min > 0 && (
            <div className="hidden sm:flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-400/10 border border-indigo-400/20">
              <Moon className="w-3 h-3 text-indigo-400" />
              <span className="font-mono-custom text-xs text-indigo-400">
                {duracionLabel(data.total_apagado_min)} apg.
              </span>
            </div>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
        </div>
      </button>

      {/* Detalle expandible */}
      {open && (
        <div className="px-5 pb-5 border-t border-white/5">
          {/* Timeline gráfico */}
          <DayTimeline segmentos={data.segmentos} />

          {/* Resumen numérico */}
          <div className="grid grid-cols-3 gap-3 mt-4 mb-4">
            <div className="text-center p-3 rounded-xl bg-amber-400/5 border border-amber-400/15">
              <p className="font-display text-xl text-amber-400">{data.encendidos_count}</p>
              <p className="font-mono-custom text-[10px] text-white/40 uppercase">Veces enc.</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
              <p className="font-display text-xl text-neon-cyan">{duracionLabel(data.total_encendido_min)}</p>
              <p className="font-mono-custom text-[10px] text-white/40 uppercase">T. Encendido</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
              <p className="font-display text-xl text-indigo-400">{duracionLabel(data.total_apagado_min)}</p>
              <p className="font-mono-custom text-[10px] text-white/40 uppercase">T. Apagado</p>
            </div>
          </div>

          {/* Tabla de segmentos */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 font-mono-custom text-xs text-white/40 uppercase">Estado</th>
                  <th className="text-left py-2 font-mono-custom text-xs text-white/40 uppercase">Inicio</th>
                  <th className="text-left py-2 font-mono-custom text-xs text-white/40 uppercase">Fin</th>
                  <th className="text-right py-2 font-mono-custom text-xs text-white/40 uppercase">Duración</th>
                </tr>
              </thead>
              <tbody>
                {data.segmentos.map((seg, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono-custom
                        ${seg.estado === 'ENCENDIDAS'
                          ? 'bg-amber-400/15 text-amber-400'
                          : 'bg-indigo-400/15 text-indigo-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${seg.estado === 'ENCENDIDAS' ? 'bg-amber-400' : 'bg-indigo-400'}`} />
                        {seg.estado}
                      </span>
                    </td>
                    <td className="py-2 font-mono-custom text-xs text-white/60">{seg.hora_inicio}</td>
                    <td className="py-2 font-mono-custom text-xs text-white/60">{seg.hora_fin}</td>
                    <td className="py-2 text-right font-mono-custom text-xs text-white/80">
                      {duracionLabel(seg.duracion_min)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// COMPONENTE PRINCIPAL - LucesSection
// =============================================================================

const LucesSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef  = useRef<HTMLDivElement>(null);
  const cardsRef   = useRef<HTMLDivElement>(null);

  const { data }                 = useSolarData();
  const { analysis, loading, refresh } = useLedAnalysis();

  const lucesOn  = data.estadoLuces?.toUpperCase() === 'ENCENDIDAS';
  const hayLuz = data.estadoFotocelda?.toUpperCase() === 'LUZ';
  const days   = Object.keys(analysis).sort().reverse();

  // Totales globales
  const totalEncendidos    = days.reduce((s, d) => s + (analysis[d]?.encendidos_count ?? 0), 0);
  const totalEncendidoMin  = days.reduce((s, d) => s + (analysis[d]?.total_encendido_min ?? 0), 0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const cfg = (trigger: Element | null) => ({
        trigger, start: 'top 82%', toggleActions: 'play none none none',
      });
      gsap.fromTo(headerRef.current, { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', scrollTrigger: cfg(sectionRef.current) });
      gsap.fromTo(cardsRef.current?.children || [], { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power3.out', scrollTrigger: cfg(cardsRef.current) });
    }, sectionRef);
    return () => ctx.revert();
  }, [days.length]);

  return (
    <section
      id="luces"
      ref={sectionRef}
      className="relative w-full min-h-screen bg-void-black py-20 px-4 sm:px-6 lg:px-8"
    >
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">

        {/* ── Header ── */}
        <div ref={headerRef} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-400/10 border border-amber-400/30 mb-6">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span className="font-mono-custom text-xs uppercase tracking-wider text-amber-400">
              Luces LED (Alumbrado)
            </span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl text-white mb-4">
            Análisis de<span className="text-amber-400"> Iluminación</span>
          </h2>
          <p className="font-mono-custom text-white/50 max-w-2xl mx-auto">
            Historial de periodos de iluminación LED. Segmentos por día con duración y frecuencia de las luces encendidas.
          </p>
        </div>

        {/* ── Estado actual + resumen global ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">

          {/* Estado ahora */}
          {/* Estado ahora */}
          <div className={`col-span-2 sm:col-span-1 flex flex-col items-center justify-center p-5 rounded-2xl border
            ${lucesOn ? 'bg-amber-400/10 border-amber-400/30' : 'bg-indigo-400/10 border-indigo-400/20'}`}>
            <div className="relative mb-2">
              {lucesOn
                ? <Lightbulb className="w-10 h-10 text-amber-400" />
                : <LightbulbOff className="w-10 h-10 text-indigo-400/50" />}
              {lucesOn && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 animate-ping" />}
            </div>
            <p className="font-mono-custom text-xs text-white/40 uppercase">Luces Ahora</p>
            <p className={`font-display text-lg font-bold ${lucesOn ? 'text-amber-400' : 'text-indigo-400'}`}>
              {data.estadoLuces || 'APAGADAS'}
            </p>
          </div>

          {/* Ambiente */}
          <div className="flex flex-col items-center justify-center p-5 rounded-2xl border border-white/10 bg-white/5">
            {hayLuz ? <CloudSun className="w-8 h-8 text-sky-400 mb-2" /> : <Moon className="w-8 h-8 text-indigo-400 mb-2" />}
            <p className="font-mono-custom text-xs text-white/40 uppercase">Ambiente</p>
            <p className={`font-display text-lg font-bold ${hayLuz ? 'text-sky-400' : 'text-indigo-400'}`}>
              {hayLuz ? 'DÍA' : 'NOCHE'}
            </p>
          </div>

          {/* Total encendidos histórico */}
          <div className="flex flex-col items-center justify-center p-5 rounded-2xl border border-white/10 bg-white/5">
            <BarChart2 className="w-8 h-8 text-neon-cyan mb-2" />
            <p className="font-mono-custom text-xs text-white/40 uppercase">Periodos Luces</p>
            <p className="font-display text-2xl font-bold text-neon-cyan">{totalEncendidos}</p>
          </div>

          {/* Tiempo total encendido */}
          <div className="flex flex-col items-center justify-center p-5 rounded-2xl border border-white/10 bg-white/5">
            <Clock className="w-8 h-8 text-amber-400 mb-2" />
            <p className="font-mono-custom text-xs text-white/40 uppercase">Tiempo luces total</p>
            <p className="font-display text-2xl font-bold text-amber-400">{duracionLabel(totalEncendidoMin)}</p>
          </div>
        </div>

        {/* ── Historial por días ── */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-2xl text-white flex items-center gap-3">
            <Clock className="w-6 h-6 text-amber-400" />
            Historial por Día
          </h3>
          <button
            onClick={refresh}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 text-white/60
              hover:border-amber-400/40 hover:text-amber-400 transition-all font-mono-custom text-xs uppercase"
          >
            <RefreshCw className="w-3 h-3" />
            Actualizar
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : days.length === 0 ? (
          <div className="text-center py-20 text-white/30 font-mono-custom">
            No hay datos de LED disponibles
          </div>
        ) : (
          <div ref={cardsRef} className="space-y-4">
            {days.map(fecha => (
              <DayCard key={fecha} fecha={fecha} data={analysis[fecha]} />
            ))}
          </div>
        )}

      </div>
    </section>
  );
};

export default LucesSection;
