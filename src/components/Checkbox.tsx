'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Callback adicional tipo Radix */
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, onChange, ...props }, ref) => {
    return (
      <input
        type="checkbox"
        ref={ref}
        className={cn(
          'peer h-4 w-4 shrink-0 rounded-sm border border-input ring-offset-background ' +
            'checked:bg-primary checked:text-primary-foreground ' +
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
            'focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        onChange={(e) => {
          onChange?.(e); // mantiene compatibilidad nativa
          onCheckedChange?.(e.target.checked); // dispara callback custom
        }}
        {...props}
      />
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };