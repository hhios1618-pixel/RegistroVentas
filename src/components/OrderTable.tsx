'use client';

import type { OrderRow, OrderStatus } from '@/lib/types';
import { User, Package, Truck } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

// --- Sub-componentes para el nuevo diseño ---

const StatusBadge = ({ status }: { status: OrderStatus | string | null }) => {
  let colorClasses = 'bg-[color:var(--hover-surface)] text-[color:var(--app-muted)] border-[color:var(--app-border)] dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600';
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

// --- NUEVO: Componente para indicador de encomienda ---
const EncomiendaBadge = ({ isEncomienda }: { isEncomienda?: boolean | null }) => {
  if (!isEncomienda) return null;
  
  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-apple-orange-500/15 text-apple-orange-600 border border-apple-orange-500/30 rounded-full text-xs font-medium dark:bg-orange-500/20 dark:text-orange-400">
      <Package size={12} />
      <span>Encomienda</span>
    </div>
  );
};

// --- NUEVO: Componente para fechas de encomienda ---
const EncomiendaDates = ({ order }: { order: OrderRow }) => {
  if (!order.is_encomienda) return null;
  
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'No definida';
    try {
      return new Date(dateStr).toLocaleDateString('es-BO', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  return (
    <div className="text-xs text-[color:var(--app-muted)] space-y-1 dark:text-slate-400">
      {order.fecha_salida_bodega && (
        <div className="flex items-center gap-1">
          <Truck size={10} />
          <span>Salida: {formatDate(order.fecha_salida_bodega)}</span>
        </div>
      )}
      {order.fecha_entrega_encomienda && (
        <div className="flex items-center gap-1">
          <Package size={10} />
          <span>Entrega: {formatDate(order.fecha_entrega_encomienda)}</span>
        </div>
      )}
    </div>
  );
};

const UserCell = ({ profile, fallbackText, label }: { profile: any, fallbackText?: string | null, label: string }) => {
  const getFullName = (p: any): string | null => !p ? null : (Array.isArray(p) ? p[0]?.full_name : p.full_name) || null;
  const getInitials = (name: string = ''): string => !name ? '?' : name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
  
  const name = getFullName(profile) || fallbackText;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-[color:var(--app-muted)] dark:text-slate-400">{label}:</span>
      {!name ? (
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[color:var(--hover-surface)] text-[color:var(--app-muted)] dark:bg-slate-600 dark:text-slate-400">
            <User size={12} />
          </div>
          <span className="text-[color:var(--app-muted)] dark:text-slate-500">Sin asignar</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-apple-blue-500/15 text-apple-blue-600 font-semibold text-xs dark:bg-indigo-900/50 dark:text-indigo-300">
            {getInitials(name)}
          </div>
          <span className="truncate font-medium text-[color:var(--app-foreground)] dark:text-white">{name}</span>
        </div>
      )}
    </div>
  );
};

// --- Componente Principal Rediseñado ---
export function OrderTable({ orders, onRowClick }: { orders: OrderRow[], onRowClick: (order: OrderRow) => void }) {
  
  if (orders.length === 0) {
    return (
      <div className="text-center py-16 text-[color:var(--app-muted)] dark:text-slate-500">
        <p className="font-semibold text-lg text-[color:var(--app-foreground)] dark:text-white">No se encontraron pedidos</p>
        <p className="text-sm">Intenta ajustar los filtros de búsqueda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Header (visible solo en pantallas grandes) */}
      <div className="hidden lg:grid grid-cols-[auto,1fr,1.5fr,1fr] gap-4 px-4 py-2 text-xs text-[color:var(--app-muted)] uppercase font-semibold tracking-wider dark:text-slate-400">
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
            className={cn(
              'grid grid-cols-1 lg:grid-cols-[auto,1fr,1.5fr,1fr] gap-x-4 gap-y-2 items-center rounded-apple border p-4 cursor-pointer transition-colors duration-200',
              order.is_encomienda
                ? 'bg-apple-orange-500/12 border-apple-orange-500/30 hover:bg-apple-orange-500/18 dark:bg-orange-900/20 dark:border-orange-500/40'
                : 'bg-[color:var(--app-card)] border-[color:var(--app-border)] hover:bg-[color:var(--app-card-hover)] dark:bg-slate-800/20 dark:border-slate-700/50 dark:hover:bg-slate-800/50'
            )}
          >
            {/* Columna 1: Nº Pedido */}
            <div className="flex flex-col gap-2">
              <div className="font-mono text-apple-blue-600 dark:text-blue-400 font-bold text-lg lg:pl-2">
                #{order.order_no || 'S/N'}
              </div>
              <EncomiendaBadge isEncomienda={order.is_encomienda} />
            </div>

            {/* Columna 2: Cliente */}
            <div className="text-sm">
              <div className="font-medium text-[color:var(--app-foreground)] dark:text-white">{order.customer_name || 'N/A'}</div>
              <div className="text-[color:var(--app-muted)] text-xs dark:text-slate-400">{order.customer_phone}</div>
              <EncomiendaDates order={order} />
            </div>

            {/* Columna 3: Vendedor y Repartidor */}
            <div className="flex flex-col gap-2 border-t border-[color:var(--app-border)] lg:border-none pt-2 lg:pt-0 dark:border-slate-700">
               <UserCell label="Vendedor" profile={order.seller_profile} fallbackText={order.seller} />
               <UserCell label="Repartidor" profile={order.delivery_profile} />
            </div>

            {/* Columna 4: Monto y Estado */}
            <div className="flex flex-col items-start gap-2 border-t border-[color:var(--app-border)] lg:border-none pt-2 lg:pt-0 lg:items-end dark:border-slate-700">
              <div className="font-semibold text-[color:var(--app-foreground)] text-base dark:text-white">
                Bs {order.amount?.toFixed(2) || '0.00'}
              </div>
              <StatusBadge status={order.status} />
              {order.is_encomienda && order.destino && (
                <div className="text-xs text-[color:var(--app-muted)] text-right dark:text-slate-400">
                  Destino: {order.destino}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
