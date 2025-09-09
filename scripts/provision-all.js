// scripts/provision-all.js
// Provisiona TODOS los usuarios de public.people en Supabase Auth.
// - Sin confirmación
// - Email válido y único: <sanitized>-<id6>@DOMAIN (sin while, sin Set)
// - Crea/actualiza password en Auth
// - Linkea people.user_id
// - CSV: username,email,user_id,password,role
// - Filtro por roles (FILTER_ROLES) y CSV por rol (SPLIT_BY_ROLE)
// - Logs de progreso

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE  = process.env.SUPABASE_SERVICE_ROLE;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('❌ Faltan env: NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE en .env.local');
  process.exit(1);
}

// ====== CONFIG ======
const DOMAIN           = process.env.LOGIN_DOMAIN || 'fenix.local';   // <local>@DOMAIN
const ONLY_ACTIVE      = (process.env.ONLY_ACTIVE ?? 'true').toLowerCase() !== 'false';
const MODE             = (process.env.MODE ?? 'uniform').toLowerCase(); // 'uniform' | 'random'
const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || 'FENIX2025!';
const OUT_CSV          = process.env.OUT_CSV || 'provisioned-users.csv';
const SLEEP_MS         = Number(process.env.SLEEP_MS ?? 25);          // pequeño delay para no topar rate limit
const CLEAR_PLAINTEXT  = (process.env.CLEAR_PLAINTEXT ?? 'false').toLowerCase() === 'true';

// Roles
const FILTER_ROLES = (process.env.FILTER_ROLES || '') // "admin,delivery"
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const SPLIT_BY_ROLE = (process.env.SPLIT_BY_ROLE || 'false').toLowerCase() === 'true';

// ====== SUPABASE ADMIN CLIENT ======
const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

// ====== HELPERS ======
const toAscii = (s) =>
  String(s ?? '')
    .normalize('NFKD')                // separa diacríticos
    .replace(/[\u0300-\u036f]/g, '')  // quita acentos
    .replace(/[^\x00-\x7F]/g, '');    // quita no-ASCII (emoji, etc.)

function sanitizeLocalPart(username) {
  const base = toAscii(username.trim().toLowerCase())
    .replace(/\s+/g, '.')              // espacios -> .
    .replace(/[^a-z0-9._%+-]/g, '.')   // lo raro -> .
    .replace(/\.+/g, '.')              // .. -> .
    .replace(/^\.|\.$/g, '');          // trim de puntos
  return base || 'u';
}

// Email determinístico, único y sin loops: <sanitized>-<id6>@domain
function emailFrom(username, domain, id) {
  const id6 = String(id || '')
    .replace(/-/g, '')
    .slice(0, 6) || crypto.randomBytes(3).toString('hex');

  let local = sanitizeLocalPart(username);
  const maxLocal = 64 - 1 - id6.length; // 64 = límite RFC del local-part
  if (local.length > maxLocal) local = local.slice(0, maxLocal);
  return `${local}-${id6}@${domain}`;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function genPassword(len = 10) {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%*';
  let p = '';
  for (let i = 0; i < len; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p;
}

// ====== MAIN ======
(async function main() {
  console.log('▶ Leyendo personas desde public.people …');

  let query = admin
    .from('people')
    .select('id, username, role, active, user_id');

  if (ONLY_ACTIVE) query = query.eq('active', true);

  const { data: people, error } = await query;
  if (error) {
    console.error('❌ Error leyendo people:', error.message);
    process.exit(1);
  }

  let list = people || [];
  if (FILTER_ROLES.length > 0) {
    const set = new Set(FILTER_ROLES);
    list = list.filter(p => p.role && set.has(p.role));
  }

  if (!list.length) {
    console.log('No hay filas para provisionar con el filtro dado.');
    process.exit(0);
  }

  console.log(`Encontradas ${list.length} personas${ONLY_ACTIVE ? ' (solo active=true)' : ''}.`);
  console.log(`Modo passwords: ${MODE === 'uniform' ? `UNIFORME (${DEFAULT_PASSWORD})` : 'RANDOM por usuario'}`);
  console.log(`Email sintético: <sanitized>-<id6>@${DOMAIN}`);
  console.log('▶ Comenzando provisión…\n');

  const out = ['username,email,user_id,password,role'];
  let ok = 0, fail = 0;
  let i = 0;

  for (const p of list) {
    i++;
    const username = String(p.username ?? '').trim();
    if (!username) {
      console.error(`✖ [${i}/${list.length}] id=${p.id} sin username. Saltando.`);
      out.push(`,${'@'+DOMAIN},,ERROR:username_vacio,${p.role ?? ''}`);
      fail++;
      continue;
    }

    const email = emailFrom(username, DOMAIN, p.id);
    const password = MODE === 'uniform' ? DEFAULT_PASSWORD : genPassword();

    try {
      if (p.user_id) {
        const { error: updErr } = await admin.auth.admin.updateUserById(p.user_id, {
          password,
          email,
          user_metadata: { role: p.role, username }
        });
        if (updErr) throw updErr;
      } else {
        const { data: created, error: crtErr } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { role: p.role, username }
        });
        if (crtErr) throw crtErr;

        const uid = created.user?.id ?? null;
        const { error: linkErr } = await admin
          .from('people')
          .update({ user_id: uid })
          .eq('id', p.id);
        if (linkErr) throw linkErr;

        p.user_id = uid;
      }

      if (CLEAR_PLAINTEXT) {
        await admin.from('people').update({ initial_password_plain_text: null }).eq('id', p.id);
      }

      out.push(`${username},${email},${p.user_id ?? ''},${password},${p.role ?? ''}`);
      ok++;
    } catch (e) {
      fail++;
      out.push(`${username},${email},,ERROR:${(e?.message ?? e).toString().replace(/,/g,';')},${p.role ?? ''}`);
      console.error(`✖ [${i}/${list.length}] ${username}: ${e?.message ?? e}`);
    }

    if (i % 50 === 0) {
      console.log(`… progreso: ${i}/${list.length} (OK=${ok} FAIL=${fail})`);
    }
    await sleep(SLEEP_MS);
  }

  const file = path.resolve(process.cwd(), OUT_CSV);
  fs.writeFileSync(file, out.join('\n'), 'utf8');

  console.log(`\n✅ Terminado. OK=${ok} FAIL=${fail}`);
  console.log(`📄 CSV general: ${file}`);

  if (SPLIT_BY_ROLE) {
    console.log('↳ Generando CSV por rol…');
    const header = out[0];
    const byRole = new Map();
    for (let r = 1; r < out.length; r++) {
      const row = out[r];
      const cols = row.split(',');
      const role = cols[4] || 'unknown';
      if (!byRole.has(role)) byRole.set(role, [header]);
      byRole.get(role).push(row);
    }
    for (const [role, lines] of byRole) {
      const safe = role.replace(/[^a-z0-9._-]/gi, '_').toLowerCase();
      const f = path.resolve(process.cwd(), OUT_CSV.replace(/\.csv$/i, `.${safe}.csv`));
      fs.writeFileSync(f, lines.join('\n'), 'utf8');
      console.log(`   • ${role}: ${f}`);
    }
  }

  process.exit(0);
})().catch((e) => {
  console.error('💥 ERROR:', e?.message ?? e);
  process.exit(1);
});