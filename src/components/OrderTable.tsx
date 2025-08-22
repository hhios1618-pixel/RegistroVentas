'use client';

import type { OrderRow, OrderStatus } from '@/lib/types';
import { User } from 'lucide-react';

// --- Sub-componentes para el nuevo diseño ---

const StatusBadge = ({ status }: { status: OrderStatus | string | null }) => {
  let colorClasses = 'bg-slate-700 text-slate-300 border-slate-600';
  let text = status;

  switch (status) {
    case 'pending': colorClasses = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'; text = 'Pendiente'; break;
    case 'assigned': colorClasses = 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'; text = 'Asignado'; break;
    case 'confirmed': colorClasses = 'bg-blue-500/20 text-blue-400 border-blue-500/30'; text = 'Confirmado'; break;
    case 'out_for_delivery': colorClasses = 'bg-purple-500/20 text-purple-400 border-purple-500/30'; text = 'En Ruta'; break;
    case 'delivered': colorClasses = 'bg-green-500/20 text-green-400 border-green-500/30'; text = 'Entregado'; break;
    case 'cancelled': colorClasses = 'bg-red-500/20 text-red-400 border-red-500/30'; text = 'Cancelado'; break;
    default: text = String(status).charAt(0).toUpperCase() + String(status).slice(1); break;
  }

  return (
    <span className={`px-3 py-1 text-xs font-medium rounded-full border whitespace-nowrap ${colorClasses}`}>
      {text}
    </span>
  );
};

const UserCell = ({ profile, fallbackText, label }: { profile: any, fallbackText?: string | null, label: string }) => {
  const getFullName = (p: any): string | null => !p ? null : (Array.isArray(p) ? p[0]?.full_name : p.full_name) || null;
  const getInitials = (name: string = ''): string => !name ? '?' : name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
  
  const name = getFullName(profile) || fallbackText;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-slate-400">{label}:</span>
      {!name ? (
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-600 text-slate-400">
            <User size={12} />
          </div>
          <span className="text-slate-500">Sin asignar</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-indigo-900/50 text-indigo-300 font-semibold text-xs">
            {getInitials(name)}
          </div>
          <span className="truncate font-medium">{name}</span>
        </div>
      )}
    </div>
  );
};

// --- Componente Principal Rediseñado ---
export function OrderTable({ orders, onRowClick }: { orders: OrderRow[], onRowClick: (order: OrderRow) => void }) {
  
  if (orders.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        <p className="font-semibold text-lg">No se encontraron pedidos</p>
        <p className="text-sm">Intenta ajustar los filtros de búsqueda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Header (visible solo en pantallas grandes) */}
      <div className="hidden lg:grid grid-cols-[auto,1fr,1.5fr,1fr] gap-4 px-4 py-2 text-xs text-slate-400 uppercase font-semibold tracking-wider">
        <div className="pl-2">Pedido</div>
        <div>Cliente</div>
        <div>Asignaciones</div>
        <div className="text-right">Detalles</div>
      </div>

      {/* Lista de Pedidos (diseño de Grid) */}
      <div className="space-y-3">
        {orders.map((order) => (
          <div 
            key={order.id} 
            onClick={() => onRowClick(order)}
            className="grid grid-cols-1 lg:grid-cols-[auto,1fr,1.5fr,1fr] gap-x-4 gap-y-2 items-center bg-slate-800/20 hover:bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 cursor-pointer transition-colors duration-200"
          >
            {/* Columna 1: Nº Pedido */}
            <div className="font-mono text-blue-400 font-bold text-lg lg:pl-2">
              #{order.order_no || 'S/N'}
            </div>

            {/* Columna 2: Cliente */}
            <div className="text-sm">
              <div className="font-medium text-white">{order.customer_name || 'N/A'}</div>
              <div className="text-slate-400 text-xs">{order.customer_phone}</div>
            </div>

            {/* Columna 3: Vendedor y Repartidor */}
            <div className="flex flex-col gap-2 border-t border-slate-700 lg:border-none pt-2 lg:pt-0">
               <UserCell label="Vendedor" profile={order.seller_profile} fallbackText={order.seller} />
               <UserCell label="Repartidor" profile={order.delivery_profile} />
            </div>

            {/* Columna 4: Monto y Estado */}
            <div className="flex flex-col items-start gap-2 border-t border-slate-700 lg:border-none pt-2 lg:pt-0 lg:items-end">
              <div className="font-semibold text-white text-base">
                Bs {order.amount?.toFixed(2) || '0.00'}
              </div>
              <StatusBadge status={order.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}