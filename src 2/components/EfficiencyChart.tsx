// RUTA: src/components/EfficiencyChart.tsx
// VERSIÓN FINAL - SOLUCIÓN AL CRASH DE TOOLTIP CON IMPLEMENTACIÓN MANUAL

'use client';

import type { OrderRow } from '@/lib/types';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Package, Clock, CheckCircle } from 'lucide-react';
import React from 'react';

// --- Interfaces y Tipos ---
interface HeatmapDataPoint {
  hour: string;
  successful: number;
  attempted: number;
  efficiency: number | null;
}

interface TooltipInfo {
  data: HeatmapDataPoint;
  x: number;
  y: number;
}

// --- Sub-Componente de Tarjeta de Métrica (Sin cambios) ---
const MetricCard = ({ title, value, icon: Icon, unit = '', colorClass = 'text-white', delay = 0 }: { title: string, value: string | number, icon: React.ElementType, unit?: string, colorClass?: string, delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/60 shadow-lg"
  >
    <div className="flex items-center gap-3 text-slate-400 mb-2">
      <Icon className="w-5 h-5" />
      <span className="text-sm font-medium">{title}</span>
    </div>
    <div className={`text-3xl font-bold ${colorClass}`}>
      {value}<span className="text-xl font-medium">{unit}</span>
    </div>
  </motion.div>
);

// --- Componente Principal: Mapa de Calor de Actividad ---
export function EfficiencyChart({ orders }: { orders: OrderRow[] }) {
  
  // Estado para gestionar el tooltip personalizado
  const [tooltipData, setTooltipData] = useState<TooltipInfo | null>(null);

  // --- Lógica de Cálculo de Datos (Sin cambios) ---
  const { heatmapData, overallMetrics, maxAttempted } = useMemo(() => {
    const hourlyData: HeatmapDataPoint[] = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`, successful: 0, attempted: 0, efficiency: null,
    }));

    orders.forEach(order => {
      const deliveryDateStr = order.delivered_at || order.confirmed_at;
      if (deliveryDateStr) {
        const deliveryDate = new Date(deliveryDateStr);
        if (!isNaN(deliveryDate.getTime())) {
          const hour = deliveryDate.getHours();
          hourlyData[hour].attempted += 1;
          if (['delivered', 'confirmed'].includes(order.status || '')) {
            hourlyData[hour].successful += 1;
          }
        }
      }
    });

    let maxVol = 0;
    const calculatedHeatmapData = hourlyData.map(hourData => {
      if (hourData.attempted > maxVol) maxVol = hourData.attempted;
      return {
        ...hourData,
        efficiency: hourData.attempted > 0 ? Math.round((hourData.successful / hourData.attempted) * 100) : null,
      };
    });

    const totalAttempted = calculatedHeatmapData.reduce((sum, data) => sum + data.attempted, 0);
    const totalSuccessful = calculatedHeatmapData.reduce((sum, data) => sum + data.successful, 0);
    const overallEfficiency = totalAttempted > 0 ? Math.round((totalSuccessful / totalAttempted) * 100) : 0;
    const peakHours = [...calculatedHeatmapData].sort((a, b) => b.attempted - a.attempted).slice(0, 3).filter(d => d.attempted > 0).map(data => data.hour);

    return { heatmapData: calculatedHeatmapData, overallMetrics: { totalAttempted, totalSuccessful, overallEfficiency, peakHours }, maxAttempted: maxVol > 0 ? maxVol : 1 };
  }, [orders]);

  // --- Función para determinar el color de la celda (Sin cambios) ---
  const getCellColor = (point: HeatmapDataPoint) => {
    if (point.attempted === 0 || point.efficiency === null) return 'rgba(51, 65, 85, 0.3)';
    const opacity = 0.2 + (point.attempted / maxAttempted) * 0.8;
    if (point.efficiency >= 80) return `rgba(74, 222, 128, ${opacity})`;
    if (point.efficiency >= 60) return `rgba(96, 165, 250, ${opacity})`;
    if (point.efficiency >= 40) return `rgba(251, 191, 36, ${opacity})`;
    return `rgba(248, 113, 113, ${opacity})`;
  };

  // --- Renderizado del Componente ---
  return (
    <div className="space-y-6 relative">
      {/* Tooltip Personalizado */}
      {tooltipData && (
        <div
          className="bg-slate-900/80 backdrop-blur-sm border border-slate-600 rounded-lg p-3 text-sm shadow-2xl pointer-events-none"
          style={{
            position: 'fixed',
            left: tooltipData.x + 15,
            top: tooltipData.y + 15,
            zIndex: 1000,
          }}
        >
          <p className="font-bold text-white mb-2">{tooltipData.data.hour}</p>
          {tooltipData.data.attempted > 0 ? (
            <>
              <p className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" />Éxitos: <span className="font-semibold text-white">{tooltipData.data.successful} / {tooltipData.data.attempted}</span></p>
              <p className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-500" />Eficiencia: <span className="font-semibold text-white">{tooltipData.data.efficiency}%</span></p>
            </>
          ) : (
            <p className="text-slate-400">Sin actividad en esta hora</p>
          )}
        </div>
      )}

      {/* Métricas Clave */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title="Total Entregas" value={overallMetrics.totalAttempted} icon={Package} delay={0.1} />
        <MetricCard title="Eficiencia General" value={overallMetrics.totalAttempted > 0 ? overallMetrics.overallEfficiency : 0} icon={TrendingUp} unit="%" colorClass={overallMetrics.overallEfficiency >= 70 ? 'text-green-400' : 'text-yellow-400'} delay={0.2} />
        <MetricCard title="Horas Pico" value={overallMetrics.peakHours.length > 0 ? overallMetrics.peakHours.join(', ') : '---'} icon={Clock} delay={0.3} />
      </div>

      {/* Mapa de Calor */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="bg-slate-900/60 rounded-xl p-4 sm:p-6 border border-slate-700/50 backdrop-blur-sm">
        <div className="grid grid-cols-12 gap-1.5">
          {heatmapData.map((point) => (
            <motion.div
              key={point.hour}
              onMouseEnter={(e) => setTooltipData({ data: point, x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setTooltipData(null)}
              onMouseMove={(e) => setTooltipData(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)}
              whileHover={{ scale: 1.1, zIndex: 10 }}
              className="w-full h-16 rounded-md border border-transparent hover:border-slate-400 cursor-pointer"
              style={{ backgroundColor: getCellColor(point) }}
            >
              <span className="text-xs text-slate-400 p-1 select-none">{point.hour.substring(0, 2)}</span>
            </motion.div>
          ))}
        </div>
        
        {/* Leyenda */}
        <div className="flex justify-center flex-wrap items-center gap-x-4 gap-y-2 mt-5 text-xs text-slate-400">
          <span>Bajo Vol.</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-red-500/30"></div>
            <div className="w-3 h-3 rounded-sm bg-yellow-500/50"></div>
            <div className="w-3 h-3 rounded-sm bg-blue-500/70"></div>
            <div className="w-3 h-3 rounded-sm bg-green-500/100"></div>
          </div>
          <span>Alto Vol.</span>
          <div className="w-px h-4 bg-slate-600 mx-2"></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-green-500"></div><span>Alta Efic.</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-500"></div><span>Baja Efic.</span></div>
        </div>
      </motion.div>
    </div>
  );
}
