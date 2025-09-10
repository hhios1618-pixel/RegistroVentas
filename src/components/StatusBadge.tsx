// RUTA: src/components/StatusBadge.tsx
// CÓDIGO FINAL, SEGURO Y MEJORADO

import React from 'react';
import { cn } from '@/lib/utils/cn'; // Mantenemos tu utilidad `cn`
import { OrderStatus } from '@/lib/types';

interface StatusBadgeProps {
  status: OrderStatus | string;
  className?: string;
}

// Mapeo mejorado con estilo Apple: ahora incluye la etiqueta en español que necesitamos.
const STATUS_INFO: Record<string, { label: string; style: string }> = {
  pending:          { label: 'Pendiente',         style: 'status-warning' },
  assigned:         { label: 'Asignado',          style: 'bg-apple-blue/10 text-apple-blue border border-apple-blue/20 rounded-apple-sm px-3 py-1 text-xs font-medium' },
  out_for_delivery: { label: 'En Ruta',           style: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-apple-sm px-3 py-1 text-xs font-medium' },
  delivered:        { label: 'Entregado',         style: 'status-success' },
  confirmed:        { label: 'Confirmado',        style: 'status-success' },
  cancelled:        { label: 'Cancelado',         style: 'status-error' },
  returned:         { label: 'Devuelto',          style: 'bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-apple-sm px-3 py-1 text-xs font-medium' },
  failed:           { label: 'Fallido',           style: 'status-error' },
  default:          { label: 'Desconocido',       style: 'status-pending' },
};


// Mantenemos tu estructura de componente y exportación
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  // Buscamos la información del estado, si no la encuentra, usa 'default'
  const { label, style } = STATUS_INFO[status] || STATUS_INFO.default;

  return (
    <span
      className={cn(
        'inline-flex items-center transition-all duration-200 ease-in-out',
        style,      // Aplicamos los estilos de color Apple
        className   // Aplicamos cualquier clase extra que venga en las props
      )}
    >
      {label} {/* Usamos la etiqueta en español del mapeo */}
    </span>
  );
};

