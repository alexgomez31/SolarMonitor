// =============================================================================
// SolarMonitor PV - Dashboard Section (Tiempo Real)
// =============================================================================

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Zap, Activity, TrendingUp, Sun, Battery, Power,
  Lightbulb, Eye, CloudSun, Moon,
} from 'lucide-react';

import Gauge from '../components/Gauge';
import DataWidget from '../components/DataWidget';
import RealTimeChart from '../components/RealTimeChart';
import ConnectionStatus from '../components/ConnectionStatus';
import {
  useSolarData, useRealtimeBuffer, useHistoryData, useSolarStats,
} from '../hooks/useSolarData';

gsap.registerPlugin(ScrollTrigger);

const DashboardSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef  = useRef<HTMLDivElement>(null);
  const gaugesRef  = useRef<HTMLDivElement>(null);
  const widgetsRef = useRef<HTMLDivElement>(null);
  const chartsRef  = useRef<HTMLDivElement>(null);
  const ledRef     = useRef<HTMLDivElement>(null);

  const { data, loading } = useSolarData();
  const { voltageBuffer, currentBuffer, powerBuffer, ldrBuffer } = useRealtimeBuffer(data);
  const { history } = useHistoryData();
  const stats = useSolarStats(data, history);

  const ledOn = data.led?.toUpperCase().includes('ENCENDIDO');
  const isDia = data.ambiente?.toUpperCase().includes('DIA');

  useEffect(() => {
    const ctx = gsap.context(() => {
      const c = (el: Element | null) => ({
        trigger: el, start: 'top 82%', toggleActions: 'play none none none',
      });
      gsap.fromTo(headerRef.current, { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', scrollTrigger: c(sectionRef.current) });
      gsap.fromTo(gaugesRef.current?.children || [], { y: 80, opacity: 0, scale: 0.9 },
        { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.15, ease: 'back.out(1.7)', scrollTrigger: c(gaugesRef.current) });
      gsap.fromTo(widgetsRef.current?.children || [], { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power3.out', scrollTrigger: c(widgetsRef.current) });
      gsap.fromTo(chartsRef.current, { y: 60, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', scrollTrigger: c(chartsRef.current) });
      gsap.fromTo(ledRef.current, { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', scrollTrigger: c(ledRef.current) });
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
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-blue/5 rounded-full blur-3xl" />
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

        {/* ── Dos indicadores de conexión ── */}
        <div className="mb-8">
          <ConnectionStatus
            firebaseConnected={data.firebase_connected}
            circuitConnected={data.circuit_connected}
            serverTimestamp={data.server_timestamp}
            circuitTimestamp={data.circuit_timestamp}
          />
        </div>

        {/* ── LED / Ambiente / LDR ── */}
        <div ref={ledRef} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">

          {/* LED */}
          <div className={`flex items-center gap-4 p-5 rounded-2xl border backdrop-blur-sm
            ${ledOn ? 'bg-amber-500/10 border-amber-400/40' : 'bg-white/5 border-white/10'}`}>
            <div className="relative flex-shrink-0">
              <Lightbulb className={`w-8 h-8 ${ledOn ? 'text-amber-400' : 'text-white/30'}`} />
              {ledOn && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 animate-pulse" />}
            </div>
            <div>
              <p className="font-mono-custom text-xs uppercase text-white/40 tracking-wider">Luces del Parque</p>
              <p className={`font-display text-xl font-bold ${ledOn ? 'text-amber-400' : 'text-white/60'}`}>
                {ledOn ? 'ENCENDIDAS' : 'APAGADAS'}
              </p>
            </div>
          </div>

          {/* Ambiente */}
          <div className={`flex items-center gap-4 p-5 rounded-2xl border backdrop-blur-sm
            ${isDia ? 'bg-sky-500/10 border-sky-400/40' : 'bg-indigo-500/10 border-indigo-400/40'}`}>
            <div className="flex-shrink-0">
              {isDia ? <CloudSun className="w-8 h-8 text-sky-400" /> : <Moon className="w-8 h-8 text-indigo-400" />}
            </div>
            <div>
              <p className="font-mono-custom text-xs uppercase text-white/40 tracking-wider">Ambiente</p>
              <p className={`font-display text-xl font-bold ${isDia ? 'text-sky-400' : 'text-indigo-400'}`}>
                {isDia ? 'DÍA' : 'NOCHE'}
              </p>
            </div>
          </div>

          {/* LDR */}
          <div className="flex items-center gap-4 p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
            <Eye className="w-8 h-8 text-neon-cyan flex-shrink-0" />
            <div>
              <p className="font-mono-custom text-xs uppercase text-white/40 tracking-wider">Sensor LDR</p>
              <p className="font-display text-xl font-bold text-neon-cyan">{data.ldr}</p>
              <p className="font-mono-custom text-xs text-white/30">
                {data.ldr > 500 ? 'Mucha luz' : data.ldr > 200 ? 'Luz media' : 'Poca luz'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Gauges PV ── */}
        <div ref={gaugesRef} className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="flex justify-center">
            <Gauge value={data.voltage} min={0} max={5} unit="V"
              label="Voltaje" color="cyan" size="lg" icon={<Zap className="w-5 h-5" />} />
          </div>
          <div className="flex justify-center">
            <Gauge value={data.current_mA} min={0} max={10} unit="mA"
              label="Corriente" color="blue" size="lg" icon={<Activity className="w-5 h-5" />} />
          </div>
          <div className="flex justify-center">
            <Gauge value={data.power_mW} min={0} max={50} unit="mW"
              label="Potencia" color="green" size="lg" icon={<Power className="w-5 h-5" />} />
          </div>
        </div>

        {/* ── Stats Widgets ── */}
        <div ref={widgetsRef} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <DataWidget title="Voltaje Máx" value={stats.voltageMax.toFixed(2)} unit="V"
            trend="up" trendValue="Hoy" icon={<TrendingUp className="w-4 h-4" />} color="cyan" />
          <DataWidget title="Corriente Máx" value={stats.currentMax.toFixed(2)} unit="mA"
            trend="up" trendValue="Hoy" icon={<TrendingUp className="w-4 h-4" />} color="blue" />
          <DataWidget title="Potencia Máx" value={stats.powerMax.toFixed(1)} unit="mW"
            trend="up" trendValue="Hoy" icon={<Sun className="w-4 h-4" />} color="amber" />
          <DataWidget
            title="Energía Total"
            value={(stats.powerTotal / 1000).toFixed(3)}
            unit="Wh"
            subtitle="Historial"
            icon={<Battery className="w-4 h-4" />}
            color="green"
            highlight
          />
        </div>

        {/* ── Gráficas en Tiempo Real ── */}
        <div ref={chartsRef} className="space-y-6">
          <h3 className="font-display text-2xl text-white mb-2 flex items-center gap-3">
            <Activity className="w-6 h-6 text-neon-cyan" />
            Gráficos en Tiempo Real
            <span className="font-mono-custom text-xs text-white/30 ml-2">
              ({voltageBuffer.length} puntos · cada 2 s)
            </span>
            {!data.circuit_connected && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 font-mono-custom text-xs">
                circuito desconectado — mostrando 0
              </span>
            )}
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-void-dark/50 border border-white/10 backdrop-blur-sm">
              <RealTimeChart data={voltageBuffer} label="Voltaje" unit="V" color="cyan" height={200} minValue={0} maxValue={5} />
            </div>
            <div className="p-6 rounded-2xl bg-void-dark/50 border border-white/10 backdrop-blur-sm">
              <RealTimeChart data={currentBuffer} label="Corriente" unit="mA" color="blue" height={200} minValue={0} maxValue={10} />
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-void-dark/50 border border-white/10 backdrop-blur-sm">
            <RealTimeChart data={powerBuffer} label="Potencia" unit="mW" color="green" height={200} minValue={0} maxValue={50} />
          </div>

          <div className="p-6 rounded-2xl bg-void-dark/50 border border-white/10 backdrop-blur-sm">
            <RealTimeChart data={ldrBuffer} label="LDR (Luminosidad)" unit="" color="amber" height={160} minValue={0} maxValue={1024} />
          </div>
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
