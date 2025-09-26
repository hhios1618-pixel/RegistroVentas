'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

// tamaños base del variant
type BaseSize = 'default' | 'sm' | 'lg' | 'icon';
// extensiones que estás usando en la app
type ExtendedSize = BaseSize | 'small' | 'medium';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-apple text-sm font-medium transition-all duration-200 ease-in-out focus-apple disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default:
          'bg-apple-blue text-white hover:bg-apple-blue-hover shadow-apple-sm hover:shadow-apple hover:-translate-y-0.5',
        destructive:
          'bg-destructive text-white hover:bg-destructive/90 shadow-apple-sm hover:shadow-apple hover:-translate-y-0.5',
        outline:
          'border border-app-border bg-app-card text-app-foreground hover:bg-white/10 hover:border-white/15 backdrop-blur-apple',
        secondary:
          'bg-app-card border border-app-border text-app-foreground hover:bg-white/10 hover:border-white/15 backdrop-blur-apple',
        ghost:
          'text-app-foreground hover:bg-white/10 hover:backdrop-blur-apple',
        link:
          'text-apple-blue hover:text-apple-blue-hover underline-offset-4 hover:underline',
        success:
          'bg-success text-white hover:bg-success/90 shadow-apple-sm hover:shadow-apple hover:-translate-y-0.5',
      },
      size: {
        default: 'h-11 px-6 py-3',
        sm: 'h-9 px-4 py-2 text-xs',
        lg: 'h-12 px-8 py-3 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

// NOTA: aceptamos props de motion.button para evitar choques de tipos (onAnimationStart, transition, etc.)
export interface ButtonProps
  extends Omit<HTMLMotionProps<'button'>, 'ref' | 'size'>,
    Omit<VariantProps<typeof buttonVariants>, 'size'> {
  size?: ExtendedSize;
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement | HTMLSpanElement, ButtonProps>(
  (
    {
      className,
      variant,
      size = 'default',
      asChild = false,
      loading = false,
      children,
      disabled,
      transition,
      ...props
    },
    ref
  ) => {
    // normalizamos small/medium a los tamaños del variant
    const normalizedSize: BaseSize =
      size === 'small' ? 'sm' : size === 'medium' ? 'default' : size;

    // usamos siempre componentes motion para compatibilidad de tipos
    const Comp: any = asChild ? motion.span : motion.button;

    // transition tip-safe para framer (evita "type es string")
    const spring =
      transition ?? ({ type: 'spring', stiffness: 400, damping: 25 } as const);

    return (
      <Comp
        ref={ref as any}
        className={cn(buttonVariants({ variant, size: normalizedSize, className }))}
        // sólo pasamos disabled si es <button>; los <span> no aceptan disabled
        {...(!asChild ? { disabled: loading || !!disabled } : {})}
        // animaciones opcionales; si no las usas, no molestan
        whileHover={!asChild && !(loading || disabled) ? { y: -1 } : undefined}
        whileTap={!asChild && !(loading || disabled) ? { scale: 0.98 } : undefined}
        transition={spring}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        )}
        {children}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };