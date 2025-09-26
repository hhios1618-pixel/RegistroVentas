'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, Check, AlertTriangle, Loader2 } from 'lucide-react';

// --- TIPOS ---
interface RawDataRow {
  delivery_user_id: string;
  delivery_name: string;
  order_id: string;
  order_status: string;
  product_quantity: number; // Lo traemos pero no lo sumamos
  route_creation_time: string;
}

interface Trip {
  ida: number; // Ahora contará items, no quantity
  vuelta: number;
}

interface DeliverySettlement {
  delivery_name: string;
  trips: Trip[];
  total_ida: number;
  total_vuelta: number;
}

// --- LÓGICA DE PROCESAMIENTO EN EL FRONTEND ---
function processRawData(data: RawDataRow[]): DeliverySettlement[] {
  if (!data || data.length === 0) return [];

  const byDelivery = new Map<string, RawDataRow[]>();
  data.forEach(row => {
    if (!byDelivery.has(row.delivery_user_id)) {
      byDelivery.set(row.delivery_user_id, []);
    }
    byDelivery.get(row.delivery_user_id)!.push(row);
  });

  const result: DeliverySettlement[] = [];

  for (const rows of byDelivery.values()) {
    const sortedRows = rows.sort((a, b) => new Date(a.route_creation_time).getTime() - new Date(b.route_creation_time).getTime());

    const trips: Trip[] = [];
    if (sortedRows.length > 0) {
      let currentTrip = {
        orders: new Set<string>(),
        items: [] as RawDataRow[],
        time: new Date(sortedRows[0].route_creation_time).getTime(),
      };

      for (const row of sortedRows) {
        const rowTime = new Date(row.route_creation_time).getTime();
        // Si han pasado más de 30 minutos, es un nuevo viaje
        if (rowTime - currentTrip.time > 1800 * 1000) {
          if (currentTrip.items.length > 0) {
            const ida = currentTrip.items.length;
            const vuelta = currentTrip.items.filter(item => !['delivered', 'confirmed'].includes(item.order_status)).length;
            trips.push({ ida, vuelta });
          }
          currentTrip = { orders: new Set<string>(), items: [], time: rowTime };
        }
        currentTrip.items.push(row);
        currentTrip.time = rowTime; // Actualizar siempre a la última hora del item del viaje
      }
      
      // Guardar el último viaje
      if (currentTrip.items.length > 0) {
        const ida = currentTrip.items.length;
        const vuelta = currentTrip.items.filter(item => !['delivered', 'confirmed'].includes(item.order_status)).length;
        trips.push({ ida, vuelta });
      }
    }

    const total_ida = trips.reduce((sum, trip) => sum + trip.ida, 0);
    const total_vuelta = trips.reduce((sum, trip) => sum + trip.vuelta, 0);

    result.push({
      delivery_name: rows[0].delivery_name,
      trips,
      total_ida,
      total_vuelta,
    });
  }

  return result.sort((a, b) => a.delivery_name.localeCompare(b.delivery_name));
}

// --- COMPONENTE ---
export function SettlementTable() {
  const [data, setData] = useState<DeliverySettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState<Date>(new Date());

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        
        const dateString = date.toISOString().split('T')[0];
        
        const { data: rawData, error: rpcError } = await supabase.rpc('get_raw_settlement_data', {
          report_date: dateString,
        });

        if (rpcError) throw new Error(`Error en la base de datos: ${rpcError.message}`);
        
        const processedData = processRawData(rawData as RawDataRow[]);
        setData(processedData);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [date]);

  const maxTrips = Math.max(6, ...data.map(d => d.trips.length));

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const [year, month, day] = event.target.value.split('-').map(Number);
    setDate(new Date(year, month - 1, day));
  };

  const dateToInputValue = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl shadow-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-white">Reporte de Liquidación Diaria</h2>
        <div className="relative flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-slate-400" />
            <input
                type="date"
                value={dateToInputValue(date)}
                onChange={handleDateChange}
                className="bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-400">
          <thead className="text-xs text-slate-300 uppercase bg-slate-800/50">
            <tr>
              <th scope="col" className="px-4 py-3 rounded-l-lg w-1/4">Transportista</th>
              {[...Array(maxTrips)].map((_, i) => (
                <th key={i} scope="col" colSpan={2} className="px-4 py-3 text-center border-l border-slate-700">Viaje {i + 1}</th>
              ))}
              <th scope="col" colSpan={3} className="px-4 py-3 text-center border-l border-slate-700 rounded-r-lg">Resumen</th>
            </tr>
            <tr>
              <th scope="col" className="px-4 py-2"></th>
              {[...Array(maxTrips)].map((_, i) => (
                <React.Fragment key={i}>
                  <th scope="col" className="px-2 py-2 text-center font-medium border-l border-slate-700">Ida</th>
                  <th scope="col" className="px-2 py-2 text-center font-medium">Vuelta</th>
                </React.Fragment>
              ))}
              <th scope="col" className="px-2 py-2 text-center font-medium border-l border-slate-700">Entregados</th>
              <th scope="col" className="px-2 py-2 text-center font-medium">Devueltos</th>
              <th scope="col" className="px-2 py-2 text-center font-medium">Tasa Éxito</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={1 + maxTrips * 2 + 3} className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin inline-block" /></td></tr>
            )}
            {error && (
              <tr><td colSpan={1 + maxTrips * 2 + 3} className="text-center py-10"><div className="flex items-center justify-center gap-2 text-red-400"><AlertTriangle className="w-5 h-5" /> {error}</div></td></tr>
            )}
            {!loading && !error && data.length === 0 && (
              <tr><td colSpan={1 + maxTrips * 2 + 3} className="text-center py-10">No hay datos para la fecha seleccionada.</td></tr>
            )}
            {!loading && !error && data.map((delivery) => (
              <motion.tr key={delivery.delivery_name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-slate-800 hover:bg-slate-800/40">
                <td className="px-4 py-3 font-medium text-white whitespace-nowrap">{delivery.delivery_name}</td>
                {[...Array(maxTrips)].map((_, i) => {
                  const trip = delivery.trips[i];
                  return (
                    <React.Fragment key={i}>
                      <td className="text-center py-3 border-l border-slate-700">{trip ? trip.ida : ''}</td>
                      <td className="text-center py-3">
                        {trip && (trip.vuelta > 0 ? <span className="text-red-400 font-bold">{trip.vuelta}</span> : (trip.ida > 0 ? <Check className="w-4 h-4 text-green-400 inline-block" /> : ''))}
                      </td>
                    </React.Fragment>
                  );
                })}
                <td className="text-center py-3 border-l border-slate-700">{delivery.total_ida - delivery.total_vuelta}</td>
                <td className="text-center py-3">{delivery.total_vuelta > 0 ? <span className="text-red-400 font-bold">{delivery.total_vuelta}</span> : 0}</td>
                <td className="text-center py-3 font-semibold text-white">
                  {delivery.total_ida > 0 ? `${Math.round(((delivery.total_ida - delivery.total_vuelta) / delivery.total_ida) * 100)}%` : '---'}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
