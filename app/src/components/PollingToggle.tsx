// =============================================================================
// SolarMonitor PV - PollingToggle
// Botón flotante para activar / pausar las consultas a Firebase
// =============================================================================

import React from 'react';
import { Pause, Play, Loader2, CloudOff, Cloud } from 'lucide-react';

interface PollingToggleProps {
  pollingActive: boolean;
  toggling: boolean;
  onToggle: () => void;
  /** Si true se muestra como botón flotante fijo */
  floating?: boolean;
}

const PollingToggle: React.FC<PollingToggleProps> = ({
  pollingActive,
  toggling,
  onToggle,
  floating = false,
}) => {
  const wrapperClass = floating
    ? 'fixed bottom-8 right-8 z-50'
    : 'inline-flex';

  return (
    <div className={wrapperClass}>
      <button
        id="polling-toggle-btn"
        onClick={onToggle}
        disabled={toggling}
        title={pollingActive ? 'Pausar consultas a Firebase' : 'Reanudar consultas a Firebase'}
        className={[
          'group relative flex items-center gap-3 px-5 py-3 rounded-full font-mono-custom text-sm',
          'transition-all duration-300 border shadow-lg',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          pollingActive
            ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-300 hover:bg-emerald-500/25 hover:shadow-emerald-500/20'
            : 'bg-amber-500/15 border-amber-400/50 text-amber-300 hover:bg-amber-500/25 hover:shadow-amber-500/20',
          floating ? 'shadow-xl' : '',
        ].join(' ')}
      >
        {/* Pulsing ring (solo cuando activo) */}
        {pollingActive && !toggling && (
          <span className="absolute inset-0 rounded-full border border-emerald-400/30 animate-ping pointer-events-none" />
        )}

        {/* Icon */}
        {toggling ? (
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
        ) : pollingActive ? (
          <span className="relative flex items-center">
            <Cloud className="w-4 h-4 flex-shrink-0" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </span>
        ) : (
          <CloudOff className="w-4 h-4 flex-shrink-0" />
        )}

        {/* Label */}
        <span className="uppercase tracking-wider text-xs font-semibold">
          {toggling
            ? 'Cambiando…'
            : pollingActive
            ? 'Pausar Firebase'
            : 'Reanudar Firebase'}
        </span>

        {/* Action icon */}
        {!toggling && (
          pollingActive
            ? <Pause className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
            : <Play  className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
        )}

        {/* Tooltip */}
        <span
          className={[
            'absolute bottom-full mb-2 left-1/2 -translate-x-1/2',
            'whitespace-nowrap px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider',
            'opacity-0 group-hover:opacity-100 pointer-events-none',
            'transition-opacity duration-200',
            'bg-void-dark border text-white/70',
            pollingActive
              ? 'border-emerald-400/30'
              : 'border-amber-400/30',
          ].join(' ')}
        >
          {pollingActive
            ? 'Pausar reduce el consumo de cuota de Firebase'
            : 'Firebase no se está consultando — los datos están congelados'}
        </span>
      </button>
    </div>
  );
};

export default PollingToggle;
