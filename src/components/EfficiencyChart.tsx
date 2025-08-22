// RUTA: src/components/EfficiencyChart.tsx
// VERSIÓN CORREGIDA

'use client';

import type { OrderRow } from '@/lib/types';
import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { Clock, TrendingUp, Package } from 'lucide-react';

interface EfficiencyDataPoint {
  hour: string;
  successful: number;
  attempted: number;
  efficiency: number;
}

export function EfficiencyChart({ orders }: { orders: OrderRow[] }) {
  const chartData = useMemo(() => {
    // Preparar datos para las 24 horas del día
    const hourlyData: EfficiencyDataPoint[] = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      successful: 0,
      attempted: 0,
      efficiency: 0
    }));

    // Procesar órdenes para calcular eficiencia por hora
    orders.forEach(order => {
      // Usar delivered_at si está disponible, de lo contrario usar confirmed_at
      const deliveryDateStr = order.delivered_at || order.confirmed_at;
      
      if (deliveryDateStr) {
        try {
          const deliveryDate = new Date(deliveryDateStr);
          // Solo procesar si la fecha es válida
          if (!isNaN(deliveryDate.getTime())) {
            const hour = deliveryDate.getHours();
            
            // Solo contar entregas exitosas
            hourlyData[hour].attempted += 1;
            
            if (['delivered', 'confirmed'].includes(order.status || '')) {
              hourlyData[hour].successful += 1;
            }
          }
        } catch (e) {
          console.error('Error processing date:', deliveryDateStr, e);
        }
      }
    });

    // Calcular eficiencia para cada hora
    return hourlyData.map(hourData => ({
      ...hourData,
      efficiency: hourData.attempted > 0 
        ? Math.round((hourData.successful / hourData.attempted) * 100) 
        : 0
    }));
  }, [orders]);

  // Calcular métricas generales
  const overallMetrics = useMemo(() => {
    const totalAttempted = chartData.reduce((sum, data) => sum + data.attempted, 0);
    const totalSuccessful = chartData.reduce((sum, data) => sum + data.successful, 0);
    const overallEfficiency = totalAttempted > 0 
      ? Math.round((totalSuccessful / totalAttempted) * 100) 
      : 0;
    
    // Encontrar horas pico (las 3 horas con más intentos)
    const peakHours = chartData
      .map((data, index) => ({ hour: index, attempted: data.attempted }))
      .filter(data => data.attempted > 0)
      .sort((a, b) => b.attempted - a.attempted)
      .slice(0, 3)
      .map(data => `${data.hour.toString().padStart(2, '0')}:00`);
    
    return {
      totalAttempted,
      totalSuccessful,
      overallEfficiency,
      peakHours
    };
  }, [chartData]);

  if (!orders || orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-slate-800/20 rounded-lg p-6 text-center">
        <Package className="w-12 h-12 text-slate-500 mb-4" />
        <p className="text-slate-400 font-medium">No hay datos suficientes</p>
        <p className="text-slate-500 text-sm mt-1">No se encontraron entregas para analizar</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Métricas resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Package className="w-4 h-4" />
            <span className="text-sm">Total Entregas</span>
          </div>
          <div className="text-2xl font-bold text-white">{overallMetrics.totalAttempted}</div>
        </div>
        
        <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Eficiencia General</span>
          </div>
          <div className="text-2xl font-bold text-green-400">{overallMetrics.overallEfficiency}%</div>
        </div>
        
        <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Horas Pico</span>
          </div>
          <div className="text-lg font-medium text-white">
            {overallMetrics.peakHours.length > 0 
              ? overallMetrics.peakHours.join(', ') 
              : 'Sin datos'
            }
          </div>
        </div>
      </div>

      {/* Gráfico de barras */}
      <div className="bg-slate-900/40 rounded-xl p-4 border border-slate-700/30">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-400" />
          Eficiencia de Entregas por Hora del Día
        </h3>
        
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis 
              dataKey="hour" 
              stroke="#9ca3af" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false}
              interval={2}
            />
            <YAxis 
              stroke="#9ca3af" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false}
              tickFormatter={(value) => `${value}%`}
              width={40}
            />
            // Replace the existing Tooltip formatter with this:
<Tooltip
  formatter={(value: unknown, name: string) => {
    if (name === 'Eficiencia') {
      return [
        typeof value === 'number' ? `${(value * 100).toFixed(2)}%` : value,
        'Eficiencia'
      ] as [React.ReactNode, string];
    }
    return [
      value as number,
      name as 'Éxitos' | 'Intentos'
    ] as [React.ReactNode, string];
  }}
/>
            <Bar 
              dataKey="efficiency" 
              name="Eficiencia" 
              radius={[4, 4, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <rect 
                  key={`cell-${index}`}
                  fill={
                    entry.efficiency >= 80 ? '#4ade80' : 
                    entry.efficiency >= 60 ? '#60a5fa' : 
                    entry.efficiency >= 40 ? '#fbbf24' : 
                    '#f87171'
                  }
                />
              ))}
              <LabelList 
                dataKey="efficiency" 
                position="top" 
                formatter={(value: unknown) => (typeof value === 'number' && value > 0) ? `${value}%` : ''}
                fontSize={12}
                fill="#e5e7eb"
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        
        <div className="flex justify-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-green-500"></div>
            <span className="text-slate-400">Alta (≥80%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-blue-500"></div>
            <span className="text-slate-400">Media (60-79%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-yellow-500"></div>
            <span className="text-slate-400">Moderada (40-59%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-red-500"></div>
            <span className="text-slate-400">Baja (&lt;40%)</span>
          </div>
        </div>
      </div>
      
      {/* Insights generados */}
      {overallMetrics.peakHours.length > 0 && (
        <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-700/30">
          <h4 className="font-medium text-blue-300 mb-2">📈 Insights de Gestión</h4>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>• Horas de mayor eficiencia: {overallMetrics.peakHours.join(', ')}</li>
            <li>• Eficiencia general: {overallMetrics.overallEfficiency}%</li>
            {chartData.some(h => h.attempted > 0 && h.efficiency < 50) && (
              <li>• Considera reasignar recursos en horas con baja eficiencia</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}