// src/components/Card.tsx
import React from 'react';
import { cn } from '@/lib/utils/cn'; // Lo crearemos en el siguiente paso

// Contenedor principal de la tarjeta
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-lg border border-white/10 bg-black/30 text-white shadow-sm',
      className
    )}
    {...props}
  />
));
Card.displayName = 'Card';

// Cabecera de la tarjeta
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-4 sm:p-6', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

// Contenido de la tarjeta
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-4 sm:p-6 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

// Pie de página de la tarjeta
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-4 sm:p-6 pt-0', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardContent, CardFooter };