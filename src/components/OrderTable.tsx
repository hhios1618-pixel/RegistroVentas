// --- ARCHIVO: components/OrderTable.tsx (VERSIÓN CORREGIDA FINAL) ---
import type { OrderRow } from '@/types';
import { StatusBadge } from './StatusBadge';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  orders: OrderRow[];
  onRowClick: (order: OrderRow) => void;
}

const formatTimeAgo = (dateStr: string | null | undefined) => {
  if (!dateStr) return 'N/A';
  try { return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: es }); } 
  catch { return 'Fecha inválida'; }
};

export function OrderTable({ orders, onRowClick }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-left text-white/90">
        <thead className="text-xs text-white/60 uppercase bg-black/20">
          <tr>
            <th scope="col" className="px-6 py-3">Nº Pedido</th>
            <th scope="col" className="px-6 py-3">Cliente</th>
            <th scope="col" className="px-6 py-3">Repartidor</th>
            <th scope="col" className="px-6 py-3 text-right">Monto Total</th>
            <th scope="col" className="px-6 py-3 text-center">Estado</th>
            <th scope="col" className="px-6 py-3">Antigüedad</th>
          </tr>
        </thead>
        <tbody>
          {orders.length > 0 ? (
            orders.map((order) => (
              <tr
                key={order.id}
                className="border-b border-white/10 hover:bg-white/5 cursor-pointer transition-colors"
                onClick={() => onRowClick(order)}
              >
                <td className="px-6 py-4 font-mono text-blue-400 font-semibold">#{order.order_no || 'S/N'}</td>
                <td className="px-6 py-4">
                  <div className="font-medium">{order.customer_name || 'N/A'}</div>
                  <div className="text-gray-400 text-xs">{order.customer_phone}</div>
                </td>
                {/* ▼▼▼ CORRECCIÓN 1: USA 'seller' PARA EL NOMBRE DEL REPARTIDOR ▼▼▼ */}
                <td className="px-6 py-4 text-gray-300">{order.seller || <span className="text-gray-500">Sin asignar</span>}</td>
                {/* ▼▼▼ CORRECCIÓN 2: USA 'amount' PARA EL MONTO ▼▼▼ */}
                <td className="px-6 py-4 text-right font-semibold">Bs {order.amount?.toFixed(2) || '0.00'}</td>
                <td className="px-6 py-4 text-center"><StatusBadge status={order.status} /></td>
                <td className="px-6 py-4 text-gray-400">{formatTimeAgo(order.created_at)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="text-center py-12 text-white/50">
                No se encontraron pedidos.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
