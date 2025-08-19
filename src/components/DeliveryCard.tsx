// --- ARCHIVO: components/DeliveryCard.tsx ---
'use client';

import React from 'react';
import { User, Truck, MoreVertical, PackageCheck, BarChart2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/Card';
import Button from '@/components/Button';
import { cn } from '@/lib/utils/cn';
import { DeliveryCardProps } from '@/types';

export const DeliveryCard: React.FC<DeliveryCardProps> = ({
  delivery,
  stats,
  onViewDetails,
}) => {
  const loadPercentage = delivery.max_load ? ((delivery.current_load ?? 0) / delivery.max_load) * 100 : 0;
  
  const status = (() => {
    if (!delivery.is_active) return { label: 'Inactivo', color: 'bg-gray-500/20 text-gray-400' };
    if (stats.inProgressToday > 0) return { label: 'En Ruta', color: 'bg-blue-500/20 text-blue-400' };
    if (stats.pendingToday > 0) return { label: 'Esperando Ruta', color: 'bg-yellow-500/20 text-yellow-400' };
    return { label: 'Disponible', color: 'bg-green-500/20 text-green-400' };
  })();

  // Lógica para el menú de acciones (separada para mayor claridad)
  const handleMenuClick = () => {
    // Detenemos la propagación aquí para que no se dispare el onClick de la tarjeta.
    // Esta es la forma correcta de manejarlo si el botón no puede recibir 'e'.
    // Sin embargo, el evento se propaga al hacer clic en el botón,
    // así que necesitamos manejar la detención de la propagación en el padre si es posible,
    // o modificar el componente Button para que acepte el evento.
    // Por ahora, asumiremos que el botón debe funcionar de forma independiente.
    
    // Aquí puedes agregar la lógica para mostrar un menú desplegable.
    console.log("Botón de menú presionado para:", delivery.full_name);
  };

  return (
    <Card 
      className="bg-gray-800/50 border border-gray-700 hover:border-blue-500 transition-all text-white cursor-pointer"
      onClick={() => onViewDetails(delivery.id)}
    >
      <CardHeader className="flex flex-row items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-900/50 flex items-center justify-center border border-blue-700">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base">{delivery.full_name}</h3>
            <div className="text-xs text-gray-400 flex items-center gap-1.5 mt-1">
              <Truck className="w-3 h-3" /> {delivery.vehicle_type || 'N/D'}
            </div>
          </div>
        </div>
        
        {/* CORRECCIÓN: El onClick ahora es una función sin parámetros */}
        <div onClick={(e) => e.stopPropagation()}>
          <Button 
              variant="ghost" 
              size="small" 
              onClick={handleMenuClick} 
              className="p-2"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-0 space-y-4">
        <div className="flex items-center justify-between">
          <span className={cn('px-2 py-1 text-xs font-medium rounded-full', status.color)}>
            {status.label}
          </span>
        </div>
        
        <div className="w-full bg-gray-700/50 rounded-full h-1.5">
          <div 
            className={cn(
              'h-1.5 rounded-full transition-all',
              loadPercentage >= 90 ? 'bg-red-500' :
              loadPercentage >= 70 ? 'bg-orange-500' : 'bg-green-500'
            )}
            style={{ width: `${loadPercentage}%` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-2 text-center border-t border-gray-700 pt-4">
            <div>
              <p className="text-sm text-gray-400">Completadas</p>
              <p className="font-bold text-lg text-green-400 flex items-center justify-center gap-2">
                <PackageCheck className="w-4 h-4" /> {stats.completedToday}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Hoy</p>
              <p className="font-bold text-lg">{stats.totalToday}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Eficiencia</p>
              <p className="font-bold text-lg text-blue-400 flex items-center justify-center gap-2">
                <BarChart2 className="w-4 h-4" /> {stats.efficiency}%
              </p>
            </div>
        </div>
      </CardContent>
    </Card>
  );
};