import { Suspense } from 'react';
import { LoginClient } from './LoginClient';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen grid place-items-center text-slate-300">
          <div className="flex items-center gap-3">
            <svg className="animate-spin h-5 w-5 opacity-70" viewBox="0 0 24 24">
              <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Cargando…
          </div>
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}