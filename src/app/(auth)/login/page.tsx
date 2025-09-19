// src/app/(auth)/login/page.tsx
import { Suspense } from 'react';
import { LoginClient, Spinner } from './LoginClient'; 

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-black">
          <div className="glass-card text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Spinner />
            </div>
            <p className="apple-body text-white">Cargando interfaz de acceso...</p>
          </div>
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
