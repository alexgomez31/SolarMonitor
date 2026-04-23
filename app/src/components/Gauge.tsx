// =============================================================================
// SolarMonitor PV - Componente Gauge (Medidor Circular)
// Visualización tipo velocímetro para voltaje, corriente y potencia
// =============================================================================

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

// =============================================================================
// INTERFACES
// =============================================================================

interface GaugeProps {
  value: number;
  min: number;
  max: number;
  unit: string;
  label: string;
  color?: 'cyan' | 'blue' | 'green' | 'amber' | 'red';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

// =============================================================================
// CONFIGURACIÓN DE COLORES
// =============================================================================

const COLOR_MAP = {
  cyan: {
    primary: '#00D4FF',
    secondary: '#00D4FF40',
    glow: '#00D4FF80',
  },
  blue: {
    primary: '#4D9FFF',
    secondary: '#4D9FFF40',
    glow: '#4D9FFF80',
  },
  green: {
    primary: '#00FF88',
    secondary: '#00FF8840',
    glow: '#00FF8880',
  },
  amber: {
    primary: '#FFB800',
    secondary: '#FFB80040',
    glow: '#FFB80080',
  },
  red: {
    primary: '#FF4D4D',
    secondary: '#FF4D4D40',
    glow: '#FF4D4D80',
  },
};

const SIZE_MAP = {
  sm: { width: 120, stroke: 8, fontSize: 24, labelSize: 10 },
  md: { width: 180, stroke: 12, fontSize: 36, labelSize: 12 },
  lg: { width: 240, stroke: 16, fontSize: 48, labelSize: 14 },
};

// =============================================================================
// COMPONENTE GAUGE
// =============================================================================

const Gauge: React.FC<GaugeProps> = ({
  value,
  min,
  max,
  unit,
  label,
  color = 'cyan',
  size = 'md',
  icon,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);
  const prevValueRef = useRef(value);

  const colors = COLOR_MAP[color];
  const sizes = SIZE_MAP[size];
  const radius = (sizes.width - sizes.stroke) / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  const center = sizes.width / 2;

  // Calcular porcentaje y ángulo
  const percentage = Math.min(Math.max((value - min) / (max - min), 0), 1);
  const arcLength = circumference * 0.75; // 270 grados
  const progressOffset = arcLength - (percentage * arcLength);

  // Animación del valor
  useEffect(() => {
    if (valueRef.current) {
      gsap.to(valueRef.current, {
        innerText: value,
        duration: 0.5,
        snap: { innerText: unit === 'A' ? 0.001 : 0.1 },
        ease: 'power2.out',
      });
    }
    prevValueRef.current = value;
  }, [value, unit]);

  // Animación del arco de progreso
  useEffect(() => {
    if (svgRef.current) {
      const progressArc = svgRef.current.querySelector('.progress-arc');
      if (progressArc) {
        gsap.to(progressArc, {
          strokeDashoffset: progressOffset,
          duration: 0.5,
          ease: 'power2.out',
        });
      }
    }
  }, [progressOffset]);

  return (
    <div className="gauge-container flex flex-col items-center">
      {/* Gauge SVG */}
      <div className="relative" style={{ width: sizes.width, height: sizes.width * 0.75 }}>
        <svg
          ref={svgRef}
          width={sizes.width}
          height={sizes.width * 0.75}
          viewBox={`0 0 ${sizes.width} ${sizes.width * 0.75}`}
          className="gauge-svg"
        >
          {/* Definiciones de gradiente y filtros */}
          <defs>
            <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.secondary} />
              <stop offset="50%" stopColor={colors.primary} />
              <stop offset="100%" stopColor={colors.secondary} />
            </linearGradient>
            <filter id={`glow-${color}`}>
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Arco de fondo */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={colors.secondary}
            strokeWidth={sizes.stroke}
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={0}
            transform={`rotate(135 ${center} ${center})`}
            opacity={0.3}
          />

          {/* Arco de progreso */}
          <circle
            className="progress-arc"
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={`url(#gradient-${color})`}
            strokeWidth={sizes.stroke}
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={arcLength}
            transform={`rotate(135 ${center} ${center})`}
            filter={`url(#glow-${color})`}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />

          {/* Marcas de escala */}
          {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => {
            const angle = 135 + (tick * 270);
            const rad = (angle * Math.PI) / 180;
            const x1 = center + (radius - 15) * Math.cos(rad);
            const y1 = center + (radius - 15) * Math.sin(rad);
            const x2 = center + (radius - 5) * Math.cos(rad);
            const y2 = center + (radius - 5) * Math.sin(rad);

            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={colors.primary}
                strokeWidth={2}
                opacity={0.5}
              />
            );
          })}
        </svg>

        {/* Valor central */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ paddingTop: sizes.width * 0.15 }}
        >
          {icon && (
            <div className="mb-1" style={{ color: colors.primary }}>
              {icon}
            </div>
          )}
          <span
            ref={valueRef}
            className="font-display font-bold text-white"
            style={{ fontSize: sizes.fontSize, lineHeight: 1 }}
          >
            {value.toFixed(unit === 'A' ? 3 : 1)}
          </span>
          <span
            className="font-mono-custom text-white/60 mt-1"
            style={{ fontSize: sizes.labelSize }}
          >
            {unit}
          </span>
        </div>
      </div>

      {/* Etiqueta */}
      <div className="mt-2 text-center">
        <span
          className="font-mono-custom uppercase tracking-wider"
          style={{
            fontSize: sizes.labelSize,
            color: colors.primary,
          }}
        >
          {label}
        </span>
      </div>

      {/* Valores min/max */}
      <div className="flex justify-between w-full px-4 mt-1">
        <span className="font-mono-custom text-white/40 text-[10px]">{min}</span>
        <span className="font-mono-custom text-white/40 text-[10px]">{max}</span>
      </div>
    </div>
  );
};

export default Gauge;
