'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Role = 'admin' | 'promotor' | 'coordinador' | 'lider' | 'asesor' | 'unknown';
type Me = { ok: boolean; role?: Role; full_name?: string };

const ROLE_TO_HOME: Record<Role, string> = {
  admin: '/',
  coordinador: '/dashboard/ventas',  // cámbialo si prefieres otro home
  lider: '/dashboard/vendedores',    // cámbialo si prefieres otro home
  asesor: '/asesoras',
  promotor: '/promotores',
  unknown: '/portal',                 // fallback suave
};

export default function PostLoginRouter() {
  const router = useRouter();
  const [status, setStatus] = useState<'checking'|'redirecting'|'error'>('checking');
  const [msg, setMsg] = useState<string>('Verificando sesión…');

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        // usamos tu endpoint actual
        const r = await fetch('/endpoints/me', { cache: 'no-store' });
        const me: Me = await r.json();
        if (!r.ok || !me?.ok) throw new Error('no_session');
        const role = (me.role ?? 'unknown') as Role;
        const href = ROLE_TO_HOME[role] ?? '/portal';
        if (canceled) return;
        setStatus('redirecting');
        setMsg(`Bienvenido, redirigiendo a tu inicio (${role})…`);
        // usamos replace para no dejar la ruta intermedia en el history
        router.replace(href);
      } catch (e: any) {
        if (canceled) return;
        setStatus('error');
        setMsg('No se pudo resolver tu inicio. Intenta desde el botón.');
      }
    })();
    return () => { canceled = true; };
  }, [router]);

  return (
    <main style={{minHeight:'100dvh',display:'grid',placeItems:'center',background:'#0D1117',color:'#C9D1D9'}}>
      <div style={{padding:24,border:'1px solid #30363D',borderRadius:12,background:'rgba(22,27,34,0.6)',maxWidth:460,width:'92%'}}>
        <h1 style={{margin:'0 0 8px',fontSize:20}}>FENIX — Entrando…</h1>
        <p style={{margin:'0 0 16px',opacity:.8}}>{msg}</p>
        {status === 'error' && (
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <a href="/" className="px-3 py-2 rounded-md" style={{background:'#0ea5e9',color:'#fff',textDecoration:'none'}}>Ir al Dashboard</a>
            <a href="/asesoras" className="px-3 py-2 rounded-md" style={{background:'#10b981',color:'#fff',textDecoration:'none'}}>Ir a Asesoras</a>
            <a href="/promotores" className="px-3 py-2 rounded-md" style={{background:'#8b5cf6',color:'#fff',textDecoration:'none'}}>Ir a Promotores</a>
          </div>
        )}
        {status !== 'error' && (
          <div style={{display:'flex',alignItems:'center',gap:10,opacity:.8}}>
            <div style={{width:14,height:14,border:'2px solid rgba(255,255,255,.25)',borderTop:'2px solid #fff',borderRadius:'50%',animation:'spin 1s linear infinite'}} />
            <small>Por favor espera…</small>
          </div>
        )}
      </div>
      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}