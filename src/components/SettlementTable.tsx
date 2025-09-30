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
    <div className="glass-card transition-colors duration-500 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="apple-h3 text-[color:var(--app-foreground)] dark:text-white">
          Reporte de Liquidación Diaria
        </h2>
        <div className="flex items-center gap-2 text-[color:var(--app-muted)]">
          <CalendarIcon className="w-4 h-4" />
          <input
            type="date"
            value={dateToInputValue(date)}
            onChange={handleDateChange}
            className="field-sm w-[160px] bg-[color:var(--app-bg-strong)] text-[color:var(--app-foreground)] border border-[color:var(--app-border)] focus:ring-apple-blue-500/40 dark:bg-white/10 dark:text-white dark:border-white/15"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-full rounded-apple border border-[color:var(--app-border)] bg-[color:var(--app-bg-strong)]/85 shadow-[0_12px_30px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-black/20">
          <table className="w-full text-sm text-left text-[color:var(--app-muted)] dark:text-apple-gray-400">
            <thead className="text-xs uppercase tracking-wide">
              <tr className="bg-[color:var(--hover-surface)]/60 dark:bg-white/10">
                <th scope="col" className="px-4 py-3 font-semibold text-[color:var(--app-foreground)] dark:text-white rounded-l-apple">Transportista</th>
                {[...Array(maxTrips)].map((_, i) => (
                  <th
                    key={i}
                    scope="col"
                    colSpan={2}
                    className="px-4 py-3 text-center font-semibold text-[color:var(--app-foreground)] dark:text-white border-l border-[color:var(--app-border)] dark:border-white/10"
                  >
                    Viaje {i + 1}
                  </th>
                ))}
                <th
                  scope="col"
                  colSpan={3}
                  className="px-4 py-3 text-center font-semibold text-[color:var(--app-foreground)] dark:text-white border-l border-[color:var(--app-border)] dark:border-white/10 rounded-r-apple"
                >
                  Resumen
                </th>
              </tr>
              <tr className="bg-[color:var(--hover-surface)]/30 dark:bg-white/5">
                <th scope="col" className="px-4 py-2" />
                {[...Array(maxTrips)].map((_, i) => (
                  <React.Fragment key={i}>
                    <th scope="col" className="px-2 py-2 text-center font-medium text-[color:var(--app-muted)] border-l border-[color:var(--app-border)] dark:border-white/10">Ida</th>
                    <th scope="col" className="px-2 py-2 text-center font-medium text-[color:var(--app-muted)]">Vuelta</th>
                  </React.Fragment>
                ))}
                <th scope="col" className="px-2 py-2 text-center font-medium text-[color:var(--app-muted)] border-l border-[color:var(--app-border)] dark:border-white/10">Entregados</th>
                <th scope="col" className="px-2 py-2 text-center font-medium text-[color:var(--app-muted)]">Devueltos</th>
                <th scope="col" className="px-2 py-2 text-center font-medium text-[color:var(--app-muted)]">Tasa Éxito</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={1 + maxTrips * 2 + 3} className="text-center py-10">
                    <Loader2 className="w-6 h-6 text-[color:var(--app-muted)] animate-spin inline-block" />
                  </td>
                </tr>
              )}
              {error && (
                <tr>
                  <td colSpan={1 + maxTrips * 2 + 3} className="text-center py-10">
                    <div className="flex items-center justify-center gap-2 text-apple-red-500">
                      <AlertTriangle className="w-5 h-5" /> {error}
                    </div>
                  </td>
                </tr>
              )}
              {!loading && !error && data.length === 0 && (
                <tr>
                  <td colSpan={1 + maxTrips * 2 + 3} className="text-center py-10 text-[color:var(--app-muted)]">
                    No hay datos para la fecha seleccionada.
                  </td>
                </tr>
              )}
              {!loading && !error && data.map((delivery) => (
                <motion.tr
                  key={delivery.delivery_name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-t border-[color:var(--app-border)] dark:border-white/10 hover:bg-[color:var(--hover-surface)]/50 dark:hover:bg-white/5 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-[color:var(--app-foreground)] dark:text-white whitespace-nowrap">
                    {delivery.delivery_name}
                  </td>
                  {[...Array(maxTrips)].map((_, i) => {
                    const trip = delivery.trips[i];
                    return (
                      <React.Fragment key={i}>
                        <td className="text-center py-3 border-l border-[color:var(--app-border)] dark:border-white/10 text-[color:var(--app-foreground)] dark:text-white">
                          {trip ? trip.ida : ''}
                        </td>
                        <td className="text-center py-3 text-[color:var(--app-foreground)] dark:text-white">
                          {trip && (trip.vuelta > 0 ? (
                            <span className="text-apple-red-500 font-semibold">{trip.vuelta}</span>
                          ) : (trip.ida > 0 ? <Check className="w-4 h-4 text-apple-green-500 inline-block" /> : ''))}
                        </td>
                      </React.Fragment>
                    );
                  })}
                  <td className="text-center py-3 border-l border-[color:var(--app-border)] dark:border-white/10 text-[color:var(--app-foreground)] dark:text-white">
                    {delivery.total_ida - delivery.total_vuelta}
                  </td>
                  <td className="text-center py-3 text-[color:var(--app-foreground)] dark:text-white">
                    {delivery.total_vuelta > 0 ? (
                      <span className="text-apple-red-500 font-semibold">{delivery.total_vuelta}</span>
                    ) : 0}
                  </td>
                  <td className="text-center py-3 font-semibold text-[color:var(--app-foreground)] dark:text-white">
                    {delivery.total_ida > 0 ? `${Math.round(((delivery.total_ida - delivery.total_vuelta) / delivery.total_ida) * 100)}%` : '---'}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
