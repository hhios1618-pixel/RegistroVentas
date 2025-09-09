'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// tamaños base del variant
type BaseSize = 'default' | 'sm' | 'lg' | 'icon';
// extensiones que estás usando en la app
type ExtendedSize = BaseSize | 'small' | 'medium';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 ring-offset-background disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'underline underline-offset-4 text-primary hover:no-underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3 rounded-md',
        lg: 'h-11 px-8 rounded-md',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

// NOTA CLAVE: omitimos 'size' de VariantProps para poder definir ExtendedSize
export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'size'>,
    Omit<VariantProps<typeof buttonVariants>, 'size'> {
  size?: ExtendedSize;
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size = 'default',
      asChild = false,
      loading = false,
      children,
      ...props
    },
    ref
  ) => {
    // normalizamos small/medium a los tamaños del variant
    const normalizedSize: BaseSize =
      size === 'small' ? 'sm' : size === 'medium' ? 'default' : size;

    // Sin Radix Slot: si asChild, renderizamos un <span> contenedor
    // (para tu caso <Button asChild><label/></Button> funciona bien).
    const Comp: any = asChild ? 'span' : 'button';

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size: normalizedSize, className }))}
        disabled={loading || props.disabled}
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