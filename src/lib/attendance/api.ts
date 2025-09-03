// src/lib/attendance/api.ts

export type CheckInPayload = {
  person_id: string;
  site_id: string;
  type: 'in' | 'out';
  lat: number;
  lng: number;
  accuracy: number;
  device_id: string;
  selfie_base64: string;
  qr_code: string;
};

type QrResp = { code: string; exp_at: string };
type CheckInResp = { ok: boolean; distance_m: number; recorded_at: string };

const PROJECT_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const FUNCTIONS_BASE = PROJECT_URL.replace('.supabase.co', '.functions.supabase.co');
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function assertEnv() {
  if (!PROJECT_URL) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  if (!ANON) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export async function getQR(site_id: string): Promise<QrResp> {
  assertEnv();
  const url = `${FUNCTIONS_BASE}/qr?site_id=${encodeURIComponent(site_id)}&ttl=60`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${ANON}` }, cache: 'no-store' });
  let json: any = null;
  try { json = await res.json(); } catch {}
  if (!res.ok) {
    const err = (json && (json.error || json.message)) || `qr_failed_${res.status}`;
    throw new Error(err);
  }
  return json as QrResp;
}

export async function checkIn(payload: CheckInPayload): Promise<CheckInResp> {
  assertEnv();
  const res = await fetch(`${FUNCTIONS_BASE}/checkin`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ANON}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  let json: any = null;
  try { json = await res.json(); } catch {}
  if (!res.ok) {
    const base = (json && (json.error || json.message)) || `checkin_failed_${res.status}`;
    const extra =
      json && json.distance_m !== undefined
        ? ` (${Math.round(json.distance_m)} m, radio ${json.required_radius ?? 'N/A'} m)`
        : '';
    throw new Error(base + extra);
  }
  return json as CheckInResp;
}