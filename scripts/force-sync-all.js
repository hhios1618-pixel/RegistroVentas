// scripts/force-sync-all.js
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SRK) { console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE'); process.exit(1); }

const LOGIN_DOMAIN     = process.env.LOGIN_DOMAIN || 'fenix.local';
const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || 'FENIX2025!';
const ONLY_ACTIVE      = (process.env.ONLY_ACTIVE ?? 'true').toLowerCase() !== 'false';
const FILTER_ROLES     = (process.env.FILTER_ROLES || '').split(',').map(s=>s.trim()).filter(Boolean);
const CONCURRENCY      = Number(process.env.CONCURRENCY || 10);
const SLEEP_MS         = Number(process.env.SLEEP_MS || 25);
const OUT_CSV          = process.env.OUT_CSV || 'force-sync-results.csv';
const DRY_RUN          = (process.env.DRY_RUN || 'false').toLowerCase() === 'true';

const admin = createClient(URL, SRK, { auth: { persistSession: false } });

const toAscii = s => String(s ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x00-\x7F]/g, '');
const sanitizeLocalPart = username => {
  const base = toAscii(username.trim().toLowerCase())
    .replace(/\s+/g, '.').replace(/[^a-z0-9._%+-]/g, '.')
    .replace(/\.+/g, '.').replace(/^\.|\.$/g, '');
  return base || 'u';
};
const computeEmail = (username,id,domain) => {
  const id6 = String(id||'').replace(/-/g,'').slice(0,6) || crypto.randomBytes(3).toString('hex');
  let local = sanitizeLocalPart(username);
  const maxLocal = 64 - 1 - id6.length;
  if (local.length > maxLocal) local = local.slice(0, maxLocal);
  return `${local}-${id6}@${domain}`;
};
const sleep = ms => new Promise(r=>setTimeout(r,ms));

async function fetchPeople() {
  let q = admin.from('people').select('id, username, role, active, user_id, email');
  if (ONLY_ACTIVE) q = q.eq('active', true);
  const { data, error } = await q;
  if (error) throw error;
  let rows = data || [];
  if (FILTER_ROLES.length) rows = rows.filter(p => p.role && FILTER_ROLES.includes(p.role));
  return rows;
}

async function upsertOne(p) {
  const username = String(p.username ?? '').trim();
  if (!username) return { ok:false, reason:'username_vacio' };
  if (p.active === false) return { ok:false, reason:'usuario_inactivo' };

  const email = computeEmail(username, p.id, LOGIN_DOMAIN);
  const password = DEFAULT_PASSWORD;
  let userId = p.user_id || null;

  if (DRY_RUN) return { ok:true, action: userId?'update(auth)':'create(auth)', email, user_id:userId, dry_run:true };

  try {
    if (userId) {
      // UPDATE (con confirmación de email)
      const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
        email,
        password,
        email_confirm: true, // <=== CLAVE
        user_metadata: { role: p.role, username }
      });
      if (updErr) throw updErr;
    } else {
      // CREATE (confirmado)
      const { data: created, error: crtErr } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { role: p.role, username }
      });
      if (crtErr) throw crtErr;
      userId = created?.user?.id || null;

      const { error: linkErr } = await admin.from('people').update({ user_id: userId }).eq('id', p.id);
      if (linkErr) throw linkErr;
    }

    if (p.email !== email) {
      const { error: e2 } = await admin.from('people').update({ email }).eq('id', p.id);
      if (e2) throw e2;
    }

    return { ok:true, action: p.user_id?'updated':'created', email, user_id:userId };
  } catch (e) {
    return { ok:false, reason: e?.message || String(e), email, user_id:userId||'' };
  }
}

async function run() {
  console.log('▶ Cargando people …');
  const people = await fetchPeople();
  console.log(`Encontradas ${people.length} personas${ONLY_ACTIVE?' (active=true)':''}${FILTER_ROLES.length?` roles=${FILTER_ROLES.join(',')}`:''}.`);
  console.log(`Dominio: ${LOGIN_DOMAIN} | Password: ${DEFAULT_PASSWORD} | Concurrency=${CONCURRENCY} | DryRun=${DRY_RUN}`);
  console.log('▶ Sincronizando …');

  const header = 'username,email,user_id,action,ok,reason,role';
  const out = [header];
  let ok=0, fail=0, done=0;

  const queue = [...people];
  const workers = Array.from({ length: Math.max(1, CONCURRENCY) }, async () => {
    while (queue.length) {
      const p = queue.shift();
      const res = await upsertOne(p);
      out.push([p.username, res.email||'', res.user_id||'', res.action||'', res.ok?'1':'0', res.ok?'':(res.reason||''), p.role||''].join(','));
      if (res.ok) ok++; else fail++;
      done++;
      if (done % 50 === 0) console.log(`… progreso: ${done}/${people.length} (OK=${ok} FAIL=${fail})`);
      await sleep(SLEEP_MS);
    }
  });

  await Promise.all(workers);
  const outPath = path.resolve(process.cwd(), OUT_CSV);
  fs.writeFileSync(outPath, out.join('\n'), 'utf8');
  console.log(`\n✅ Terminado. OK=${ok} FAIL=${fail}`);
  console.log(`📄 CSV: ${outPath}`);
}

run().catch(e => { console.error('💥 ERROR:', e?.message || e); process.exit(1); });