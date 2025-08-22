import React from 'react';
import { cn } from '@/lib/utils/cn';
import { OrderStatus } from '@/lib/types';

interface StatusBadgeProps {
  status: OrderStatus | string;
  className?: string;
}

// CAMBIO: Exportación como named export
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const statusStyles: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    assigned: 'bg-blue-500/20 text-blue-400',
    out_for_delivery: 'bg-indigo-500/20 text-indigo-400',
    delivered: 'bg-green-500/20 text-green-400',
    confirmed: 'bg-teal-500/20 text-teal-400',
    canceled: 'bg-red-500/20 text-red-400',
    returned: 'bg-orange-500/20 text-orange-400',
    default: 'bg-gray-500/20 text-gray-400',
  };

  const style = statusStyles[status] || statusStyles.default;

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        style,
        className
      )}
    >
      {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
    </span>
  );
};