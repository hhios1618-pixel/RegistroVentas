// --- ARCHIVO COMPLETO: src/components/NavCard.tsx ---
'use client';

import { Card, CardHeader, CardTitle, CardDescription } from '@/components/Card';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';

type Props = {
  href: string;
  title: string;
  desc?: string;
  kbd?: string;            // tecla rápida opcional
  className?: string;
  accentClass?: string;    // ej: 'from-emerald-500 to-green-500'
};

export default function NavCard({ href, title, desc, kbd, className, accentClass }: Props) {
  const router = useRouter();

  // Hotkey opcional
  useEffect(() => {
    if (!kbd) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === kbd.toLowerCase()) router.push(href);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [href, kbd, router]);

  return (
    <div
      role="link"
      aria-label={title}
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          router.push(href);
        }
      }}
      className="group cursor-pointer"
      data-href={href}
    >
      <Card
        className={[
          // pointer-events-auto ya viene del Card base
          'relative overflow-hidden border border-white/10 bg-white/5 backdrop-blur-2xl hover:bg-white/8 transition',
          className ?? ''
        ].join(' ')}
      >
        {/* Capa decorativa: NO debe interceptar clicks */}
        <div
          className={[
            'pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500',
            accentClass ? `bg-gradient-to-br ${accentClass}` : ''
          ].join(' ')}
        />
        <CardHeader className="relative z-10">
          <div className="flex items-center justify-between">
            <CardTitle>{title}</CardTitle>
            {kbd && (
              <span className="text-xs font-mono px-2 py-1 rounded border border-white/15 bg-white/5">
                {kbd}
              </span>
            )}
          </div>
          {desc && <CardDescription>{desc}</CardDescription>}
          {/* Fallback visible sin interferir con el onClick del contenedor */}
          <Link
            href={href}
            onClick={(e) => e.stopPropagation()}
            className="mt-3 inline-block text-emerald-300 group-hover:text-emerald-200 text-sm font-medium"
          >
            Abrir →
          </Link>
        </CardHeader>
      </Card>
    </div>
  );
}