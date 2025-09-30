// --- ARCHIVO FINAL Y CORREGIDO: components/DeliveryCard.tsx ---
'use client';

import React from 'react';
import { User, MoreVertical, PackageCheck, BarChart2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/Card';
import { Button } from '@/components/Button';
import { cn } from '@/lib/utils/cn';
import { DeliveryCardProps } from '@/lib/types';
import { motion } from 'framer-motion';

export const DeliveryCard: React.FC<DeliveryCardProps> = ({
  delivery,
  stats,
  onViewDetails,
}) => {
  const loadPercentage = delivery.max_load ? ((delivery.current_load ?? 0) / delivery.max_load) * 100 : 0;
  
  const status = (() => {
    if (!delivery.active) return { label: 'Inactivo', color: 'bg-[color:var(--hover-surface)] text-[color:var(--app-muted)] dark:bg-gray-500/20 dark:text-gray-400' };
    if (stats.inProgressToday > 0) return { label: 'En Ruta', color: 'bg-apple-blue-500/15 text-apple-blue-600 dark:bg-blue-500/20 dark:text-blue-400' };
    if (stats.pendingToday > 0) return { label: 'Esperando Ruta', color: 'bg-apple-orange-500/15 text-apple-orange-600 dark:bg-yellow-500/20 dark:text-yellow-400' };
    return { label: 'Disponible', color: 'bg-apple-green-500/15 text-apple-green-600 dark:bg-green-500/20 dark:text-green-400' };
  })();

  // Esta función ya no necesita recibir el evento 'e'
  const handleMenuClick = () => {
    console.log("Botón de menú presionado para:", delivery.full_name);
    // Aquí puedes agregar la lógica para mostrar un menú desplegable.
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={cn(
          'cursor-pointer transition-all duration-300',
          'bg-[color:var(--app-card)] hover:bg-[color:var(--app-card-hover)] dark:bg-black/30 dark:hover:bg-black/20',
          'text-[color:var(--app-foreground)] dark:text-white',
          'border border-[color:var(--app-border)] hover:border-[color:var(--app-border-strong)] dark:border-white/15 dark:hover:border-apple-blue-500/40'
        )}
        onClick={() => onViewDetails(delivery)}
      >
        <CardHeader className="flex flex-row items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-apple-blue-500/15 to-apple-green-500/10 border border-[color:var(--app-border)] dark:border-apple-blue-500/30 flex items-center justify-center text-apple-blue-600 dark:text-white">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">{delivery.full_name}</h3>
              <p className="text-xs text-[color:var(--app-muted)] dark:text-gray-400">{delivery.vehicle_type || 'Vehículo no especificado'}</p>
            </div>
          </div>
          
          {/* ▼▼▼ CORRECCIÓN DEFINITIVA ▼▼▼ */}
          {/* Este div detiene la propagación del clic, y el botón solo llama a la función */}
          <div onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="small" onClick={handleMenuClick} className="p-2">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
          {/* ▲▲▲ FIN DE LA CORRECCIÓN ▲▲▲ */}

        </CardHeader>
        
        <CardContent className="p-4 pt-0 space-y-4">
          <div className="flex items-center justify-between">
            <span className={cn('px-2 py-1 text-xs font-medium rounded-full', status.color)}>
              {status.label}
            </span>
            <p className="text-xs text-[color:var(--app-muted)] dark:text-gray-400">Carga: {Math.round(loadPercentage)}%</p>
          </div>
          
          <div className="w-full bg-[color:var(--hover-surface)] dark:bg-gray-700/50 rounded-full h-1.5">
            <div
              className={cn(
                'h-1.5 rounded-full transition-all',
                loadPercentage >= 90 ? 'bg-apple-red-500' :
                loadPercentage >= 70 ? 'bg-apple-orange-500' : 'bg-apple-green-500'
              )}
              style={{ width: `${loadPercentage}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center border-t border-[color:var(--app-border)] dark:border-gray-700/50 pt-4">
              <div>
                <p className="text-sm text-[color:var(--app-muted)] dark:text-gray-400">Completadas</p>
                <p className="font-semibold text-base text-apple-green-600 dark:text-green-400 flex items-center justify-center gap-2">
                  <PackageCheck className="w-4 h-4" /> {stats.completedToday}
                </p>
              </div>
              <div>
                <p className="text-sm text-[color:var(--app-muted)] dark:text-gray-400">Total Hoy</p>
                <p className="font-semibold text-base text-[color:var(--app-foreground)] dark:text-white">{stats.totalToday}</p>
              </div>
              <div>
                <p className="text-sm text-[color:var(--app-muted)] dark:text-gray-400">Eficiencia</p>
                <p className="font-semibold text-base text-apple-blue-600 dark:text-blue-400 flex items-center justify-center gap-2">
                  <BarChart2 className="w-4 h-4" /> {stats.efficiency}%
                </p>
              </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};