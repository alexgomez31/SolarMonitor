// =============================================================================
// SolarMonitor PV - Dashboard Section (Tiempo Real)
// Datos reales del Arduino: ldr, estadoLDR, estado (batería)
// =============================================================================

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Activity, Eye, Battery, BatteryCharging, BatteryMedium,
  CloudSun, Moon, Zap, Sun,
} from 'lucide-react';

import RealTimeChart from '../components/RealTimeChart';
import ConnectionStatus from '../components/ConnectionStatus';
import PollingToggle from '../components/PollingToggle';
import {
  useSolarData, useRealtimeBuffer, useHistoryData, useSolarStats,
} from '../hooks/useSolarData';

gsap.registerPlugin(ScrollTrigger);

// ─── Helpers ────────────────────────────────────────────────────────────────

function EstadoBateriaIcon({ estado }: { estado: string }) {
  if (estado === 'CARGANDO')     return <BatteryCharging className="w-8 h-8 text-emerald-400" />;
  if (estado === 'EQUILIBRIO')   return <BatteryMedium   className="w-8 h-8 text-sky-400" />;
  if (estado === 'DESCARGANDO')  return <Battery          className="w-8 h-8 text-red-400" />;
  return <Battery className="w-8 h-8 text-white/30" />;
}

function estadoColor(estado: string) {
  if (estado === 'CARGANDO')    return 'text-emerald-400';
  if (estado === 'EQUILIBRIO')  return 'text-sky-400';
  if (estado === 'DESCARGANDO') return 'text-red-400';
  return 'text-white/40';
}

function estadoBg(estado: string) {
  if (estado === 'CARGANDO')    return 'bg-emerald-500/10 border-emerald-400/30';
  if (estado === 'EQUILIBRIO')  return 'bg-sky-500/10 border-sky-400/30';
  if (estado === 'DESCARGANDO') return 'bg-red-500/10 border-red-400/30';
  return 'bg-white/5 border-white/10';
}

// ─── Componente principal ────────────────────────────────────────────────────

const DashboardSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef  = useRef<HTMLDivElement>(null);
  const cardsRef   = useRef<HTMLDivElement>(null);
  const chartRef   = useRef<HTMLDivElement>(null);

  const { data, loading, togglePolling, togglingPolling } = useSolarData();
  const { ldrBuffer } = useRealtimeBuffer(data);
  const { history } = useHistoryData();
  const stats = useSolarStats(data, history);

  // Según el código de Arduino, "ENCENDIDO" significa que el SOL está encendido (Día).
  // "APAGADO" significa que el sol no está (Noche).
  const solOn = data.estadoLDR?.toUpperCase().includes('ENCENDIDO');
  
  // Luz ambiental: DÍA si el sol está ENCENDIDO, NOCHE si está APAGADO
  const hayLuz = solOn;

  useEffect(() => {
    const ctx = gsap.context(() => {
      const c = (el: Element | null) => ({
        trigger: el, start: 'top 82%', toggleActions: 'play none none none',
      });
      gsap.fromTo(headerRef.current, { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', scrollTrigger: c(sectionRef.current) });
      gsap.fromTo(cardsRef.current?.children || [], { y: 60, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.12, ease: 'back.out(1.7)', scrollTrigger: c(cardsRef.current) });
      gsap.fromTo(chartRef.current, { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', scrollTrigger: c(chartRef.current) });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="dashboard"
      ref={sectionRef}
      className="relative w-full min-h-screen bg-void-black py-20 px-4 sm:px-6 lg:px-8"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-cyan/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">

        {/* Header */}
        <div ref={headerRef} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 mb-6">
            <Activity className="w-4 h-4 text-neon-cyan" />
            <span className="font-mono-custom text-xs uppercase tracking-wider text-neon-cyan">
              Monitoreo en Tiempo Real
            </span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-white mb-4">
            Panel de Control<span className="text-neon-cyan"> Solar</span>
          </h2>
          <p className="font-mono-custom text-white/50 max-w-2xl mx-auto">
            Visualización en tiempo real del sistema fotovoltaico — Parque Caldas, Popayán.
          </p>
        </div>

        {/* Conexión + Polling */}
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <ConnectionStatus
              firebaseConnected={data.firebase_connected}
              circuitConnected={data.circuit_connected}
              serverTimestamp={data.server_timestamp}
              circuitTimestamp={data.circuit_timestamp}
            />
          </div>
          <PollingToggle
            pollingActive={data.polling_active}
            toggling={togglingPolling}
            onToggle={togglePolling}
          />
        </div>

        {/* ── Tarjetas de estado ── */}
        <div ref={cardsRef} className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-12">

          {/* Estado del Sol (LDR) */}
          <div className={`flex items-center gap-4 p-6 rounded-2xl border backdrop-blur-sm
            ${solOn ? 'bg-amber-500/10 border-amber-400/40' : 'bg-white/5 border-white/10'}`}>
            <div className="relative flex-shrink-0">
              <Sun className={`w-10 h-10 ${solOn ? 'text-amber-400' : 'text-white/30'}`} />
              {solOn && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 animate-pulse" />}
            </div>
            <div>
              <p className="font-mono-custom text-xs uppercase text-white/40 tracking-wider">Estado Sol</p>
              <p className={`font-display text-2xl font-bold ${solOn ? 'text-amber-400' : 'text-white/60'}`}>
                {solOn ? 'ENCENDIDO' : 'APAGADO'}
              </p>
              <p className="font-mono-custom text-[11px] text-white/30 mt-0.5">
                (Luces físicas: {solOn ? 'Apagadas' : 'Encendidas'})
              </p>
            </div>
          </div>

          {/* Ambiente solar (LDR) */}
          <div className={`flex items-center gap-4 p-6 rounded-2xl border backdrop-blur-sm
            ${hayLuz ? 'bg-sky-500/10 border-sky-400/40' : 'bg-indigo-500/10 border-indigo-400/40'}`}>
            <div className="flex-shrink-0">
              {hayLuz
                ? <CloudSun className="w-10 h-10 text-sky-400" />
                : <Moon     className="w-10 h-10 text-indigo-400" />}
            </div>
            <div>
              <p className="font-mono-custom text-xs uppercase text-white/40 tracking-wider">Ambiente</p>
              <p className={`font-display text-2xl font-bold ${hayLuz ? 'text-sky-400' : 'text-indigo-400'}`}>
                {hayLuz ? 'DÍA' : 'NOCHE'}
              </p>
              <p className="font-mono-custom text-[11px] text-white/30 mt-0.5">
                LDR: {data.ldr} / 1024
              </p>
            </div>
          </div>

          {/* Estado batería/panel */}
          <div className={`flex items-center gap-4 p-6 rounded-2xl border backdrop-blur-sm ${estadoBg(data.estado)}`}>
            <div className="flex-shrink-0">
              <EstadoBateriaIcon estado={data.estado} />
            </div>
            <div>
              <p className="font-mono-custom text-xs uppercase text-white/40 tracking-wider">Batería / Panel</p>
              <p className={`font-display text-2xl font-bold ${estadoColor(data.estado)}`}>
                {data.estado}
              </p>
              <p className="font-mono-custom text-[11px] text-white/30 mt-0.5">
                {data.estado === 'CARGANDO'    ? 'Panel genera más que batería' :
                 data.estado === 'EQUILIBRIO'  ? 'Panel ≈ consumo batería' :
                 data.estado === 'DESCARGANDO' ? 'Batería suministrando energía' :
                 'Sin datos del circuito'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Stats del historial ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="p-5 rounded-2xl border border-white/10 bg-white/5 text-center">
            <Eye className="w-6 h-6 text-neon-cyan mx-auto mb-2" />
            <p className="font-mono-custom text-xs text-white/40 uppercase mb-1">LDR Actual</p>
            <p className="font-display text-2xl text-neon-cyan">{data.ldr}</p>
          </div>
          <div className="p-5 rounded-2xl border border-white/10 bg-white/5 text-center">
            <Eye className="w-6 h-6 text-sky-400 mx-auto mb-2" />
            <p className="font-mono-custom text-xs text-white/40 uppercase mb-1">LDR Máx</p>
            <p className="font-display text-2xl text-sky-400">{stats.ldrMax}</p>
          </div>
          <div className="p-5 rounded-2xl border border-white/10 bg-white/5 text-center">
            <Sun className="w-6 h-6 text-amber-400 mx-auto mb-2" />
            <p className="font-mono-custom text-xs text-white/40 uppercase mb-1">Días Sol</p>
            <p className="font-display text-2xl text-amber-400">{stats.totalEncendidos}</p>
          </div>
          <div className="p-5 rounded-2xl border border-white/10 bg-white/5 text-center">
            <Zap className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <p className="font-mono-custom text-xs text-white/40 uppercase mb-1">% Encendido</p>
            <p className="font-display text-2xl text-emerald-400">{stats.pctEncendido}%</p>
          </div>
        </div>

        {/* ── Gráfica LDR en Tiempo Real ── */}
        <div ref={chartRef} className="space-y-4">
          <h3 className="font-display text-2xl text-white flex items-center gap-3">
            <Activity className="w-6 h-6 text-neon-cyan" />
            LDR en Tiempo Real
            <span className="font-mono-custom text-xs text-white/30 ml-2">
              ({ldrBuffer.length} puntos · cada 5 s)
            </span>
            {!data.circuit_connected && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 font-mono-custom text-xs">
                circuito desconectado
              </span>
            )}
          </h3>
          <div className="p-6 rounded-2xl bg-void-dark/50 border border-white/10 backdrop-blur-sm">
            <RealTimeChart
              data={ldrBuffer}
              label="Sensor LDR"
              unit=""
              color="amber"
              height={220}
              minValue={0}
              maxValue={1024}
            />
          </div>
          <p className="font-mono-custom text-xs text-white/30 text-center">
            Valor analógico bruto del fotoresistor
          </p>
        </div>

      </div>

      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-void-black/80 backdrop-blur-sm z-50">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
            <p className="font-mono-custom text-neon-cyan">Conectando...</p>
          </div>
        </div>
      )}
    </section>
  );
};

export default DashboardSection;
