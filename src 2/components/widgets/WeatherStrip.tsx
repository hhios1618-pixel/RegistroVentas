'use client';
import { motion } from 'framer-motion';

type Wx = {
  city: string;
  tempC: number;
  condition: string;
  icon: string;
  rain1h: number;
  windKmh: number;
  risk?: 'Bajo'|'Medio'|'Alto';
};

export default function WeatherStrip(
  { data, updatedAt }: { data: Wx[]; updatedAt?: number }
) {
  const empty = !data || data.length === 0;

  return (
    <div className="relative">
      <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(1200px_600px_at_80%_-20%,rgba(255,255,255,.06),transparent)]" />
      <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Operativa de hoy</h3>
          <div className="text-xs text-white/50">
            {updatedAt ? `Actualizado ${new Date(updatedAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}` : '—'}
          </div>
        </div>

        {empty ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
            Sin datos meteorológicos. Operación normal.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {data.map((c, i) => (
              <motion.div
                key={c.city}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: .25, delay: i * 0.02 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-white/80 font-semibold leading-tight">{c.city}</div>
                  <RiskPill risk={c.risk ?? 'Bajo'} />
                </div>
                <div className="flex items-end gap-2">
                  <div className="text-3xl font-extrabold">{c.tempC}°C</div>
                  <img
                    src={`https://openweathermap.org/img/wn/${c.icon}@2x.png`}
                    alt={c.condition}
                    className="w-10 h-10 -mb-2 opacity-90"
                  />
                </div>
                <div className="text-sm text-white/70 mt-1 capitalize">{c.condition}</div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-white/70">
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                    <div className="opacity-70">Lluvia 1h</div>
                    <div className="font-semibold">{c.rain1h.toFixed(1)} mm</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                    <div className="opacity-70">Viento</div>
                    <div className="font-semibold">{c.windKmh} km/h</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RiskPill({ risk }: { risk: 'Bajo'|'Medio'|'Alto' }) {
  const cfg = risk === 'Alto'
    ? { dot:'bg-red-400', text:'text-red-300', ring:'border-red-400/30' }
    : risk === 'Medio'
      ? { dot:'bg-amber-300', text:'text-amber-300', ring:'border-amber-300/30' }
      : { dot:'bg-emerald-300', text:'text-emerald-300', ring:'border-emerald-300/30' };

  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold border ${cfg.ring} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      Riesgo {risk}
    </span>
  );
}