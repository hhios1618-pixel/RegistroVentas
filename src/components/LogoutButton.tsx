'use client';

import React from 'react';

export default function LogoutButton({ className = '' }) {
  const handleLogout = () => {
    window.location.href = '/endpoints/auth/logout';
  };

  return (
    <button
      onClick={handleLogout}
      className={`px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition ${className}`}
    >
      Salir
    </button>
  );
}