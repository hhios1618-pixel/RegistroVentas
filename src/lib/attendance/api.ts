// src/lib/attendance/api.ts
export type CheckType = 'in' | 'out' | 'lunch_in' | 'lunch_out';

export type CheckInPayload = {
  person_id: string;     // DEBE ser public.people.id
  site_id: string;
  type: CheckType;
  device_id: string;
  qr_code: string;
  lat?: number;
  lng?: number;
  accuracy?: number;
  selfie_base64?: string;
};

export type CheckInInput = Omit<CheckInPayload, 'person_id'>;

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const FUNCTIONS_BASE =
  process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL ?? `${URL}/functions/v1`;

function assertEnv() {
  if (!URL || !ANON) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
}

async function handleFetchError(res: Response): Promise<Error> {
  try {
    const json = await res.json();
    return new Error((json && (json.error || json.message)) || `Error ${res.status}`);
  } catch {
    return new Error(`Error ${res.status}: ${res.statusText}`);
  }
}

/** QR temporal para check-in */
export async function getQR(
  site_id: string,
  type: CheckType,
  ttlSec = 60
): Promise<{ code: string; exp_at: string }> {
  const params = new URLSearchParams({ site_id, type, ttl: String(ttlSec) });
  const res = await fetch(`/endpoints/attendance/qr?${params.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw await handleFetchError(res);
  return res.json();
}

/** Resuelve el ID de persona (public.people.id) desde /endpoints/me */
function resolvePersonId(me: any): string {
  // Prioriza el campo que devuelve /endpoints/me
  const id =
    me?.person_pk ||   // <-- public.people.id (preferido)
    me?.id ||          // por si tu /me también lo trae con esta key
    me?.person_id ||   // compatibilidad
    me?.user_id ||     // último recurso si mapeaste igual (no ideal)
    null;

  if (!id) throw new Error('person_lookup_failed');
  return String(id);
}

/** Llama al Edge Function /checkin */
export async function checkIn(payload: CheckInInput, me: any): Promise<{ ok: boolean }> {
  assertEnv();
  const person_id = resolvePersonId(me);

  const res = await fetch(`${FUNCTIONS_BASE}/checkin`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ANON}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...payload, person_id }),
  });

  if (!res.ok) throw await handleFetchError(res);
  return res.json();
}