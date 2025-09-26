'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Search, Filter, Clock, Users, 
  ChevronDown, ChevronUp, Download,
  Building, User, Timer, AlertCircle, CheckCircle,
  BarChart3, Target, Coffee, LogOut, LogIn,
  Expand, Minimize, FileText, Eye, EyeOff
} from 'lucide-react';
import { normalizeRole, type Role } from '@/lib/auth/roles';

/* ============================================================================
   TIPOS
   ============================================================================ */
type Row = {
  person_id: string;
  person_name: string;
  date: string;                // YYYY-MM-DD (día local)
  first_in: string | null;
  last_out: string | null;
  worked_minutes: number | null;
  expected_minutes: number | null;
  late_minutes: number | null;
  early_leave_minutes: number | null;
  lunch_in?: string | null;
  lunch_out?: string | null;
  lunch_minutes?: number | null;
  present: boolean;
  compliance_pct: number | null;
  site_name?: string | null;
  row_type?: string | null;
};

type Site = { id: string; name: string };
type AttendanceMark = {
  id: string;
  created_at: string;
  type?: string | null;
  lat?: number | null;
  lng?: number | null;
  accuracy_m?: number | null;
  device_id?: string | null;
  selfie_path?: string | null;
  person?: { id: string; full_name?: string | null; role?: string | null; local?: string | null } | null;
  site?: { id: string; name?: string | null } | null;
};

type PersonLite = { id: string; full_name?: string | null; role?: string | null; fenix_role?: string | null; local?: string | null };

/* ============================================================================
   CONFIG / HELPERS
   ============================================================================ */
   const ALLOWED_ROLES = new Set<Role>(['asesor']);

const resolveRole = (raw?: string | null): Role => {
  const normalized = normalizeRole(raw);
  if (normalized !== 'unknown') return normalized;

  const upper = String(raw ?? '').trim().toUpperCase();
  if (upper.includes('ASESOR')) return 'asesor';
  if (upper.includes('VENDEDOR')) return 'asesor';
  if (upper.includes('PROMOTOR')) return 'promotor';
  if (upper.includes('COORDIN')) return 'coordinador';
  if (upper.includes('LOGIST')) return 'logistica';
  if (upper.includes('LIDER') || upper.includes('SUPERVISOR')) return 'lider';
  if (upper.includes('GEREN') || upper.includes('ADMIN')) return 'admin';
  return 'unknown';
};

const isFiniteNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const mmToHhMm = (m: number) => {
  const total = Math.max(0, Math.round(m));
  const h = Math.floor(total / 60);
  const mm = total % 60;
  return `${h}h ${mm}m`;
};
const mmOrDash = (value: unknown) => {
  if (!isFiniteNum(value)) return '—';
  return value <= 0 ? '—' : mmToHhMm(value);
};

const fmtTime = (s: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('es-BO', { timeStyle: 'short', hour12: true }).format(d);
};

const fmtDT = (s: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'short',
    timeStyle: 'short',
    hour12: true,
  }).format(d);
};

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

const normalizeSiteName = (raw?: string | null) => {
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (!trimmed || trimmed === '-') return null;
  const condensed = trimmed.replace(/\s+/g, ' ');
  const upper = condensed.toUpperCase();
  if (upper === 'N/A' || upper === 'NA' || upper === 'NINGUNO') return 'Sin sucursal';
  if (upper.includes('SIN SUCURSAL')) return 'Sin sucursal';
  return condensed;
};

/* ============================================================================
   COMPONENTES UI
   ============================================================================ */
const KpiCard = ({ 
  title, 
  value, 
  icon,
  color = 'blue',
  trend,
  subtitle
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  trend?: number;
  subtitle?: string;
}) => {
  const colorClasses = {
    blue: 'from-apple-blue-500/20 to-apple-blue-600/10 border-apple-blue-500/30 text-apple-blue-400',
    green: 'from-apple-green-500/20 to-apple-green-600/10 border-apple-green-500/30 text-apple-green-400',
    orange: 'from-apple-orange-500/20 to-apple-orange-600/10 border-apple-orange-500/30 text-apple-orange-400',
    red: 'from-apple-red-500/20 to-apple-red-600/10 border-apple-red-500/30 text-apple-red-400',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="glass-card hover:shadow-apple-lg transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 bg-gradient-to-br ${colorClasses[color]} rounded-apple border`}>
          <div className="text-lg">{icon}</div>
        </div>
        {typeof trend === 'number' && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-apple-caption2 font-semibold ${
            trend >= 0 
              ? 'bg-apple-green-500/20 text-apple-green-300 border border-apple-green-500/30' 
              : 'bg-apple-red-500/20 text-apple-red-300 border border-apple-red-500/30'
          }`}>
            {trend >= 0 ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            <span>{Math.abs(trend).toFixed(1)}%</span>
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <p className="apple-caption text-apple-gray-400">{title}</p>
        <p className="apple-h3 text-white font-semibold">{value}</p>
        {subtitle && <p className="apple-caption2 text-apple-gray-500">{subtitle}</p>}
      </div>
    </motion.div>
  );
};

const LoadingSpinner = () => (
  <div className="glass-card text-center py-12">
    <div className="w-12 h-12 border-2 border-apple-blue-500/30 border-t-apple-blue-400 rounded-full animate-spin mx-auto mb-4"></div>
    <p className="apple-body text-apple-gray-300">Cargando datos de asistencia...</p>
  </div>
);

const EmptyState = ({ message = "Sin resultados" }: { message?: string }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="glass-card text-center py-12"
  >
    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-apple-gray-500/20 to-apple-gray-600/10 border border-apple-gray-500/30 rounded-apple-lg flex items-center justify-center">
      <Users size={24} className="text-apple-gray-400" />
    </div>
    <h4 className="apple-h3 text-white mb-2">Sin datos disponibles</h4>
    <p className="apple-body text-apple-gray-400">{message}</p>
  </motion.div>
);

const ErrorState = ({ error }: { error: string }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="glass-card border-apple-red-500/30 bg-apple-red-500/10 text-center py-12"
  >
    <div className="w-16 h-16 mx-auto mb-4 bg-apple-red-500/20 border border-apple-red-500/30 rounded-apple-lg flex items-center justify-center">
      <AlertCircle size={24} className="text-apple-red-400" />
    </div>
    <h4 className="apple-h3 text-apple-red-300 mb-2">Error al cargar datos</h4>
    <p className="apple-body text-apple-red-400">{error}</p>
  </motion.div>
);

/* ============================================================================
   PÁGINA PRINCIPAL
   ============================================================================ */
export default function AsistenciaResumenPage() {
  // Rango por defecto: mes actual
  const todayDate = new Date();
  const todayStr = todayDate.toISOString().slice(0, 10);
  const firstDayOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
  
  const [start, setStart] = useState(firstDayOfMonth.toISOString().slice(0, 10));
  const [end, setEnd] = useState(todayStr);
  const [siteIdFilter, setSiteIdFilter] = useState<string>('');
  const [q, setQ] = useState('');

  const [sites, setSites] = useState<Site[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [todayRows, setTodayRows] = useState<Row[]>([]);
  const [marks, setMarks] = useState<AttendanceMark[]>([]);
  const [people, setPeople] = useState<PersonLite[]>([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Estado de acordeones
  const [openSites, setOpenSites] = useState<Record<string, boolean>>({});
  const [openPersons, setOpenPersons] = useState<Record<string, boolean>>({}); 
  const [showTodaySummary, setShowTodaySummary] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/endpoints/sites', { cache: 'no-store' });
        const j = await r.json();
        if (r.ok) setSites(j.data || []);
      } catch {}
    })();
  }, []);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      // 1) SUMMARY para el rango seleccionado
      const p1 = new URLSearchParams();
      p1.set('start', start);
      p1.set('end', end);
      if (siteIdFilter) p1.set('site_id', siteIdFilter);
      if (q) p1.set('q', q);
      const r1 = await fetch(`/endpoints/attendance/summary?${p1.toString()}`, { cache: 'no-store' });
      const j1 = await r1.json();
      if (!r1.ok) throw new Error(j1?.error || 'summary_fetch_failed');
      const summaryRows = Array.isArray(j1.data) ? (j1.data as Row[]) : [];
      const dayRows = summaryRows.filter((row) => (row?.row_type ?? 'day') === 'day');
      setRows(dayRows.length ? dayRows : summaryRows);

      // 2) ATTENDANCE crudo para mapear persona → sucursal/rol
      const p2 = new URLSearchParams();
      p2.set('start', start);
      p2.set('end', end);
      if (siteIdFilter) p2.set('site_id', siteIdFilter);
      const r2 = await fetch(`/endpoints/attendance?${p2.toString()}`, { cache: 'no-store' });
      const j2 = await r2.json();
      if (!r2.ok) throw new Error(j2?.error || 'attendance_fetch_failed');
      setMarks(Array.isArray(j2.data) ? j2.data : []);

      // 3) SUMMARY solo para HOY
      const p3 = new URLSearchParams();
      p3.set('start', todayStr);
      p3.set('end', todayStr);
      const r3 = await fetch(`/endpoints/attendance/summary?${p3.toString()}`, { cache: 'no-store' });
      const j3 = await r3.json();
      if (!r3.ok) throw new Error(j3?.error || 'today_summary_fetch_failed');
      const todayData = Array.isArray(j3.data) ? (j3.data as Row[]) : [];
      const todayDayRows = todayData.filter((row) => (row?.row_type ?? 'day') === 'day');
      setTodayRows(todayDayRows.length ? todayDayRows : todayData);

      // 4) Personas (catálogo)
      let ppl: PersonLite[] = [];
      try {
        const rP = await fetch('/endpoints/people', { cache: 'no-store' });
        if (rP.ok) {
          const jP = await rP.json();
          ppl = Array.isArray(jP?.data) ? jP.data : [];
        }
      } catch {}
      if (ppl.length === 0) {
        try {
          const rP2 = await fetch('/endpoints/persons', { cache: 'no-store' });
          if (rP2.ok) {
            const jP2 = await rP2.json();
            ppl = Array.isArray(jP2?.data) ? jP2.data : [];
          }
        } catch {}
      }
      setPeople(ppl);

    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end, siteIdFilter]);

  // Mapa persona → sucursal
  const personToSiteName = useMemo(() => {
    const map = new Map<string, string>();

    const assign = (pid?: string | null, raw?: string | null | undefined) => {
      if (!pid || map.has(pid)) return;
      const name = normalizeSiteName(raw);
      if (!name) return;
      map.set(pid, name);
    };

    for (const m of marks) assign(m.person?.id ?? null, m.site?.name ?? null);
    for (const r of rows) {
      if ((r.row_type ?? 'day') !== 'day') continue;
      assign(r.person_id, r.site_name ?? null);
    }
    for (const r of todayRows) assign(r.person_id, r.site_name ?? null);
    for (const p of people) assign(p.id, p.local ?? null);

    return map;
  }, [marks, rows, todayRows, people]);

  // Mapa persona → rol
  const personToRole = useMemo(() => {
    const map = new Map<string, Role>();

    const assign = (pid?: string | null, raw?: string | null) => {
      if (!pid || map.has(pid)) return;
      const resolved = resolveRole(raw);
      if (resolved === 'unknown') return;
      map.set(pid, resolved);
    };

    for (const m of marks) {
      assign(m.person?.id, m.person?.role ?? null);
    }
    for (const p of people) {
      assign(p.id, p.fenix_role ?? p.role ?? null);
    }

    return map;
  }, [marks, people]);

  const uniqueTodayRows = useMemo(() => {
    const uniqueMap = new Map<string, Row>();
    for (const row of todayRows) {
      const role = personToRole.get(row.person_id);
      if (role && !ALLOWED_ROLES.has(role)) continue;
      if (!uniqueMap.has(row.person_id)) uniqueMap.set(row.person_id, row);
    }
    return Array.from(uniqueMap.values())
      .sort((a, b) => (a.person_name || '').localeCompare(b.person_name || ''));
  }, [todayRows, personToRole]);

  // Agrupar rows por sucursal → persona → días
  const grouped = useMemo(() => {
    const filterQ = (r: Row) => {
      if (!q) return true;
      return (r.person_name || '').toLowerCase().includes(q.toLowerCase());
    };

    const bySite = new Map<
      string,
      {
        people: Map<
          string,
          {
            person_name: string;
            days: Row[];
            exp: number;
            wrk: number;
            late: number;
            early: number;
            lunch: number;
            comp: number;
          }
        >;
        exp: number;
        wrk: number;
        late: number;
        early: number;
        lunch: number;
        comp: number;
      }
    >();

    for (const r of rows) {
      if ((r.row_type ?? 'day') !== 'day') continue;
      if (!filterQ(r)) continue;

      const role = personToRole.get(r.person_id);
      if (role && !ALLOWED_ROLES.has(role)) continue;

      const siteName = personToSiteName.get(r.person_id) || normalizeSiteName(r.site_name) || 'Sin sucursal';
      if (!bySite.has(siteName)) {
        bySite.set(siteName, {
          people: new Map(),
          exp: 0, wrk: 0, late: 0, early: 0, lunch: 0, comp: 0,
        });
      }
      const siteBucket = bySite.get(siteName)!;

      if (!siteBucket.people.has(r.person_id)) {
        siteBucket.people.set(r.person_id, {
          person_name: r.person_name,
          days: [],
          exp: 0, wrk: 0, late: 0, early: 0, lunch: 0, comp: 0,
        });
      }
      const personBucket = siteBucket.people.get(r.person_id)!;
      personBucket.days.push(r);
    }

    for (const [, siteBucket] of bySite) {
      for (const [, p] of siteBucket.people) {
        const exp = sum(p.days.map((d) => (isFiniteNum(d.expected_minutes) ? (d.expected_minutes as number) : 0)));
        const wrk = sum(p.days.map((d) => (isFiniteNum(d.worked_minutes) ? (d.worked_minutes as number) : 0)));
        const late = sum(p.days.map((d) => (isFiniteNum(d.late_minutes) ? (d.late_minutes as number) : 0)));
        const early = sum(p.days.map((d) => (isFiniteNum(d.early_leave_minutes) ? (d.early_leave_minutes as number) : 0)));
        const lunch = sum(p.days.map((d) => (isFiniteNum(d.lunch_minutes) ? (d.lunch_minutes as number) : 0)));
        const comp = exp ? Math.round((wrk / exp) * 100) : 0;

        p.exp = exp; p.wrk = wrk; p.late = late; p.early = early; p.lunch = lunch; p.comp = comp;

        siteBucket.exp += exp;
        siteBucket.wrk += wrk;
        siteBucket.late += late;
        siteBucket.early += early;
        siteBucket.lunch += lunch;
      }
      siteBucket.comp = siteBucket.exp ? Math.round((siteBucket.wrk / siteBucket.exp) * 100) : 0;
    }

    const ordered: {
      siteName: string;
      siteTotals: { exp: number; wrk: number; late: number; early: number; lunch: number; comp: number };
      people: { person_id: string; person_name: string; totals: { exp: number; wrk: number; late: number; early: number; lunch: number; comp: number }; days: Row[] }[];
    }[] = [];

    for (const [siteName, siteBucket] of bySite) {
      const peopleArr = Array.from(siteBucket.people.entries())
        .map(([pid, p]) => ({
          person_id: pid,
          person_name: p.person_name,
          totals: { exp: p.exp, wrk: p.wrk, late: p.late, early: p.early, lunch: p.lunch, comp: p.comp },
          days: p.days.sort((a, b) => (a.date || '').localeCompare(b.date || '')),
        }))
        .sort((a, b) => (a.person_name || '').localeCompare(b.person_name || ''));

      ordered.push({
        siteName,
        siteTotals: { exp: siteBucket.exp, wrk: siteBucket.wrk, late: siteBucket.late, early: siteBucket.early, lunch: siteBucket.lunch, comp: siteBucket.comp },
        people: peopleArr,
      });
    }

    ordered.sort((a, b) => {
      if (a.siteName === 'Sin sucursal') return 1;
      if (b.siteName === 'Sin sucursal') return -1;
      return a.siteName.localeCompare(b.siteName);
    });

    return ordered;
  }, [rows, personToSiteName, personToRole, q]);

  // KPIs generales
  const globalKpis = useMemo(() => {
    const exp = sum(grouped.map((g) => g.siteTotals.exp));
    const wrk = sum(grouped.map((g) => g.siteTotals.wrk));
    const late = sum(grouped.map((g) => g.siteTotals.late));
    const early = sum(grouped.map((g) => g.siteTotals.early));
    const lunch = sum(grouped.map((g) => g.siteTotals.lunch));
    const comp = exp ? Math.round((wrk / exp) * 100) : 0;
    return { exp, wrk, late, early, lunch, comp };
  }, [grouped]);

  // Funciones de control
  const expandAllSites = () => {
    const next: Record<string, boolean> = {};
    for (const g of grouped) next[g.siteName] = true;
    setOpenSites(next);
  };
  const collapseAllSites = () => setOpenSites({});
  const toggleSite = (name: string) => setOpenSites((s) => ({ ...s, [name]: !s[name] }));

  const togglePerson = (siteName: string, pid: string) => {
    const key = `${siteName}::${pid}`;
    setOpenPersons((s) => ({ ...s, [key]: !s[key] }));
  };

  // Export CSV functions
  const exportCSVForSite = (siteName: string) => {
    const site = grouped.find((g) => g.siteName === siteName);
    if (!site) return;

    const head = [
      'Sucursal',
      'Persona',
      'Fecha',
      'Primer In',
      'Lunch In',
      'Lunch Out',
      'Último Out',
      'Colación (min)',
      'Trabajado (min)',
      'Esperado (min)',
      '% Cumplimiento',
      'Atraso (min)',
      'Salida Ant. (min)',
      'Presente',
    ].join(',');

    const body: string[] = [];
    for (const p of site.people) {
      for (const r of p.days) {
        body.push([
          `"${siteName.replaceAll('"', '""')}"`,
          `"${(p.person_name || '').replaceAll('"', '""')}"`,
          r.date || '',
          fmtDT(r.first_in) === '—' ? '' : fmtDT(r.first_in),
          fmtDT(r.lunch_in ?? null) === '—' ? '' : fmtDT(r.lunch_in ?? null),
          fmtDT(r.lunch_out ?? null) === '—' ? '' : fmtDT(r.lunch_out ?? null),
          fmtDT(r.last_out) === '—' ? '' : fmtDT(r.last_out),
          isFiniteNum(r.lunch_minutes) ? r.lunch_minutes : '',
          isFiniteNum(r.worked_minutes) ? r.worked_minutes : '',
          isFiniteNum(r.expected_minutes) ? r.expected_minutes : '',
          isFiniteNum(r.compliance_pct) ? r.compliance_pct : '',
          isFiniteNum(r.late_minutes) ? r.late_minutes : '',
          isFiniteNum(r.early_leave_minutes) ? r.early_leave_minutes : '',
          r.present ? '1' : '0',
        ].join(','));
      }
    }

    const csv = [head, ...body].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asistencia_${siteName}_${start}_a_${end}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportCSVForPerson = (siteName: string, personName: string, days: Row[]) => {
    const head = [
      'Sucursal',
      'Persona',
      'Fecha',
      'Primer In',
      'Lunch In',
      'Lunch Out',
      'Último Out',
      'Colación (min)',
      'Trabajado (min)',
      'Esperado (min)',
      '% Cumplimiento',
      'Atraso (min)',
      'Salida Ant.',
      'Presente',
    ].join(',');

    const body = days.map((r) =>
      [
        `"${siteName.replaceAll('"', '""')}"`,
        `"${(personName || '').replaceAll('"', '""')}"`,
        r.date || '',
        fmtDT(r.first_in) === '—' ? '' : fmtDT(r.first_in),
        fmtDT(r.lunch_in ?? null) === '—' ? '' : fmtDT(r.lunch_in ?? null),
        fmtDT(r.lunch_out ?? null) === '—' ? '' : fmtDT(r.lunch_out ?? null),
        fmtDT(r.last_out) === '—' ? '' : fmtDT(r.last_out),
        isFiniteNum(r.lunch_minutes) ? r.lunch_minutes : '',
        isFiniteNum(r.worked_minutes) ? r.worked_minutes : '',
        isFiniteNum(r.expected_minutes) ? r.expected_minutes : '',
        isFiniteNum(r.compliance_pct) ? r.compliance_pct : '',
        isFiniteNum(r.late_minutes) ? r.late_minutes : '',
        isFiniteNum(r.early_leave_minutes) ? r.early_leave_minutes : '',
        r.present ? '1' : '0',
      ].join(',')
    );

    const csv = [head, ...body].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safePersonName = (personName || 'persona').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `asistencia_${safePersonName}_${start}_a_${end}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Resumen HOY
  const TodaySummary = () => {
    if (loading || uniqueTodayRows.length === 0 || !showTodaySummary) return null;

    return (
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card mb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-apple-green-500/20 border border-apple-green-500/30 rounded-apple">
              <Clock size={18} className="text-apple-green-400" />
            </div>
            <div>
              <h2 className="apple-h3 text-white">Resumen del Día</h2>
              <p className="apple-caption text-apple-gray-400">Vista rápida del desempeño de hoy</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowTodaySummary(false)}
            className="btn-ghost p-2"
          >
            <EyeOff size={16} />
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="table-apple">
            <thead>
              <tr>
                <th>Persona</th>
                <th>Sucursal</th>
                <th>Primer Ingreso</th>
                <th>Última Salida</th>
                <th>Horas Trabajadas</th>
                <th>Atraso</th>
                <th>% Cumplimiento</th>
              </tr>
            </thead>
            <tbody>
              {uniqueTodayRows.map((r, i) => (
                <motion.tr
                  key={`today-${r.person_id}-${i}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="hover:bg-white/5 transition-colors"
                >
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-apple-blue-500/20 border border-apple-blue-500/30 rounded-apple flex items-center justify-center">
                        <User size={14} className="text-apple-blue-400" />
                      </div>
                      <span className="apple-body text-white font-medium">
                        {r.person_name || 'Sin Nombre'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="badge badge-secondary">
                      {personToSiteName.get(r.person_id) || normalizeSiteName(r.site_name) || 'Sin sucursal'}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <LogIn size={14} className="text-apple-green-400" />
                      <span className="apple-body text-white">{fmtTime(r.first_in)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <LogOut size={14} className="text-apple-red-400" />
                      <span className="apple-body text-white">{fmtTime(r.last_out)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Timer size={14} className="text-apple-blue-400" />
                      <span className="apple-body text-white font-medium">{mmOrDash(r.worked_minutes)}</span>
                    </div>
                  </td>
                  <td>
                    <div className={`flex items-center gap-2 ${
                      isFiniteNum(r.late_minutes) && r.late_minutes > 0 ? 'text-apple-red-400' : 'text-apple-gray-400'
                    }`}>
                      <AlertCircle size={14} />
                      <span className="apple-body font-medium">{mmOrDash(r.late_minutes)}</span>
                    </div>
                  </td>
                  <td>
                    <div className={`flex items-center gap-2 font-semibold ${
                      isFiniteNum(r.compliance_pct) && (r.compliance_pct as number) >= 100
                        ? 'text-apple-green-400'
                        : (r.compliance_pct || 0) >= 80
                          ? 'text-apple-orange-400'
                          : 'text-apple-red-400'
                    }`}>
                      <Target size={14} />
                      <span className="apple-body">
                        {isFiniteNum(r.compliance_pct) ? r.compliance_pct : 0}%
                      </span>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.section>
    );
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card mb-8"
      >
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-apple-blue-500/20 to-apple-green-500/20 border border-apple-blue-500/30 rounded-apple-lg">
            <BarChart3 size={28} className="text-apple-blue-400" />
          </div>
          <div>
            <h1 className="apple-h1 mb-2">Resumen de Asistencia</h1>
            <p className="apple-body text-apple-gray-300">
              L–S 08:30–18:30 (10h) — TZ America/La_Paz — Sin domingos
            </p>
          </div>
        </div>
      </motion.header>

      {/* Panel de filtros */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card mb-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-apple-blue-500/20 border border-apple-blue-500/30 rounded-apple">
            <Filter size={18} className="text-apple-blue-400" />
          </div>
          <h2 className="apple-h3 text-white">Filtros y Configuración</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          {/* Fecha desde */}
          <div className="space-y-2">
            <label className="block apple-caption text-apple-gray-300">Desde</label>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.currentTarget.value)}
              className="field"
            />
          </div>
          
          {/* Fecha hasta */}
          <div className="space-y-2">
            <label className="block apple-caption text-apple-gray-300">Hasta</label>
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.currentTarget.value)}
              className="field"
            />
          </div>

          {/* Sucursal */}
          <div className="space-y-2">
            <label className="block apple-caption text-apple-gray-300">Sucursal</label>
            <select
              value={siteIdFilter}
              onChange={(e) => setSiteIdFilter(e.currentTarget.value)}
              className="field"
            >
              <option value="">Todas las sucursales</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Búsqueda */}
          <div className="space-y-2">
            <label className="block apple-caption text-apple-gray-300">Persona</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-gray-500" />
              <input
                placeholder="Buscar nombre…"
                value={q}
                onChange={(e) => setQ(e.currentTarget.value)}
                onKeyDown={(e) => e.key === 'Enter' && load()}
                className="field pl-10"
              />
            </div>
          </div>

          {/* Botón aplicar */}
          <div className="flex items-end">
            <button
              onClick={load}
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Cargando...
                </>
              ) : (
                <>
                  <Search size={16} />
                  Aplicar
                </>
              )}
            </button>
          </div>

          {/* Controles de expansión */}
          <div className="flex items-end gap-2">
            <button
              onClick={expandAllSites}
              className="btn-secondary flex-1"
            >
              <Expand size={14} />
              Expandir
            </button>
            <button
              onClick={collapseAllSites}
              className="btn-secondary flex-1"
            >
              <Minimize size={14} />
              Contraer
            </button>
          </div>
        </div>

        {!showTodaySummary && (
          <div className="flex justify-center">
            <button
              onClick={() => setShowTodaySummary(true)}
              className="btn-ghost"
            >
              <Eye size={16} />
              Mostrar Resumen del Día
            </button>
          </div>
        )}
      </motion.section>

      {/* KPIs globales */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard
            title="Horas Esperadas"
            value={mmOrDash(globalKpis.exp)}
            icon={<Clock size={20} />}
            color="blue"
            subtitle="Total planificado"
          />
          <KpiCard
            title="Horas Trabajadas"
            value={mmOrDash(globalKpis.wrk)}
            icon={<Timer size={20} />}
            color="green"
            subtitle="Total efectivo"
          />
          <KpiCard
            title="% Cumplimiento"
            value={`${isFiniteNum(globalKpis.comp) ? globalKpis.comp : 0}%`}
            icon={<Target size={20} />}
            color={globalKpis.comp >= 100 ? 'green' : globalKpis.comp >= 80 ? 'orange' : 'red'}
            subtitle="Eficiencia global"
          />
          <KpiCard
            title="Atrasos Totales"
            value={mmOrDash(globalKpis.late)}
            icon={<AlertCircle size={20} />}
            color="red"
            subtitle="Tiempo perdido"
          />
          <KpiCard
            title="Salidas Anticipadas"
            value={mmOrDash(globalKpis.early)}
            icon={<LogOut size={20} />}
            color="orange"
            subtitle="Tiempo no trabajado"
          />
          <KpiCard
            title="Tiempo en Colación"
            value={mmOrDash(globalKpis.lunch)}
            icon={<Coffee size={20} />}
            color="purple"
            subtitle="Descansos"
          />
        </div>
      </motion.section>

      {/* Resumen del día */}
      <TodaySummary />

      {/* Contenido principal */}
      {loading ? (
        <LoadingSpinner />
      ) : err ? (
        <ErrorState error={err} />
      ) : grouped.length === 0 ? (
        <EmptyState message="No hay datos de asistencia para el período seleccionado" />
      ) : (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-6"
        >
          {grouped.map((g, index) => {
            const open = !!openSites[g.siteName];
            return (
              <motion.div
                key={g.siteName}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="glass-card overflow-hidden"
              >
                {/* Header de sucursal */}
                <div
                  onClick={() => toggleSite(g.siteName)}
                  className="p-6 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/10"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-apple-purple-500/20 to-apple-pink-500/20 border border-apple-purple-500/30 rounded-apple-lg flex items-center justify-center">
                        <Building size={20} className="text-apple-purple-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="apple-h3 text-white">{g.siteName}</h3>
                          <div className="badge badge-primary">{g.people.length} personas</div>
                        </div>
                        <div className="flex flex-wrap gap-4 apple-caption text-apple-gray-400">
                          <span>Esperadas: <strong className="text-white">{mmOrDash(g.siteTotals.exp)}</strong></span>
                          <span>Trabajadas: <strong className="text-white">{mmOrDash(g.siteTotals.wrk)}</strong></span>
                          <span>Cumpl.: <strong style={{ color: g.siteTotals.comp >= 100 ? '#10b981' : g.siteTotals.comp >= 80 ? '#eab308' : '#f87171' }}>{g.siteTotals.comp}%</strong></span>
                          <span>Atraso: <strong className="text-white">{mmOrDash(g.siteTotals.late)}</strong></span>
                          <span>Salida ant.: <strong className="text-white">{mmOrDash(g.siteTotals.early)}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); exportCSVForSite(g.siteName); }}
                        className="btn-secondary"
                      >
                        <Download size={16} />
                        Exportar CSV
                      </button>
                      <div className="w-10 h-10 bg-white/10 border border-white/20 rounded-apple flex items-center justify-center">
                        {open ? <ChevronUp size={20} className="text-white" /> : <ChevronDown size={20} className="text-white" />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lista de personas */}
                <AnimatePresence>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 pt-0 space-y-4">
                        {g.people.map((p, personIndex) => {
                          const key = `${g.siteName}::${p.person_id}`;
                          const openP = !!openPersons[key];
                          const compColor = p.totals.comp >= 100 ? '#10b981' : p.totals.comp >= 80 ? '#eab308' : '#f87171';

                          return (
                            <motion.div
                              key={key}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: personIndex * 0.05 }}
                              className="glass-card border border-white/10 overflow-hidden"
                            >
                              {/* Header de persona */}
                              <div
                                onClick={() => togglePerson(g.siteName, p.person_id)}
                                className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
                              >
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-apple-blue-500/20 border border-apple-blue-500/30 rounded-apple flex items-center justify-center">
                                      <User size={16} className="text-apple-blue-400" />
                                    </div>
                                    <div>
                                      <div className="apple-body font-semibold text-white mb-1">
                                        {p.person_name || 'Sin Nombre'}
                                      </div>
                                      <div className="flex flex-wrap gap-3 apple-caption text-apple-gray-400">
                                        <span>Esperadas: <strong className="text-white">{mmOrDash(p.totals.exp)}</strong></span>
                                        <span>Trabajadas: <strong className="text-white">{mmOrDash(p.totals.wrk)}</strong></span>
                                        <span>Cumpl.: <strong style={{ color: compColor }}>{p.totals.comp}%</strong></span>
                                        <span>Atraso: <strong className="text-white">{mmOrDash(p.totals.late)}</strong></span>
                                        <span>Salida ant.: <strong className="text-white">{mmOrDash(p.totals.early)}</strong></span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); exportCSVForPerson(g.siteName, p.person_name, p.days); }}
                                      className="btn-ghost p-2"
                                    >
                                      <FileText size={14} />
                                    </button>
                                    <div className="w-8 h-8 bg-white/10 border border-white/20 rounded-apple flex items-center justify-center">
                                      {openP ? <ChevronUp size={16} className="text-white" /> : <ChevronDown size={16} className="text-white" />}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Días de la persona */}
                              <AnimatePresence>
                                {openP && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="overflow-hidden border-t border-white/10"
                                  >
                                    <div className="p-4 bg-black/20">
                                      <div className="overflow-x-auto">
                                        <table className="table-apple">
                                          <thead>
                                            <tr>
                                              <th>Fecha</th>
                                              <th>Primer In</th>
                                              <th>Lunch In</th>
                                              <th>Lunch Out</th>
                                              <th>Último Out</th>
                                              <th>Colación</th>
                                              <th>Trabajado</th>
                                              <th>Esperado</th>
                                              <th>%</th>
                                              <th>Atraso</th>
                                              <th>Salida Ant.</th>
                                              <th>Presente</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {p.days.map((r, dayIndex) => (
                                              <motion.tr
                                                key={`${r.person_id}-${r.date}`}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: dayIndex * 0.02 }}
                                                className="hover:bg-white/5 transition-colors"
                                              >
                                                <td>
                                                  <div className="flex items-center gap-2">
                                                    <Calendar size={14} className="text-apple-gray-400" />
                                                    <span className="apple-caption text-white">
                                                      {new Date(r.date).toLocaleDateString('es-BO', { 
                                                        weekday: 'short', 
                                                        day: '2-digit', 
                                                        month: '2-digit' 
                                                      })}
                                                    </span>
                                                  </div>
                                                </td>
                                                <td className="apple-caption text-white">{fmtTime(r.first_in)}</td>
                                                <td className="apple-caption text-apple-gray-300">{fmtTime(r.lunch_in ?? null)}</td>
                                                <td className="apple-caption text-apple-gray-300">{fmtTime(r.lunch_out ?? null)}</td>
                                                <td className="apple-caption text-white">{fmtTime(r.last_out)}</td>
                                                <td className="apple-caption text-apple-gray-300">{mmOrDash(r.lunch_minutes)}</td>
                                                <td className="apple-caption text-white font-medium">{mmOrDash(r.worked_minutes)}</td>
                                                <td className="apple-caption text-apple-gray-300">{mmOrDash(r.expected_minutes)}</td>
                                                <td>
                                                  <span
                                                    className="apple-caption font-semibold"
                                                    style={{
                                                      color: isFiniteNum(r.compliance_pct) && (r.compliance_pct as number) >= 100
                                                        ? '#10b981'
                                                        : (r.compliance_pct || 0) >= 80
                                                          ? '#eab308'
                                                          : '#f87171'
                                                    }}
                                                  >
                                                    {isFiniteNum(r.compliance_pct) ? r.compliance_pct : 0}%
                                                  </span>
                                                </td>
                                                <td>
                                                  <span className={`apple-caption ${
                                                    isFiniteNum(r.late_minutes) && r.late_minutes > 0 
                                                      ? 'text-apple-red-400 font-medium' 
                                                      : 'text-apple-gray-400'
                                                  }`}>
                                                    {mmOrDash(r.late_minutes)}
                                                  </span>
                                                </td>
                                                <td>
                                                  <span className={`apple-caption ${
                                                    isFiniteNum(r.early_leave_minutes) && r.early_leave_minutes > 0 
                                                      ? 'text-apple-orange-400 font-medium' 
                                                      : 'text-apple-gray-400'
                                                  }`}>
                                                    {mmOrDash(r.early_leave_minutes)}
                                                  </span>
                                                </td>
                                                <td>
                                                  <div className="flex items-center justify-center">
                                                    {r.present ? (
                                                      <CheckCircle size={16} className="text-apple-green-400" />
                                                    ) : (
                                                      <AlertCircle size={16} className="text-apple-red-400" />
                                                    )}
                                                  </div>
                                                </td>
                                              </motion.tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.section>
      )}
    </div>
  );
}
