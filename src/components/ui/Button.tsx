// src/components/ui/Button.tsx
'use client';

import React from 'react';
import { motion, type HTMLMotionProps, type Transition } from 'framer-motion';
import { cn } from '@/lib/utils/cn';
import { Loader2 } from 'lucide-react';

// === TIPOS ===
interface ButtonOwnProps {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  animate?: boolean;
  fullWidth?: boolean;
}

// ⬅️ Clave: Omitimos 'children' de Framer y lo redefinimos como ReactNode
type ButtonProps = Omit<HTMLMotionProps<'button'>, 'ref' | 'children'> &
  ButtonOwnProps & {
    children?: React.ReactNode;
  };

// === BUTTON PRINCIPAL ===
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { 
      className, 
      variant = 'primary', 
      size = 'md', 
      loading = false,
      leftIcon,
      rightIcon,
      animate = true,
      fullWidth = false,
      disabled,
      children, 
      transition,
      whileHover,
      whileTap,
      ...props 
    }, 
    ref
  ) => {
    const variants = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      success: 'btn-success',
      warning: 'btn-warning',
      danger: 'btn-danger',
      ghost: 'btn-ghost',
      outline: 'btn bg-transparent border-2 border-white/30 text-white hover:bg-white/10 hover:border-white/50',
    } as const;

    const sizes = {
      sm: 'btn-sm',
      md: 'px-4 py-2 text-apple-body',
      lg: 'btn-lg',
      xl: 'px-8 py-4 text-apple-callout',
    } as const;

    const Component: any = animate ? motion.button : 'button';

    const isDisabled = !!disabled || loading;

    const spring: Transition = transition ?? { type: 'spring', stiffness: 400, damping: 25 };
    const safeHover = !isDisabled ? (whileHover ?? { scale: 1.02 }) : undefined;
    const safeTap = !isDisabled ? (whileTap ?? { scale: 0.98 }) : undefined;

    return (
      <Component
        ref={ref as any}
        className={cn(
          'btn',
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          isDisabled && 'btn-disabled',
          className
        )}
        disabled={isDisabled}
        whileHover={animate ? safeHover : undefined}
        whileTap={animate ? safeTap : undefined}
        transition={spring}
        {...props}
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {!loading && leftIcon && leftIcon}
        
        {children && (
          <span className={cn((loading || leftIcon || rightIcon) && 'mx-2')}>
            {children}
          </span>
        )}
        
        {!loading && rightIcon && rightIcon}
      </Component>
    );
  }
);
Button.displayName = 'Button';

// === BUTTON GROUP ===
const ButtonGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    orientation?: 'horizontal' | 'vertical';
    size?: 'sm' | 'md' | 'lg';
    variant?: 'primary' | 'secondary' | 'ghost';
  }
>(({ className, orientation = 'horizontal', children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'inline-flex',
      orientation === 'horizontal' ? 'flex-row' : 'flex-col',
      '[&>button]:rounded-none [&>button:first-child]:rounded-l-apple [&>button:last-child]:rounded-r-apple',
      orientation === 'vertical' && '[&>button:first-child]:rounded-t-apple [&>button:first-child]:rounded-l-none [&>button:last-child]:rounded-b-apple [&>button:last-child]:rounded-r-none',
      '[&>button:not(:first-child)]:border-l-0',
      orientation === 'vertical' && '[&>button:not(:first-child)]:border-l [&>button:not(:first-child)]:border-t-0',
      className
    )}
    {...props}
  >
    {children}
  </div>
));
ButtonGroup.displayName = 'ButtonGroup';

// === ICON BUTTON ===
type IconButtonProps = Omit<ButtonProps, 'leftIcon' | 'rightIcon'> & {
  icon: React.ReactNode;
  'aria-label': string;
};

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, className, size = 'md', ...props }, ref) => {
    const sizes = {
      sm: 'w-8 h-8 p-1',
      md: 'w-10 h-10 p-2',
      lg: 'w-12 h-12 p-3',
      xl: 'w-14 h-14 p-4',
    } as const;

    return (
      <Button
        ref={ref}
        className={cn('aspect-square flex items-center justify-center', sizes[size], className)}
        size={size}
        {...props}
      >
        {icon}
      </Button>
    );
  }
);
IconButton.displayName = 'IconButton';

// === FLOATING ACTION BUTTON ===
type FabProps = Omit<ButtonProps, 'variant' | 'size'> & {
  icon: React.ReactNode;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  size?: 'md' | 'lg';
};

const FloatingActionButton = React.forwardRef<HTMLButtonElement, FabProps>(
  ({ icon, position = 'bottom-right', size = 'md', className, ...props }, ref) => {
    const positions = {
      'bottom-right': 'fixed bottom-6 right-6',
      'bottom-left': 'fixed bottom-6 left-6',
      'top-right': 'fixed top-6 right-6',
      'top-left': 'fixed top-6 left-6',
    } as const;

    const sizes = {
      md: 'w-14 h-14',
      lg: 'w-16 h-16',
    } as const;

    return (
      <motion.button
        ref={ref}
        className={cn(
          'glass rounded-full flex items-center justify-center shadow-apple-lg z-50',
          'text-white hover:bg-white/20 transition-all duration-300',
          positions[position],
          sizes[size],
          className
        )}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 } as Transition}
        {...props}
      >
        {icon}
      </motion.button>
    );
  }
);
FloatingActionButton.displayName = 'FloatingActionButton';

// === TOGGLE BUTTON ===
type ToggleButtonProps = Omit<ButtonProps, 'variant'> & {
  pressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
};

const ToggleButton = React.forwardRef<HTMLButtonElement, ToggleButtonProps>(
  ({ pressed = false, onPressedChange, className, children, ...props }, ref) => (
    <Button
      ref={ref}
      variant={pressed ? 'primary' : 'secondary'}
      className={cn('transition-all duration-200', pressed && 'shadow-apple-sm', className)}
      onClick={() => onPressedChange?.(!pressed)}
      {...props}
    >
      {children}
    </Button>
  )
);
ToggleButton.displayName = 'ToggleButton';

// === LINK BUTTON ===
// También omitimos 'children' para evitar MotionValue en <a>
interface LinkButtonOwnProps {
  variant?: ButtonOwnProps['variant'];
  size?: ButtonOwnProps['size'];
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  animate?: boolean;
  fullWidth?: boolean;
}
type LinkButtonProps = Omit<HTMLMotionProps<'a'>, 'ref' | 'children'> &
  LinkButtonOwnProps & { children?: React.ReactNode };

const LinkButton = React.forwardRef<HTMLAnchorElement, LinkButtonProps>(
  (
    { 
      className, 
      variant = 'primary', 
      size = 'md', 
      leftIcon,
      rightIcon,
      animate = true,
      fullWidth = false,
      children,
      transition,
      whileHover,
      whileTap,
      ...props 
    }, 
    ref
  ) => {
    const variants = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      success: 'btn-success',
      warning: 'btn-warning',
      danger: 'btn-danger',
      ghost: 'btn-ghost',
      outline: 'btn bg-transparent border-2 border-white/30 text-white hover:bg-white/10 hover:border-white/50',
    } as const;

    const sizes = {
      sm: 'btn-sm',
      md: 'px-4 py-2 text-apple-body',
      lg: 'btn-lg',
      xl: 'px-8 py-4 text-apple-callout',
    } as const;

    const Component: any = animate ? motion.a : 'a';
    const spring: Transition = transition ?? { type: 'spring', stiffness: 400, damping: 25 };

    return (
      <Component
        ref={ref as any}
        className={cn(
          'btn inline-flex items-center justify-center gap-2 no-underline',
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        whileHover={animate ? (whileHover ?? { scale: 1.02 }) : undefined}
        whileTap={animate ? (whileTap ?? { scale: 0.98 }) : undefined}
        transition={spring}
        {...props}
      >
        {leftIcon && leftIcon}
        {children}
        {rightIcon && rightIcon}
      </Component>
    );
  }
);
LinkButton.displayName = 'LinkButton';

export {
  Button,
  ButtonGroup,
  IconButton,
  FloatingActionButton,
  ToggleButton,
  LinkButton,
};