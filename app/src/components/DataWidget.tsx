// =============================================================================
// SolarMonitor PV - Componente DataWidget
// Widget informativo para mostrar estadísticas y datos del sistema
// =============================================================================

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// =============================================================================
// INTERFACES
// =============================================================================

interface DataWidgetProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  icon?: React.ReactNode;
  color?: 'cyan' | 'blue' | 'green' | 'amber' | 'red' | 'purple';
  size?: 'sm' | 'md' | 'lg';
  highlight?: boolean;
}

// =============================================================================
// CONFIGURACIÓN DE COLORES
// =============================================================================

const COLOR_MAP = {
  cyan: {
    bg: 'bg-neon-cyan/10',
    border: 'border-neon-cyan/30',
    text: 'text-neon-cyan',
    glow: 'shadow-neon-cyan/20',
  },
  blue: {
    bg: 'bg-neon-blue/10',
    border: 'border-neon-blue/30',
    text: 'text-neon-blue',
    glow: 'shadow-neon-blue/20',
  },
  green: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    glow: 'shadow-emerald-500/20',
  },
  amber: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    glow: 'shadow-amber-500/20',
  },
  red: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    glow: 'shadow-red-500/20',
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    glow: 'shadow-purple-500/20',
  },
};

// =============================================================================
// COMPONENTE DATA WIDGET
// =============================================================================

const DataWidget: React.FC<DataWidgetProps> = ({
  title,
  value,
  unit = '',
  subtitle,
  trend,
  trendValue,
  icon,
  color = 'cyan',
  size = 'md',
  highlight = false,
}) => {
  const colors = COLOR_MAP[color];

  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const valueSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-white/50';

  return (
    <div
      className={`
        relative rounded-2xl border backdrop-blur-sm
        ${colors.bg} ${colors.border}
        ${sizeClasses[size]}
        ${highlight ? `shadow-lg ${colors.glow}` : ''}
        transition-all duration-300 hover:scale-[1.02] hover:border-opacity-50
      `}
    >
      {/* Efecto de brillo en la esquina */}
      <div
        className={`
          absolute -top-px -right-px w-16 h-16
          bg-gradient-to-bl from-white/10 to-transparent
          rounded-tr-2xl pointer-events-none
        `}
      />

      {/* Header con icono y título */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono-custom text-xs uppercase tracking-wider text-white/60">
          {title}
        </span>
        {icon && (
          <div className={`${colors.text}`}>
            {icon}
          </div>
        )}
      </div>

      {/* Valor principal */}
      <div className="flex items-baseline gap-1">
        <span className={`font-display font-bold text-white ${valueSizes[size]}`}>
          {value}
        </span>
        {unit && (
          <span className="font-mono-custom text-sm text-white/50">
            {unit}
          </span>
        )}
      </div>

      {/* Subtítulo */}
      {subtitle && (
        <p className="mt-1 text-xs text-white/40">
          {subtitle}
        </p>
      )}

      {/* Indicador de tendencia */}
      {trend && (
        <div className={`flex items-center gap-1 mt-2 ${trendColor}`}>
          <TrendIcon className="w-3 h-3" />
          <span className="font-mono-custom text-xs">
            {trendValue}
          </span>
        </div>
      )}

      {/* Línea decorativa inferior */}
      <div
        className={`
          absolute bottom-0 left-4 right-4 h-px
          bg-gradient-to-r from-transparent via-${colors.text.split('-')[1]}-500/30 to-transparent
        `}
      />
    </div>
  );
};

export default DataWidget;
