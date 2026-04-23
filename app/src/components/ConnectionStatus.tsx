// =============================================================================
// SolarMonitor PV - ConnectionStatus (Dos Indicadores)
// Firebase ↔ App  |  Circuito ↔ Firebase
// =============================================================================

import React, { useEffect, useState } from 'react';
import { WifiOff, Database, MapPin, Cpu, Radio } from 'lucide-react';

interface ConnectionStatusProps {
  firebaseConnected: boolean;
  circuitConnected:  boolean;
  serverTimestamp:   string | null;   // cuándo el backend chequeó Firebase
  circuitTimestamp:  string | null;   // cuándo el circuito envió el último dato
  location?: string;
  hardware?: string;
}

// Formatea un ISO timestamp a hora local legible
function fmtTime(ts: string | null): string {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleTimeString('es-CO', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch { return '—'; }
}

const Indicator: React.FC<{
  ok: boolean;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  iconOff?: React.ReactNode;
}> = ({ ok, label, sublabel, icon, iconOff }) => {
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (!ok) return;
    const iv = setInterval(() => setPulse(p => !p), 1000);
    return () => clearInterval(iv);
  }, [ok]);

  return (
    <div className="flex items-center gap-3">
      <div className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all
        ${ok ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
        {ok && (
          <div className={`absolute inset-0 rounded-full transition-all duration-500
            ${pulse ? 'scale-100 opacity-100' : 'scale-150 opacity-0'} bg-emerald-500/30`} />
        )}
        <div className="relative z-10">
          {ok ? icon : (iconOff ?? <WifiOff className="w-5 h-5 text-red-400" />)}
        </div>
      </div>
      <div>
        <p className="font-mono-custom text-xs uppercase tracking-wider text-white/50">{label}</p>
        <p className={`font-display text-sm font-semibold ${ok ? 'text-emerald-400' : 'text-red-400'}`}>
          {ok ? 'Activo' : 'Sin señal'}
        </p>
        <p className="font-mono-custom text-[10px] text-white/30">{sublabel}</p>
      </div>
    </div>
  );
};

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  firebaseConnected,
  circuitConnected,
  serverTimestamp,
  circuitTimestamp,
  location  = 'Parque Caldas, Popayán',
  hardware  = 'ESP8266',
}) => (
  <div className="flex flex-wrap items-center gap-4 p-4 rounded-2xl bg-void-dark/50 border border-white/10 backdrop-blur-sm">

    {/* 1. Firebase ↔ Servidor */}
    <Indicator
      ok={firebaseConnected}
      label="Firebase ↔ Servidor"
      sublabel={`Verificado: ${fmtTime(serverTimestamp)}`}
      icon={<Database className="w-5 h-5 text-emerald-400" />}
      iconOff={<Database className="w-5 h-5 text-red-400" />}
    />

    <div className="w-px h-8 bg-white/10 hidden sm:block" />

    {/* 2. Circuito ↔ Firebase */}
    <Indicator
      ok={circuitConnected}
      label="Circuito ↔ Firebase"
      sublabel={circuitConnected
        ? `Último dato: ${fmtTime(circuitTimestamp)}`
        : `Detenido en: ${fmtTime(circuitTimestamp)}`}
      icon={<Radio className="w-5 h-5 text-emerald-400" />}
      iconOff={<WifiOff className="w-5 h-5 text-red-400" />}
    />

    <div className="w-px h-8 bg-white/10 hidden sm:block" />

    {/* Ubicación */}
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-neon-blue/20 flex items-center justify-center">
        <MapPin className="w-5 h-5 text-neon-blue" />
      </div>
      <div>
        <p className="font-mono-custom text-xs uppercase tracking-wider text-white/50">Ubicación</p>
        <p className="font-display text-sm text-white">{location}</p>
      </div>
    </div>

    <div className="w-px h-8 bg-white/10 hidden sm:block" />

    {/* Hardware */}
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
        <Cpu className="w-5 h-5 text-purple-400" />
      </div>
      <div>
        <p className="font-mono-custom text-xs uppercase tracking-wider text-white/50">Hardware</p>
        <p className="font-display text-sm text-white">{hardware}</p>
      </div>
    </div>

    {/* Banner de advertencia cuando circuito parado */}
    {firebaseConnected && !circuitConnected && (
      <div className="w-full mt-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30">
        <WifiOff className="w-4 h-4 text-red-400 flex-shrink-0" />
        <p className="font-mono-custom text-xs text-red-300">
          El circuito ESP8266 dejó de enviar datos. Último registro: {fmtTime(circuitTimestamp)}.
          Los valores mostrados son 0 hasta que se restablezca la conexión.
        </p>
      </div>
    )}
  </div>
);

export default ConnectionStatus;
