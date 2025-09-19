// En tu archivo de ruta, ej: src/app/login/page.tsx

import { Suspense } from 'react';
// Asegúrate que la ruta de importación sea la correcta según tu estructura
import { LoginClient, Spinner } from './LoginClient'; 

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen grid place-items-center text-slate-300 bg-[#0a0c16]">
          <div className="flex items-center gap-3">
            <Spinner />
            Cargando Interfaz de Acceso…
          </div>
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}