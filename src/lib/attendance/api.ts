// src/lib/attendance/api.ts
export type CheckType = 'in' | 'out' | 'lunch_in' | 'lunch_out';

export type CheckInPayload = {
  person_id: string;
  site_id: string;
  type: CheckType;
  device_id: string;
  qr_code: string;       // requerido siempre
  // Solo para in/out:
  lat?: number;
  lng?: number;
  accuracy?: number;
  selfie_base64?: string;
};

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const FUNCTIONS_BASE =
  process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL ??
  `${URL}/functions/v1`;

function assertEnv() {
  if (!URL || !ANON) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

async function handleFetchError(res: Response): Promise<Error> {
  try {
    const json = await res.json();
    return new Error((json && (json.error || json.message)) || `Error ${res.status}`);
  } catch {
    return new Error(`Error ${res.status}: ${res.statusText}`);
  }
}

export async function getQR(
  site_id: string,
  type: CheckType,
  ttlSec = 60
): Promise<{ code: string; exp_at: string }> {
  const params = new URLSearchParams({
    site_id,
    type,
    ttl: String(ttlSec),
  });
  const res = await fetch(`/endpoints/attendance/qr?${params.toString()}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw await handleFetchError(res);
  return res.json();
}

export async function checkIn(payload: CheckInPayload): Promise<{ ok: boolean }> {
  assertEnv();
  const res = await fetch(`${FUNCTIONS_BASE}/checkin`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await handleFetchError(res);
  return res.json();
}
