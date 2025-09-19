export type GeoFix = { lat: number; lng: number; accuracy: number; ts: number };

export async function getBestLocation(opts?: {
  samples?: number;           // cuántas lecturas intentar
  minAccuracy?: number;       // objetivo en metros (aceptar y cortar si se alcanza)
  hardLimit?: number;         // si ninguna lectura < hardLimit => devolver la mejor
  timeoutMs?: number;         // timeout total
}): Promise<GeoFix> {
  const samples = opts?.samples ?? 8;         // 8–12 en móviles suele bastar
  const minAcc  = opts?.minAccuracy ?? 35;    // objetivo: <= 35 m
  const hard    = opts?.hardLimit ?? 60;      // no aceptes > 60 m si puedes evitarlo
  const tmo     = opts?.timeoutMs ?? 12000;   // 12s total

  const fixes: GeoFix[] = [];
  const started = Date.now();

  const getOnce = () =>
    new Promise<GeoFix>((resolve, reject) => {
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          navigator.geolocation.clearWatch(id);
          const c = pos.coords;
          resolve({ lat: c.latitude, lng: c.longitude, accuracy: c.accuracy ?? 9999, ts: Date.now() });
        },
        (err) => {
          navigator.geolocation.clearWatch(id);
          reject(err);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: Math.min(4000, tmo) }
      );
    });

  while (fixes.length < samples && Date.now() - started < tmo) {
    try {
      const fix = await getOnce();
      fixes.push(fix);
      // ¿ya cumplimos objetivo?
      if (fix.accuracy <= minAcc) break;
      // Espera breve para permitir refinar satélites
      await new Promise(r => setTimeout(r, 300));
    } catch (_) {
      // ignora errores intermedios y sigue intentando
    }
  }

  if (!fixes.length) throw new Error('gps_unavailable');

  // Ordena por accuracy asc
  fixes.sort((a, b) => a.accuracy - b.accuracy);

  // Filtra outliers duros (> P80 de distancia relativa)
  const bestHalf = fixes.slice(0, Math.max(1, Math.floor(fixes.length * 0.7)));

  // Si hay alguno <= minAcc, toma el mejor
  const good = bestHalf.find(f => f.accuracy <= minAcc);
  if (good) return good;

  // Si no llegaste al objetivo, pero hay <= hardLimit, toma el mejor <= hard
  const hardOk = bestHalf.find(f => f.accuracy <= hard);
  if (hardOk) return hardOk;

  // En la peor: devuelve el mejor que haya (para mostrar al usuario y explicar que falta precisión)
  return bestHalf[0];
}