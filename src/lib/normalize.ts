const map: Record<string, string> = {
  'scz': 'santa cruz',
  'santa cruz de la sierra': 'santa cruz',
  'sta cruz': 'santa cruz',
  'lpz': 'la paz',
  'la paz ciudad': 'la paz',
  'cbb': 'cochabamba',
  'cbba': 'cochabamba',
  'sucre ciudad': 'sucre',
  'elalto': 'el alto',
  'el-alto': 'el alto',
};

export function normalizeName(s: string | null | undefined) {
  if (!s) return '';
  const base = s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
  if (map[base]) return map[base];
  const collapsed = base.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
  if (map[collapsed]) return map[collapsed];
  return collapsed;
}