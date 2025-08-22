// RUTA: src/components/StatusBadge.tsx
// CÓDIGO FINAL, SEGURO Y MEJORADO

import React from 'react';
import { cn } from '@/lib/utils/cn'; // Mantenemos tu utilidad `cn`
import { OrderStatus } from '@/lib/types';

interface StatusBadgeProps {
  status: OrderStatus | string;
  className?: string;
}

// Mapeo mejorado: ahora incluye la etiqueta en español que necesitamos.
const STATUS_INFO: Record<string, { label: string; style: string }> = {
  pending:          { label: 'Pendiente',         style: 'bg-yellow-500/20 text-yellow-400' },
  assigned:         { label: 'Asignado',          style: 'bg-blue-500/20 text-blue-400' },
  out_for_delivery: { label: 'En Ruta',           style: 'bg-indigo-500/20 text-indigo-400' },
  delivered:        { label: 'Entregado',         style: 'bg-green-500/20 text-green-400' },
  confirmed:        { label: 'Confirmado',        style: 'bg-teal-500/20 text-teal-400' },
  cancelled:        { label: 'Cancelado',         style: 'bg-red-500/20 text-red-400' }, // Corregido de "canceled" a "cancelled" si ese es tu tipo
  returned:         { label: 'Devuelto',          style: 'bg-orange-500/20 text-orange-400' },
  failed:           { label: 'Fallido',           style: 'bg-rose-500/20 text-rose-400' },
  default:          { label: 'Desconocido',       style: 'bg-gray-500/20 text-gray-400' },
};


// Mantenemos tu estructura de componente y exportación
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  // Buscamos la información del estado, si no la encuentra, usa 'default'
  const { label, style } = STATUS_INFO[status] || STATUS_INFO.default;

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        style,      // Aplicamos los estilos de color
        className   // Aplicamos cualquier clase extra que venga en las props
      )}
    >
      {label} {/* Usamos la etiqueta en español del mapeo */}
    </span>
  );
};