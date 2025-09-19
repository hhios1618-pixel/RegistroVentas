// src/components/ui/Button.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils/cn';
import { Loader2 } from 'lucide-react';

// === TIPOS ===
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  animate?: boolean;
  fullWidth?: boolean;
}

// === BUTTON PRINCIPAL ===
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
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
    ...props 
  }, ref) => {
    const variants = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      success: 'btn-success',
      warning: 'btn-warning',
      danger: 'btn-danger',
      ghost: 'btn-ghost',
      outline: 'btn bg-transparent border-2 border-white/30 text-white hover:bg-white/10 hover:border-white/50',
    };

    const sizes = {
      sm: 'btn-sm',
      md: 'px-4 py-2 text-apple-body',
      lg: 'btn-lg',
      xl: 'px-8 py-4 text-apple-callout',
    };

    const Component = animate ? motion.button : 'button';
    const motionProps = animate ? {
      whileHover: { scale: disabled || loading ? 1 : 1.02 },
      whileTap: { scale: disabled || loading ? 1 : 0.98 },
      transition: { type: 'spring', stiffness: 400, damping: 25 }
    } : {};

    const isDisabled = disabled || loading;

    return (
      <Component
        ref={ref}
        className={cn(
          'btn',
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          isDisabled && 'btn-disabled',
          className
        )}
        disabled={isDisabled}
        {...motionProps}
        {...props}
      >
        {loading && (
          <Loader2 size={16} className="animate-spin" />
        )}
        {!loading && leftIcon && leftIcon}
        
        {children && (
          <span className={cn(
            (loading || leftIcon || rightIcon) && 'mx-2'
          )}>
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
const IconButton = React.forwardRef<
  HTMLButtonElement,
  Omit<ButtonProps, 'leftIcon' | 'rightIcon'> & {
    icon: React.ReactNode;
    'aria-label': string;
  }
>(({ icon, className, size = 'md', ...props }, ref) => {
  const sizes = {
    sm: 'w-8 h-8 p-1',
    md: 'w-10 h-10 p-2',
    lg: 'w-12 h-12 p-3',
    xl: 'w-14 h-14 p-4',
  };

  return (
    <Button
      ref={ref}
      className={cn(
        'aspect-square flex items-center justify-center',
        sizes[size],
        className
      )}
      size={size}
      {...props}
    >
      {icon}
    </Button>
  );
});
IconButton.displayName = 'IconButton';

// === FLOATING ACTION BUTTON ===
const FloatingActionButton = React.forwardRef<
  HTMLButtonElement,
  Omit<ButtonProps, 'variant' | 'size'> & {
    icon: React.ReactNode;
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    size?: 'md' | 'lg';
  }
>(({ icon, position = 'bottom-right', size = 'md', className, ...props }, ref) => {
  const positions = {
    'bottom-right': 'fixed bottom-6 right-6',
    'bottom-left': 'fixed bottom-6 left-6',
    'top-right': 'fixed top-6 right-6',
    'top-left': 'fixed top-6 left-6',
  };

  const sizes = {
    md: 'w-14 h-14',
    lg: 'w-16 h-16',
  };

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
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      {...props}
    >
      {icon}
    </motion.button>
  );
});
FloatingActionButton.displayName = 'FloatingActionButton';

// === TOGGLE BUTTON ===
const ToggleButton = React.forwardRef<
  HTMLButtonElement,
  Omit<ButtonProps, 'variant'> & {
    pressed?: boolean;
    onPressedChange?: (pressed: boolean) => void;
  }
>(({ pressed = false, onPressedChange, className, children, ...props }, ref) => (
  <Button
    ref={ref}
    variant={pressed ? 'primary' : 'secondary'}
    className={cn(
      'transition-all duration-200',
      pressed && 'shadow-apple-sm',
      className
    )}
    onClick={() => onPressedChange?.(!pressed)}
    {...props}
  >
    {children}
  </Button>
));
ToggleButton.displayName = 'ToggleButton';

// === LINK BUTTON ===
const LinkButton = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    variant?: ButtonProps['variant'];
    size?: ButtonProps['size'];
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    animate?: boolean;
    fullWidth?: boolean;
  }
>(({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  leftIcon,
  rightIcon,
  animate = true,
  fullWidth = false,
  children,
  ...props 
}, ref) => {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    success: 'btn-success',
    warning: 'btn-warning',
    danger: 'btn-danger',
    ghost: 'btn-ghost',
    outline: 'btn bg-transparent border-2 border-white/30 text-white hover:bg-white/10 hover:border-white/50',
  };

  const sizes = {
    sm: 'btn-sm',
    md: 'px-4 py-2 text-apple-body',
    lg: 'btn-lg',
    xl: 'px-8 py-4 text-apple-callout',
  };

  const Component = animate ? motion.a : 'a';
  const motionProps = animate ? {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
    transition: { type: 'spring', stiffness: 400, damping: 25 }
  } : {};

  return (
    <Component
      ref={ref}
      className={cn(
        'btn inline-flex items-center justify-center gap-2 no-underline',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      {...motionProps}
      {...props}
    >
      {leftIcon && leftIcon}
      {children}
      {rightIcon && rightIcon}
    </Component>
  );
});
LinkButton.displayName = 'LinkButton';

export {
  Button,
  ButtonGroup,
  IconButton,
  FloatingActionButton,
  ToggleButton,
  LinkButton,
};
