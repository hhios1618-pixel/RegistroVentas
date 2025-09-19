'use client';
import { motion } from 'framer-motion';

type Incident = {
  id: string;
  city: 'Santa Cruz'|'Sucre'|'La Paz'|'El Alto'|'Cochabamba';
  title: string;
  area: string;
  severity: 'low'|'med'|'high';
  updatedAt: string;
  lat?: number;
  lon?: number;
  source: 'here';
};

export default function TrafficPanel({
  incidents,
  updatedAt,
  onMapClick,
}: {
  incidents: Incident[];
  updatedAt?: number;
  onMapClick?: () => void;
}) {
  const count = incidents.length;

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_90%_-30%,rgba(255,255,255,.06),transparent)] rounded-2xl" />
      <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5">
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="text-lg font-bold">Tránsito y cortes</h3>
          <button
            onClick={onMapClick}
            className="text-sm text-white/70 hover:text-white"
          >
            Ver mapa →
          </button>
        </div>

        {count === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-white/70">
            <div className="text-base font-semibold text-emerald-300">Operativa normal</div>
            <div className="text-sm">Sin incidentes activos en las zonas monitoreadas.</div>
            {updatedAt && (
              <div className="text-xs text-white/40 mt-2">
                Actualizado {new Date(updatedAt).toLocaleTimeString('es-BO',{hour:'2-digit',minute:'2-digit'})} · Fuente: HERE
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="text-sm text-white/70 mb-3">
              {count} incidente{count>1?'s':''} activo{count>1?'s':''} · Fuente: HERE
              {updatedAt && (
                <span className="ml-2 text-white/40">
                  · {new Date(updatedAt).toLocaleTimeString('es-BO',{hour:'2-digit',minute:'2-digit'})}
                </span>
              )}
            </div>
            <div className="grid gap-2">
              {incidents.slice(0, 8).map((it, idx) => (
                <motion.div
                  key={it.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: .25, delay: idx * 0.03 }}
                  className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <SeverityDot level={it.severity} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">
                      {it.city} · {it.title}
                    </div>
                    <div className="text-xs text-white/70 truncate">
                      {it.area} · {new Date(it.updatedAt).toLocaleTimeString('es-BO',{hour:'2-digit',minute:'2-digit'})}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SeverityDot({ level }:{ level:'low'|'med'|'high' }) {
  const c = level === 'high' ? 'bg-red-400'
        : level === 'med'  ? 'bg-amber-300'
        : 'bg-emerald-300';
  return <span className={`mt-1 w-2.5 h-2.5 rounded-full ${c}`} />;
}