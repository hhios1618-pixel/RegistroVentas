'use client';

import { useRouter } from 'next/navigation';
import type { FC, ReactNode } from 'react';
import { useTransition } from 'react';

// Define el tipo de las props, heredando todas las de un botón normal
// Esto soluciona el error al permitir 'children' y 'className'
type LogoutButtonProps = React.ComponentProps<'button'>;

const LogoutButton: FC<LogoutButtonProps> = ({ children, className, ...props }) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLogout = async () => {
    // Llama a tu endpoint de logout
    await fetch('/endpoints/auth/logout', { method: 'POST' });
    
    // Inicia la transición para una navegación más suave
    startTransition(() => {
      router.push('/login');
      router.refresh(); 
    });
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isPending}
      className={className} // Usa el className que se le pasa
      {...props}
    >
      {isPending ? (
        <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Cerrando...</span>
        </div>
      ) : (
        children // Renderiza el contenido (ícono y texto)
      )}
    </button>
  );
};

export default LogoutButton;