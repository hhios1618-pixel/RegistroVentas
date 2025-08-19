// src/app/portal/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function PortalLauncher() {
  // (Opcional) saludo dinámico por hora
  const [greet, setGreet] = useState('Hola');
  useEffect(() => {
    const h = new Date().getHours();
    setGreet(h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches');

    // Atajos de teclado: 1=Logística, 2=Registro, 3=Delivery, 4=Dashboard
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, string> = {
        '1': '/logistica',
        '2': '/',                 // tu registro actual vive en "/"
        '3': '/delivery',
        '4': '/dashboard/ventas',
      };
      if (map[e.key]) window.location.href = map[e.key];
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <main style={styles.main}>
      {/* Fondo premium: gradiente + “brillos” sutiles */}
      <div style={styles.background}>
        <div style={{ ...styles.blurOrb, top: '-10%', left: '-10%' }} />
        <div style={{ ...styles.blurOrb, bottom: '-15%', right: '-5%' }} />
        <div style={{ ...styles.radial, top: 0, left: 0 }} />
      </div>

      <section style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>
            {greet}, Fenix Team<span style={styles.brandDot}>.</span>
          </h1>
          <p style={styles.subtitle}>
            Elige la vista que necesitas. Diseño limpio, foco operativo, cero ruido.
          </p>
        </header>

        <div style={styles.grid}>
          <NavCard
            title="Logística"
            desc="Asigna pedidos, monitorea rutas y confirma entregas."
            href="/logistica"
            kbd="1"
            icon={<TruckIcon />}
            accent="linear-gradient(135deg,#4f46e5, #22d3ee)"
          />
          <NavCard
            title="Registro de Venta"
            desc="Ingresa ventas online y genera el pedido con trazabilidad."
            href="/"
            kbd="2"
            icon={<ClipboardIcon />}
            accent="linear-gradient(135deg,#0ea5e9, #60a5fa)"
          />
          <NavCard
            title="Delivery"
            desc="Ver pedidos asignados, salir a ruta y marcar entregado con geo."
            href="/delivery"
            kbd="3"
            icon={<RouteIcon />}
            accent="linear-gradient(135deg,#22c55e, #a3e635)"
          />
          <NavCard
            title="Dashboard de Ventas"
            desc="KPIs en tiempo real: productos, asesores, ticket, ingresos."
            href="/dashboard/ventas"
            kbd="4"
            icon={<ChartIcon />}
            accent="linear-gradient(135deg,#f59e0b, #f97316)"
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
  return (
    <Link href={href} style={styles.card as any}>
      <div style={{ ...styles.cardAccent, background: accent }} />
      <div style={styles.cardInner}>
        <div style={styles.iconWrap}>{icon}</div>
        <div>
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
      <kbd style={styles.kbdInline}>3</kbd>, <kbd style={styles.kbdInline}>4</kbd> para saltar rápido.
    </div>
  );
}

/* ----------------- Íconos SVG inline (sin dependencias) ----------------- */

function TruckIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 7h11v8H3V7z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M14 10h3l3 3v2h-6v-5z" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="7" cy="17" r="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17" cy="17" r="2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="6" y="4" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 4h6v3H9z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 10h8M8 13h8M8 16h6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function RouteIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 20a4 4 0 0 1 4-4h2a4 4 0 0 0 4-4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="7" cy="20" r="2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 19V5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 19V9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M14 19V7" stroke="currentColor" strokeWidth="1.6" />
      <path d="M19 19V12" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

/* ----------------- Estilos inline premium ----------------- */

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: '100svh',
    position: 'relative',
    overflow: 'hidden',
    background: 'linear-gradient(180deg, #0b1229 0%, #0a0f23 100%)', // base oscuro elegante
    color: '#e6e9f2',
  },
  background: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
  },
  blurOrb: {
    position: 'absolute',
    width: '42vw',
    height: '42vw',
    background: 'radial-gradient(closest-side, rgba(58,167,255,0.35), transparent 70%)',
    filter: 'blur(30px)',
    borderRadius: '50%',
  },
  radial: {
    position: 'absolute',
    inset: 0,
    background:
      'radial-gradient(900px 400px at 10% -10%, rgba(36,99,235,0.18), transparent 60%), radial-gradient(800px 300px at 110% 110%, rgba(16,185,129,0.12), transparent 60%)',
  },
  container: {
    position: 'relative',
    zIndex: 1,
    maxWidth: 1100,
    margin: '0 auto',
    padding: '64px 20px 40px',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 'clamp(28px, 3vw, 42px)',
    fontWeight: 800,
    letterSpacing: '-0.02em',
  },
  brandDot: {
    background:
      'linear-gradient(135deg, #22d3ee, #60a5fa, #8b5cf6)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
  },
  subtitle: {
    marginTop: 8,
    color: '#a9b0c6',
    fontSize: 16,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: 16,
    marginTop: 24,
  },
  card: {
    position: 'relative',
    borderRadius: 16,
    padding: 1,
    background:
      'linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))',
    boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
    textDecoration: 'none',
    transition: 'transform 180ms ease, box-shadow 180ms ease',
  },
  cardAccent: {
    position: 'absolute',
    inset: 0,
    borderRadius: 16,
    opacity: 0.2,
    filter: 'blur(18px)',
    zIndex: 0,
  },
  cardInner: {
    position: 'relative',
    zIndex: 1,
    borderRadius: 15,
    padding: '18px 16px',
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    display: 'grid',
    gridTemplateColumns: 'auto 1fr auto',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.08)',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 700,
    margin: 0,
  },
  cardDesc: {
    margin: '4px 0 0',
    fontSize: 13,
    color: '#a9b0c6',
  },
  kbd: {
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 8,
    padding: '2px 8px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 12,
    color: '#cbd5e1',
    background: 'rgba(255,255,255,0.06)',
  },
  hint: {
    marginTop: 22,
    fontSize: 12,
    color: '#94a3b8',
  },
  kbdInline: {
    border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: 6,
    padding: '1px 6px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 12,
    background: 'rgba(255,255,255,0.06)',
  },
};