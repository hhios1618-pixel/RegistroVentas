#!/usr/bin/env bash
set -euo pipefail

# Limitar a TS/TSX en src
FILES=$(git ls-files | grep -E '^src/.*\.(ts|tsx)$' || true)

if [ -z "${FILES}" ]; then
  echo "No se encontraron archivos .ts/.tsx en src/. ¿Ruta correcta?" >&2
  exit 1
fi

echo "▶️  Reemplazando rutas de imports (Supabase)…"
# Rutas → '@/lib/supabase'
# Nota BSD sed (mac): -i '' para in-place sin crear backup
echo "${FILES}" | xargs sed -i '' \
  -e "s|from ['\"]@/lib/supabaseClient['\"]|from '@/lib/supabase'|g" \
  -e "s|from ['\"]@/lib/supabaseServer['\"]|from '@/lib/supabase'|g" \
  -e "s|from ['\"]@/lib/supabaseAdmin['\"]|from '@/lib/supabase'|g"

echo "▶️  Renombrando identificadores importados (Supabase)…"
# Cambia nombre local importado:
# import { supabase } → supabaseClient
# import { getServerSupabase } → createServerSupabase
echo "${FILES}" | xargs sed -i '' \
  -e "s/{[[:space:]]*supabase[[:space:]]*}/\{ supabaseClient \}/g" \
  -e "s/{[[:space:]]*getServerSupabase[[:space:]]*}/\{ createServerSupabase \}/g"

# Si algunos archivos tenían múltiples importados, cubrimos las variantes:
echo "${FILES}" | xargs sed -i '' \
  -e "s/{\([^}]*\)supabase[[:space:]]*,/\{\1supabaseClient, /g" \
  -e "s/,[[:space:]]*supabase[[:space:]]*}/, supabaseClient\}/g" \
  -e "s/{\([^}]*\)getServerSupabase[[:space:]]*,/\{\1createServerSupabase, /g" \
  -e "s/,[[:space:]]*getServerSupabase[[:space:]]*}/, createServerSupabase\}/g"

echo "▶️  Reemplazando imports de Roles…"
# Mover imports desde components → lib
echo "${FILES}" | xargs sed -i '' \
  -e "s|from ['\"]@/components/nav/roles['\"]|from '@/lib/auth/roles'|g"

# Si existen 'normRole', lo renombramos a 'normalizeRole'
echo "${FILES}" | xargs sed -i '' \
  -e "s/{[[:space:]]*normRole[[:space:]]*}/\{ normalizeRole \}/g" \
  -e "s/{\([^}]*\)normRole[[:space:]]*,/\{\1normalizeRole, /g" \
  -e "s/,[[:space:]]*normRole[[:space:]]*}/, normalizeRole\}/g"

echo "▶️  Verificación rápida (no debería mostrar resultados):"
RG_MISSING=0
rg -n "from.*supabaseClient" src --glob '!**/*.d.ts' || true
rg -n "from.*supabaseServer" src --glob '!**/*.d.ts' || true
rg -n "from.*supabaseAdmin" src --glob '!**/*.d.ts' || true
rg -n "from.*components/nav/roles" src --glob '!**/*.d.ts' || true

echo "▶️  Diff resumen (para revisión visual):"
git -c color.ui=always diff -- . ':(exclude)package-lock.json' ':(exclude)pnpm-lock.yaml' | sed -n '1,200p' || true

echo "✅ Fase 4 completada. Corre TypeScript para validar tipos: npm run build"
