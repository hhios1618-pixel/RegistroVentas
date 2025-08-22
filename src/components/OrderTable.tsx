// src/components/OrderTable.tsx
// (Este archivo es el mismo que te pasé en el mensaje anterior, pero lo incluyo para que tengas todo junto)
'use client';

import type { OrderRow, OrderStatus } from '@/lib/types';
import { StatusBadge } from './StatusBadge';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { User } from 'lucide-react';

// --- Interfaces y Helpers ---
interface UserCellProps {
  profile: OrderRow['seller_profile'];
  fallbackText?: string | null;
}

const getInitials = (name: string | null | undefined = ''): string => {
  if (!name) return '?';
  const words = name.split(' ').filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

const getFullName = (profile: OrderRow['seller_profile']): string | null => {
  if (!profile) return null;
  if (Array.isArray(profile)) {
    return profile[0]?.full_name || null;
  }
  return profile.full_name;
};

const formatTimeAgo = (dateStr: string | null | undefined) => {
  if (!dateStr) return 'N/A';
  try { return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: es }); } 
  catch { return 'Fecha inválida'; }
};

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('es-BO') : '—');
const fmtTime = (t?: string | null) => (t ? t.slice(0,5) : '');

// --- Componente de Celda de Usuario con Avatar ---
const UserCell: React.FC<UserCellProps> = ({ profile, fallbackText }) => {
  const name = getFullName(profile);
  const displayText = name || fallbackText;

  if (!displayText) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-600 text-gray-400">
          <User size={16} />
        </div>
        <span className="text-gray-500">Sin asignar</span>
      </div>
    );
  }

  const isFallbackUuid = /^[0-9a-f]{8}-/i.test(fallbackText || '');
  const initials = isFallbackUuid ? <User size={16} /> : getInitials(displayText);

  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-indigo-900/50 text-indigo-300 font-semibold text-xs">
        {initials}
      </div>
      <span className="truncate font-medium">{displayText}</span>
    </div>
  );
};

// --- Componente Principal de la Tabla Rediseñada ---
export function OrderTable({ orders, onRowClick }: { orders: OrderRow[], onRowClick: (order: OrderRow) => void }) {
  return (
    <div className="overflow-x-auto bg-gray-800/30 rounded-lg border border-gray-700">
      <table className="min-w-full text-sm text-left text-gray-300">
        <thead className="text-xs text-gray-400 uppercase bg-gray-900/50">
          <tr>
            <th className="px-5 py-3 font-semibold tracking-wider">Nº Pedido</th>
            <th className="px-5 py-3 font-semibold tracking-wider">Cliente</th>
            <th className="px-5 py-3 font-semibold tracking-wider">Vendedor</th>
            <th className="px-5 py-3 font-semibold tracking-wider">Repartidor</th>
            <th className="px-5 py-3 font-semibold tracking-wider">Entrega</th>
            <th className="px-5 py-3 font-semibold tracking-wider text-right">Monto</th>
            <th className="px-5 py-3 font-semibold tracking-wider text-center">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700/50">
          {orders.length > 0 ? (
            orders.map((order, index) => (
              <tr
                key={order.id}
                className={`transition-colors duration-150 ${index % 2 === 0 ? 'bg-black/10' : 'bg-black/20'} hover:bg-indigo-900/20 cursor-pointer`}
                onClick={() => onRowClick(order)}
              >
                <td className="px-5 py-4 font-mono text-blue-400 font-bold">#{order.order_no || 'S/N'}</td>
                <td className="px-5 py-4">
                  <div className="font-medium text-white truncate">{order.customer_name || 'N/A'}</div>
                  <div className="text-gray-400 text-xs">{order.customer_phone}</div>
                </td>
                <td className="px-5 py-4"><UserCell profile={order.seller_profile} fallbackText={order.seller} /></td>
                <td className="px-5 py-4"><UserCell profile={order.delivery_profile} /></td>
                <td className="px-5 py-4 whitespace-nowrap">
                  <div className="font-medium text-white">{fmtDate(order.delivery_date)}</div>
                  {(order.delivery_from || order.delivery_to) && (
                    <div className="text-gray-400 text-xs">{fmtTime(order.delivery_from)}{order.delivery_to ? ` – ${fmtTime(order.delivery_to)}` : ''}</div>
                  )}
                </td>
                <td className="px-5 py-4 text-right font-semibold text-white">Bs {order.amount?.toFixed(2) || '0.00'}</td>
                <td className="px-5 py-4 text-center"><StatusBadge status={order.status} /></td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7} className="text-center py-16 text-gray-500">
                <p className="font-semibold text-lg">No se encontraron pedidos</p>
                <p className="text-sm">Intenta ajustar los filtros de búsqueda.</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}