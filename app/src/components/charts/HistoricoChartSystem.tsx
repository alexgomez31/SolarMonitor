import React, { useState, useMemo, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
} from 'chart.js';
import type { ChartOptions, Plugin } from 'chart.js';
import { Line } from 'react-chartjs-2';
import zoomPlugin from 'chartjs-plugin-zoom';
import 'chartjs-adapter-date-fns';
import 'chartjs-adapter-date-fns';
import { useAvailableDates, useHistoryData } from '../../hooks/useSolarData';
import { Calendar, Filter, ZoomIn, RefreshCw } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler,
  zoomPlugin
);

interface HistoricoChartSystemProps {}

const commonOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: {
      labels: { color: 'rgba(255, 255, 255, 0.7)' }
    },
    zoom: {
      zoom: {
        wheel: { enabled: true },
        pinch: { enabled: true },
        mode: 'x',
      },
      pan: {
        enabled: true,
        mode: 'x',
      }
    }
  },
  scales: {
    x: {
      type: 'time',
      time: { tooltipFormat: 'PPpp' },
      ticks: { color: 'rgba(255, 255, 255, 0.5)' },
      grid: { color: 'rgba(255, 255, 255, 0.05)' }
    },
    y: {
      ticks: { color: 'rgba(255, 255, 255, 0.5)' },
      grid: { color: 'rgba(255, 255, 255, 0.05)' }
    }
  },
  elements: {
    point: { radius: 0, hitRadius: 10, hoverRadius: 4 },
    line: { tension: 0.3 } // Smooth lines
  }
};

const bgPlugin: Plugin = {
  id: 'customCanvasBackgroundColor',
  beforeDraw: (chart, _args, options) => {
    const {ctx} = chart;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = options.color || 'transparent';
    ctx.fillRect(0, 0, chart.width, chart.height);
    ctx.restore();
  }
};

export const HistoricoChartSystem: React.FC<HistoricoChartSystemProps> = () => {
  const availableDates = useAvailableDates();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Set default date when dates are loaded
  useEffect(() => {
    if (availableDates.length > 0 && !selectedDate) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates, selectedDate]);

  const { history, loading, refresh } = useHistoryData(selectedDate);

  // 1. Clean & Sort Data
  const filteredData = useMemo(() => {
    if (!history) return [];
    const valid = history.filter(d => 
      d && typeof d.ldr === 'number' &&
      d.panel && typeof d.panel.voltaje_V === 'number' &&
      d.bateria && typeof d.bateria.voltaje_V === 'number' &&
      d.timestamp
    );
    const seen = new Set();
    const unique = [];
    for (const d of valid) {
      if (!seen.has(d.timestamp)) {
        seen.add(d.timestamp);
        unique.push(d);
      }
    }
    return unique.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [history]);

  // 2. Data Extraction for Charts
  const timestamps = filteredData.map(d => new Date(d.timestamp).getTime());

  // Helper for generating datasets
  const createDataset = (label: string, dataArray: number[], color: string, fill: boolean = false, isStepped: boolean = false) => ({
    label,
    data: dataArray.map((val, i) => ({ x: timestamps[i], y: val })),
    borderColor: color,
    backgroundColor: fill ? `${color}33` : 'transparent',
    fill,
    stepped: isStepped,
    borderWidth: 2,
    spanGaps: false,
    segment: {
      borderColor: (ctx: any) => {
        // Break line if time gap is > 10 minutes (600000 ms)
        if (ctx.p0 && ctx.p1 && (ctx.p1.parsed.x - ctx.p0.parsed.x > 600000)) {
          return 'transparent';
        }
        // Visually differentiate day charge vs night discharge
        const index = ctx.p0DataIndex;
        const ldr = filteredData[index]?.ldr || 0;
        return ldr > 100 ? color : `${color}88`;
      }
    }
  });

  // Extract arrays
  const ldrData = filteredData.map(d => d.ldr);
  const pVData = filteredData.map(d => d.panel.voltaje_V);
  const pIData = filteredData.map(d => d.panel.corriente_mA);
  const pPData = filteredData.map(d => d.panel.potencia_mW);
  const bVData = filteredData.map(d => d.bateria.voltaje_V);
  const bIData = filteredData.map(d => d.bateria.corriente_mA);
  const bPData = filteredData.map(d => d.bateria.potencia_mW);

  // Compute System State logic
  // 1 = CARGANDO, 0 = EQUILIBRIO, -1 = DESCARGANDO
  const stateData = filteredData.map(d => {
    if (d.estado === 'CARGANDO' || (d.panel.voltaje_V > d.bateria.voltaje_V && d.panel.corriente_mA > 10)) return 1;
    if (d.estado === 'DESCARGANDO' || (d.panel.voltaje_V < 2 && d.bateria.corriente_mA > 10)) return -1;
    return 0;
  });

  // Specific Curve Filters (Carga / Descarga)
  const cargaCurveV = filteredData.map(d => (d.estado === 'CARGANDO' || d.panel.corriente_mA > 10) ? d.bateria.voltaje_V : null);
  const descargaCurveV = filteredData.map(d => (d.estado === 'DESCARGANDO' || d.panel.voltaje_V < 2) ? d.bateria.voltaje_V : null);

  // Chart configs
  const charts = [
    { title: '1. Voltaje del Panel vs Tiempo (V)', data: { datasets: [createDataset('Voltaje Panel (V)', pVData, '#F59E0B', true)] } },
    { title: '2. Corriente del Panel vs Tiempo (mA)', data: { datasets: [createDataset('Corriente Panel (mA)', pIData, '#10B981', true)] } },
    { title: '3. Potencia del Panel vs Tiempo (mW)', data: { datasets: [createDataset('Potencia Panel (mW)', pPData, '#3B82F6', true)] } },
    { title: '4. Voltaje de Batería vs Tiempo (V)', data: { datasets: [createDataset('Voltaje Batería (V)', bVData, '#EC4899', true)] } },
    { title: '5. Corriente de Batería vs Tiempo (mA)', data: { datasets: [createDataset('Corriente Batería (mA)', bIData, '#8B5CF6', true)] } },
    { title: '6. Potencia de Batería vs Tiempo (mW)', data: { datasets: [createDataset('Potencia Batería (mW)', bPData, '#06B6D4', true)] } },
    { title: '7. Curva de Carga de Batería', data: { datasets: [createDataset('Voltaje en Carga', cargaCurveV as number[], '#F59E0B')] } },
    { title: '8. Curva de Descarga Nocturna', data: { datasets: [createDataset('Voltaje en Descarga', descargaCurveV as number[], '#6366F1')] } },
    { title: '9. Comparación Panel vs Batería (Voltaje)', data: { datasets: [
      createDataset('Voltaje Panel', pVData, '#F59E0B'),
      createDataset('Voltaje Batería', bVData, '#EC4899')
    ]} },
    { title: '10. Nivel de Iluminación LDR vs Tiempo', data: { datasets: [createDataset('LDR', ldrData, '#EAB308', true)] } },
    { title: '11. Estado del Sistema (1:Carga, 0:Eq, -1:Descarga)', data: { datasets: [
      {
        ...createDataset('Estado', stateData, '#14B8A6', true, true),
        segment: {
          borderColor: (ctx: any) => {
            if (ctx.p0 && ctx.p1 && (ctx.p1.parsed.x - ctx.p0.parsed.x > 600000)) return 'transparent';
            return '#14B8A6';
          }
        }
      }
    ]} },
  ];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-void-dark/50 border border-white/10 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="w-5 h-5 text-neon-cyan" />
          <span className="font-display text-white">Filtro por Fecha:</span>
          <div className="relative">
            <select
              value={selectedDate || ''}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="appearance-none bg-void-black border border-white/20 text-white py-2 pl-4 pr-10 rounded-lg outline-none focus:border-neon-cyan/50 font-mono-custom text-sm"
            >
              {availableDates.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <Calendar className="absolute right-3 top-2.5 w-4 h-4 text-white/40 pointer-events-none" />
          </div>
          <button onClick={refresh} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="flex items-center gap-2 text-white/40 text-xs font-mono-custom">
          <ZoomIn className="w-4 h-4" /> Puedes hacer zoom (rueda/gesto) y desplazar las gráficas.
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredData.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-white/50 font-mono-custom">
          No hay datos disponibles para la fecha seleccionada.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {charts.map((chart, idx) => (
            <div key={idx} className={`p-4 rounded-xl bg-void-dark/30 border border-white/10 backdrop-blur-sm ${idx >= 9 ? 'lg:col-span-2' : ''}`}>
              <h3 className="font-display text-lg text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-neon-cyan"></span>
                {chart.title}
              </h3>
              <div className="h-72 w-full">
                <Line 
                  options={commonOptions as any} 
                  data={chart.data as any} 
                  plugins={[bgPlugin]}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
