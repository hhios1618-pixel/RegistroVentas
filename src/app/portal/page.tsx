'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function PortalLauncher() {
  const [greet, setGreet] = useState('Hola');

  useEffect(() => {
    const h = new Date().getHours();
    setGreet(h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches');

    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, string> = {
        '1': '/logistica',
        '2': '/',
        '3': '/delivery',
        '4': '/dashboard/ventas',
        '5': '/dashboard/vendedores',
      };
      if (map[e.key]) window.location.href = map[e.key];
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <main style={styles.main}>
      <div style={styles.background}>
        <div style={{ ...styles.blurOrb, top: '-10%', left: '-10%', background: 'radial-gradient(closest-side, rgba(58,167,255,0.35), transparent 70%)' }} />
        <div style={{ ...styles.blurOrb, bottom: '-15%', right: '-5%', background: 'radial-gradient(closest-side, rgba(16,185,129,0.25), transparent 70%)' }} />
        <div style={styles.radial} />
      </div>

      <section style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>
            Portal de Operaciones<span style={styles.brandDot}>.</span>
          </h1>
          <p style={styles.subtitle}>
            {greet}. Selecciona un módulo para comenzar a gestionar.
          </p>
        </header>

        <div style={styles.grid}>
          <NavCard
            title="Logística y Despacho"
            desc="Asigna pedidos, monitorea rutas y confirma entregas."
            href="/logistica"
            kbd="1"
            icon={<TruckIcon />}
            accent="linear-gradient(135deg,#4f46e5, #22d3ee)"
          />
          <NavCard
            title="Registro de Venta"
            desc="Ingresa ventas y genera pedidos desde cualquier lugar."
            href="/"
            kbd="2"
            icon={<ClipboardIcon />}
            accent="linear-gradient(135deg,#0ea5e9, #60a5fa)"
          />
          <NavCard
            title="App de Delivery"
            desc="Visualiza rutas asignadas y reporta el estado de las entregas."
            href="/delivery"
            kbd="3"
            icon={<RouteIcon />}
            accent="linear-gradient(135deg,#22c55e, #a3e635)"
          />
          <NavCard
            title="Dashboard General"
            desc="KPIs globales en tiempo real: productos, sucursales, ingresos."
            href="/dashboard/ventas"
            kbd="4"
            icon={<ChartIcon />}
            accent="linear-gradient(135deg,#f59e0b, #f97316)"
          />
          <NavCard
            title="Reporte de Vendedores"
            desc="Analiza ventas, gastos de Meta y ROAS por cada asesor."
            href="/dashboard/vendedores"
            kbd="5"
            icon={<UsersIcon />}
            accent="linear-gradient(135deg, #d946ef, #ec4899)"
          />
        </div>

        <FooterHint />
      </section>
    </main>
  );
}

/* ----------------- Subcomponentes ----------------- */

function NavCard({
  title,
  desc,
  href,
  kbd,
  icon,
  accent,
}: {
  title: string;
  desc: string;
  href: string;
  kbd: string;
  icon: React.ReactNode;
  accent: string;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link 
      href={href} 
      style={{...styles.card, ...(isHovered ? styles.cardHover : {})}}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{ ...styles.cardAccent, background: accent, opacity: isHovered ? 0.3 : 0.15 }} />
      <div style={styles.cardInner}>
        <div style={styles.iconWrap}>{icon}</div>
        <div style={styles.cardContent}>
          <h3 style={styles.cardTitle}>{title}</h3>
          <p style={styles.cardDesc}>{desc}</p>
        </div>
        <kbd style={styles.kbd}>{kbd}</kbd>
      </div>
    </Link>
  );
}

function FooterHint() {
  return (
    <div style={styles.hint}>
      <span>Tip:</span> usa <kbd style={styles.kbdInline}>1</kbd>, <kbd style={styles.kbdInline}>2</kbd>,{' '}
      <kbd style={styles.kbdInline}>3</kbd>, <kbd style={styles.kbdInline}>4</kbd>,{' '}
      <kbd style={styles.kbdInline}>5</kbd> para navegar rápidamente.
    </div>
  );
}

/* ----------------- Íconos SVG inline (sin dependencias) ----------------- */
function TruckIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 17h4V5H2v12h3" />
      <path d="M2 17H1a1 1 0 00-1 1v2a1 1 0 001 1h1" />
      <path d="M14 17h5a1 1 0 001-1v-2a1 1 0 00-1-1h-1l-3-4H14" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}
function ClipboardIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
    </svg>
  );
}
function RouteIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="19" r="3" />
      <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
      <circle cx="18" cy="5" r="3" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 12v6" />
      <path d="M12 7v11" />
      <path d="M17 4v14" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

/* ----------------- Estilos inline con mejoras de diseño ----------------- */
const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: '100svh',
    position: 'relative',
    overflow: 'hidden',
    background: '#020617',
    color: '#e2e8f0',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  background: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 0,
  },
  blurOrb: {
    position: 'absolute',
    width: '50vw',
    height: '50vw',
    filter: 'blur(100px)',
    borderRadius: '50%',
    opacity: 0.5,
  },
  radial: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(circle at top left, rgba(14, 165, 233, 0.1), transparent 40%), radial-gradient(circle at bottom right, rgba(139, 92, 246, 0.1), transparent 40%)',
  },
  container: {
    position: 'relative',
    zIndex: 1,
    maxWidth: 1200,
    margin: '0 auto',
    padding: '8vh 24px 48px',
  },
  header: {
    textAlign: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 'clamp(36px, 5vw, 56px)',
    fontWeight: 800,
    letterSpacing: '-0.04em',
    // SE ELIMINÓ UN 'color' REDUNDANTE DE AQUÍ
    background: 'linear-gradient(180deg, #FFFFFF, #A7B3D2)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
  },
  brandDot: {
    color: '#6366f1',
  },
  subtitle: {
    maxWidth: 600,
    margin: '12px auto 0',
    color: '#94a3b8',
    fontSize: '18px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 24,
  },
  card: {
    position: 'relative',
    borderRadius: 16,
    textDecoration: 'none',
    color: 'inherit',
    transform: 'translateY(0)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    transition: 'transform 250ms ease, box-shadow 250ms ease',
    background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.01))',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  cardHover: {
    transform: 'translateY(-6px)',
    boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
  },
  cardAccent: {
    position: 'absolute',
    inset: 0,
    borderRadius: 16,
    filter: 'blur(24px)',
    zIndex: 0,
    transition: 'opacity 250ms ease',
  },
  cardInner: {
    position: 'relative',
    zIndex: 1,
    borderRadius: 15,
    padding: '20px',
    background: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    height: '100%',
  },
  iconWrap: {
    width: 48,
    height: 48,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 12,
    background: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
    color: '#e2e8f0',
  },
  cardContent: {
    position: 'relative'
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#f1f5f9',
    margin: 0,
  },
  cardDesc: {
    margin: '6px 0 0',
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 1.5,
  },
  kbd: {
    position: 'absolute',
    top: 16,
    right: 16,
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 8,
    padding: '2px 8px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 12,
    color: '#94a3b8',
    background: 'rgba(255,255,255,0.06)',
  },
  hint: {
    marginTop: 32,
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  kbdInline: {
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: 6,
    padding: '2px 6px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 12,
    background: 'rgba(255,255,255,0.1)',
    color: '#94a3b8',
  },
};