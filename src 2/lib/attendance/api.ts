// Lib de asistencia: tipos + llamadas a Edge Functions (qr, checkin)

export type CheckType = 'in' | 'out' | 'lunch_in' | 'lunch_out';

export type CheckInPayload = {
  person_id: string;
  site_id: string;
  type: CheckType;
  lat: number;
  lng: number;
  accuracy: number;
  device_id: string;
  selfie_base64: string; // para colación envía ''
  qr_code: string;       // para colación envía ''
};

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Si tienes var explícita para functions base, úsala; si no, derive del URL
const FUNCTIONS_BASE =
  process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL ??
  `${URL}/functions/v1`;

function assertEnv() {
  if (!URL || !ANON) throw new Error('Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o ANON_KEY');
}

async function handleFetchError(res: Response): Promise<Error> {
  // Manejo de errores más robusto
  // Si la respuesta no es JSON, usa el statusText.
  try {
    const json = await res.json();
    return new Error((json && (json.error || json.message)) || `Error ${res.status}`);
  } catch (e) {
    return new Error(`Error ${res.status}: ${res.statusText}`);
  }
}

// === QR ===
export async function getQR(site_id: string): Promise<{ code: string; exp_at: string }> {
  assertEnv();
  const url = `${FUNCTIONS_BASE}/qr?site_id=${encodeURIComponent(site_id)}&ttl=60`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${ANON}` },
    cache: 'no-store',
  });
  
  if (!res.ok) {
    throw await handleFetchError(res);
  }
  return res.json() as Promise<{ code: string; exp_at: string }>;
}

// === Check-in (turno y colación) ===
export async function checkIn(payload: CheckInPayload): Promise<{ ok: boolean }> {
  assertEnv();
  const res = await fetch(`${FUNCTIONS_BASE}/checkin`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ANON}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw await handleFetchError(res);
  }
  return res.json() as Promise<{ ok: boolean }>;
}