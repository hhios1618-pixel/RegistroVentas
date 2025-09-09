// En el nuevo archivo: src/app/test/page.tsx
'use client';

import { useState } from 'react';

// Copiamos los estilos para que se vea igual
const inputStyles = "bg-slate-900/70 border-slate-700 placeholder:text-slate-500 text-base p-3 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

export default function TestPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  console.log('--- Renderizando PÁGINA DE PRUEBA ---');

  return (
    <div className="bg-slate-900 min-h-screen p-8">
      <div className="max-w-md mx-auto space-y-4 bg-slate-800 p-6 rounded-lg">
        <h1 className="text-white text-xl font-bold">Página de Prueba Aislada</h1>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Nombre</label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              console.log('Escribiendo nombre:', e.target.value);
              setName(e.target.value);
            }}
            className={inputStyles}
            placeholder="Intenta escribir aquí..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Teléfono</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => {
              console.log('Escribiendo teléfono:', e.target.value);
              setPhone(e.target.value);
            }}
            className={inputStyles}
            placeholder="Y aquí también..."
          />
        </div>

        <div className="text-white mt-4">
          <p>Nombre actual: {name}</p>
          <p>Teléfono actual: {phone}</p>
        </div>
      </div>
    </div>
  );
}