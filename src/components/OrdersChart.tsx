// src/components/OrdersChart.tsx
'use client';

import type { OrderRow } from '@/lib/types';
import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const statusConfig = {
  pending: { label: 'Pendiente', color: '#facc15' }, // yellow-400
  assigned: { label: 'Asignado', color: '#60a5fa' }, // blue-400
  out_for_delivery: { label: 'En Ruta', color: '#a78bfa' }, // violet-400
  confirmed: { label: 'Confirmado', color: '#4ade80' }, // green-400
  delivered: { label: 'Entregado', color: '#4ade80' }, // green-400
  cancelled: { label: 'Cancelado', color: '#f87171' }, // red-400
  failed: { label: 'Fallido', color: '#f87171' }, // red-400
  returned: { label: 'Devuelto', color: '#fb923c' }, // orange-400
};

export function OrdersChart({ orders }: { orders: OrderRow[] }) {
  const chartData = useMemo(() => {
    const counts = orders.reduce((acc, order) => {
      const status = order.status || 'pending';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts).map(([status, count]) => ({
      name: statusConfig[status as keyof typeof statusConfig]?.label || status,
      pedidos: count,
      color: statusConfig[status as keyof typeof statusConfig]?.color || '#8884d8',
    }));
  }, [orders]);

  if (!orders || orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 bg-gray-800/30 rounded-lg">
        No hay datos suficientes para mostrar el gráfico.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
        <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip
          cursor={{ fill: 'rgba(107, 114, 128, 0.1)' }}
          contentStyle={{
            background: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '0.5rem',
          }}
        />
        <Bar dataKey="pedidos">
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}