// src/components/LogoutButton.tsx
'use client';

import React from 'react';

export default function LogoutButton({ className = '' }) {
  const handleLogout = () => {
    window.location.href = '/endpoints/auth/logout';
  };

  return (
    <button
      onClick={handleLogout}
      aria-label="Cerrar sesión"
      className={[
        // base Apple-like glass
        'group inline-flex items-center gap-2 rounded-lg',
        'border border-white/10 bg-white/5 backdrop-blur-sm',
        // tamaño & tipografía
        'px-3 py-1.5 text-xs font-medium text-white/80',
        // interacción
        'transition-all duration-300 hover:bg-white/10 hover:text-white',
        'focus:outline-none focus:ring-2 focus:ring-white/20',
        'active:scale-[0.98]',
        className,
      ].join(' ')}
    >
      {/* ícono sutil */}
      <svg
        className="h-4 w-4 text-white/60 transition-colors group-hover:text-white"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        aria-hidden="true"
      >
        {/* puerta */}
        <path
          d="M4 5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Z"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-70"
        />
        {/* flecha de salida */}
        <path
          d="M14 12H3m0 0l3-3M3 12l3 3"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* texto (oculto en pantallas muy pequeñas si quieres ultra minimal) */}
      <span className="hidden xs:inline">Salir</span>
    </button>
  );
}