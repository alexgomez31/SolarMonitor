// =============================================================================
// SolarMonitor PV - Componente RealTimeChart
// Gráfico de líneas en tiempo real para visualizar datos históricos
// =============================================================================

import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

// =============================================================================
// INTERFACES
// =============================================================================

interface ChartDataPoint {
  timestamp: string;
  value: number;
}

interface RealTimeChartProps {
  data: ChartDataPoint[];
  label: string;
  unit: string;
  color?: 'cyan' | 'blue' | 'green' | 'amber';
  height?: number;
  maxPoints?: number;
  minValue?: number;
  maxValue?: number;
}

// =============================================================================
// CONFIGURACIÓN DE COLORES
// =============================================================================

const COLOR_MAP = {
  cyan: {
    stroke: '#00D4FF',
    fill: 'rgba(0, 212, 255, 0.1)',
    grid: 'rgba(0, 212, 255, 0.1)',
  },
  blue: {
    stroke: '#4D9FFF',
    fill: 'rgba(77, 159, 255, 0.1)',
    grid: 'rgba(77, 159, 255, 0.1)',
  },
  green: {
    stroke: '#00FF88',
    fill: 'rgba(0, 255, 136, 0.1)',
    grid: 'rgba(0, 255, 136, 0.1)',
  },
  amber: {
    stroke: '#FFB800',
    fill: 'rgba(255, 184, 0, 0.1)',
    grid: 'rgba(255, 184, 0, 0.1)',
  },
};

// =============================================================================
// COMPONENTE REAL TIME CHART
// =============================================================================

const RealTimeChart: React.FC<RealTimeChartProps> = ({
  data,
  label,
  unit,
  color = 'cyan',
  height = 200,
  maxPoints = 50,
  minValue,
  maxValue,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const areaRef = useRef<SVGPathElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  const colors = COLOR_MAP[color];

  // Limitar datos a maxPoints más recientes
  const chartData = data.slice(-maxPoints);

  // Calcular escalas
  const values = chartData.map(d => d.value);
  const actualMin = minValue !== undefined ? minValue : Math.min(...values) * 0.9;
  const actualMax = maxValue !== undefined ? maxValue : Math.max(...values) * 1.1;
  const range = actualMax - actualMin || 1;

  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartWidth = 800 - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Generar puntos para el SVG
  const generatePath = () => {
    if (chartData.length < 2) return { line: '', area: '' };

    const points = chartData.map((point, index) => {
      const x = padding.left + (index / (maxPoints - 1)) * chartWidth;
      const y = padding.top + chartHeight - ((point.value - actualMin) / range) * chartHeight;
      return { x, y, value: point.value, timestamp: point.timestamp };
    });

    // Línea suavizada con curvas Bézier
    let linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpX = (prev.x + curr.x) / 2;
      linePath += ` C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    // Área bajo la curva
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

    return { line: linePath, area: areaPath, points };
  };

  const { line, area, points } = generatePath();

  // Animación de entrada
  useEffect(() => {
    if (pathRef.current && areaRef.current) {
      gsap.fromTo(
        pathRef.current,
        { strokeDasharray: 1000, strokeDashoffset: 1000 },
        { strokeDashoffset: 0, duration: 1, ease: 'power2.out' }
      );
      gsap.fromTo(
        areaRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, delay: 0.5 }
      );
    }
  }, [data.length]);

  // Formatear timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="real-time-chart w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: colors.stroke, boxShadow: `0 0 8px ${colors.stroke}` }}
          />
          <span className="font-mono-custom text-sm uppercase tracking-wider text-white/70">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono-custom text-xs text-white/40">
            Min: {actualMin.toFixed(1)} {unit}
          </span>
          <span className="font-mono-custom text-xs text-white/40">
            Max: {actualMax.toFixed(1)} {unit}
          </span>
        </div>
      </div>

      {/* Chart SVG */}
      <div className="relative" style={{ height }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 800 ${height}`}
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          {/* Grid horizontal */}
          {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => (
            <line
              key={`h-${i}`}
              x1={padding.left}
              y1={padding.top + chartHeight * tick}
              x2={800 - padding.right}
              y2={padding.top + chartHeight * tick}
              stroke={colors.grid}
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          ))}

          {/* Grid vertical */}
          {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => (
            <line
              key={`v-${i}`}
              x1={padding.left + chartWidth * tick}
              y1={padding.top}
              x2={padding.left + chartWidth * tick}
              y2={padding.top + chartHeight}
              stroke={colors.grid}
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          ))}

          {/* Área bajo la curva */}
          {area && (
            <path
              ref={areaRef}
              d={area}
              fill={colors.fill}
            />
          )}

          {/* Línea principal */}
          {line && (
            <path
              ref={pathRef}
              d={line}
              fill="none"
              stroke={colors.stroke}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                filter: `drop-shadow(0 0 4px ${colors.stroke})`,
              }}
            />
          )}

          {/* Puntos de datos */}
          {points?.map((point, i) => (
            <circle
              key={i}
              cx={point.x}
              cy={point.y}
              r={hoveredPoint === i ? 6 : 3}
              fill={colors.stroke}
              stroke="#050508"
              strokeWidth={2}
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => setHoveredPoint(i)}
              onMouseLeave={() => setHoveredPoint(null)}
              style={{
                opacity: hoveredPoint === null || hoveredPoint === i ? 1 : 0.3,
              }}
            />
          ))}

          {/* Eje Y - Labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => {
            const value = actualMin + range * (1 - tick);
            return (
              <text
                key={`y-label-${i}`}
                x={padding.left - 8}
                y={padding.top + chartHeight * tick + 4}
                textAnchor="end"
                className="font-mono-custom text-[10px]"
                fill="rgba(255,255,255,0.4)"
              >
                {value.toFixed(1)}
              </text>
            );
          })}

          {/* Eje X - Labels */}
          {[0, 0.5, 1].map((tick, i) => {
            const dataIndex = Math.floor((chartData.length - 1) * tick);
            if (dataIndex >= 0 && dataIndex < chartData.length) {
              return (
                <text
                  key={`x-label-${i}`}
                  x={padding.left + chartWidth * tick}
                  y={height - 8}
                  textAnchor="middle"
                  className="font-mono-custom text-[10px]"
                  fill="rgba(255,255,255,0.4)"
                >
                  {formatTime(chartData[dataIndex].timestamp)}
                </text>
              );
            }
            return null;
          })}
        </svg>

        {/* Tooltip */}
        {hoveredPoint !== null && points && points[hoveredPoint] && (
          <div
            className="absolute px-3 py-2 rounded-lg bg-void-dark/90 border border-white/10 backdrop-blur-sm"
            style={{
              left: `${(points[hoveredPoint].x / 800) * 100}%`,
              top: `${(points[hoveredPoint].y / height) * 100}%`,
              transform: 'translate(-50%, -120%)',
            }}
          >
            <p className="font-mono-custom text-xs text-white/60">
              {formatTime(points[hoveredPoint].timestamp)}
            </p>
            <p className="font-display text-lg" style={{ color: colors.stroke }}>
              {points[hoveredPoint].value.toFixed(2)} {unit}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RealTimeChart;
