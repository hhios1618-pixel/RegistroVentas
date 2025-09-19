// src/components/ui/Form.tsx
'use client';

import * as React from 'react';
import { motion, type HTMLMotionProps, type Transition } from 'framer-motion';
import { cn } from '@/lib/utils/cn';
import { AlertCircle, Check, Eye, EyeOff } from 'lucide-react';

// === FORM CONTAINER ===
type FormProps = Omit<HTMLMotionProps<'form'>, 'ref' | 'children'> & {
  animate?: boolean;
  children?: React.ReactNode;
};

const Form = React.forwardRef<HTMLFormElement, FormProps>(
  ({ className, animate = true, children, transition, ...props }, ref) => {
    const Component: any = animate ? motion.form : 'form';

    // Tip-safe: Transition con ease en cubic-bezier
    const baseTransition: Transition =
      transition ?? { duration: 0.3, ease: [0.17, 0.55, 0.55, 1] };

    const motionProps: Partial<HTMLMotionProps<'form'>> = animate
      ? {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          transition: baseTransition,
        }
      : {};

    return (
      <Component
        ref={ref as any}
        className={cn('space-y-6', className)}
        {...motionProps}
        {...props}
      >
        {children}
      </Component>
    );
  }
);
Form.displayName = 'Form';

// === FORM GROUP ===
const FormGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    error?: string;
    required?: boolean;
  }
>(({ className, error, required, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('space-y-2', error && 'animate-shake', className)}
    {...props}
  >
    {children}
    {error && (
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 text-apple-red-400 text-apple-caption"
      >
        <AlertCircle size={14} />
        <span>{error}</span>
      </motion.div>
    )}
  </div>
));
FormGroup.displayName = 'FormGroup';

// === LABEL ===
const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement> & {
    required?: boolean;
    size?: 'sm' | 'md' | 'lg';
  }
>(({ className, required, size = 'md', children, ...props }, ref) => {
  const sizes = {
    sm: 'text-apple-caption2',
    md: 'text-apple-caption1',
    lg: 'text-apple-footnote',
  } as const;

  return (
    <label
      ref={ref}
      className={cn(
        'block font-medium text-apple-gray-300',
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="text-apple-red-400 ml-1">*</span>}
    </label>
  );
});
Label.displayName = 'Label';

// === INPUT ===
const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    error?: boolean;
    success?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    variant?: 'default' | 'filled' | 'outlined';
  }
>(({ 
  className, 
  type = 'text', 
  error, 
  success, 
  leftIcon, 
  rightIcon, 
  variant = 'default',
  ...props 
}, ref) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;

  const variants = {
    default: 'field',
    filled: 'field bg-white/10',
    outlined: 'field border-2',
  } as const;

  const statusClasses = error 
    ? 'border-apple-red-500 focus:border-apple-red-500 focus:ring-apple-red-500/30'
    : success 
    ? 'border-apple-green-500 focus:border-apple-green-500 focus:ring-apple-green-500/30'
    : '';

  return (
    <div className="relative">
      {leftIcon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-gray-500">
          {leftIcon}
        </div>
      )}
      
      <input
        type={inputType}
        ref={ref}
        className={cn(
          variants[variant],
          leftIcon && 'pl-10',
          (rightIcon || isPassword) && 'pr-10',
          statusClasses,
          className
        )}
        {...props}
      />
      
      {isPassword && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-apple-gray-500 hover:text-white transition-colors"
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      )}
      
      {rightIcon && !isPassword && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-apple-gray-500">
          {rightIcon}
        </div>
      )}
      
      {success && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-apple-green-400">
          <Check size={18} />
        </div>
      )}
    </div>
  );
});
Input.displayName = 'Input';

// === TEXTAREA ===
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    error?: boolean;
    success?: boolean;
    resize?: boolean;
  }
>(({ className, error, success, resize = true, ...props }, ref) => {
  const statusClasses = error 
    ? 'border-apple-red-500 focus:border-apple-red-500 focus:ring-apple-red-500/30'
    : success 
    ? 'border-apple-green-500 focus:border-apple-green-500 focus:ring-apple-green-500/30'
    : '';

  return (
    <textarea
      ref={ref}
      className={cn(
        'field min-h-[80px]',
        !resize && 'resize-none',
        statusClasses,
        className
      )}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

// === SELECT ===
const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & {
    error?: boolean;
    success?: boolean;
    placeholder?: string;
  }
>(({ className, error, success, placeholder, children, ...props }, ref) => {
  const statusClasses = error 
    ? 'border-apple-red-500 focus:border-apple-red-500 focus:ring-apple-red-500/30'
    : success 
    ? 'border-apple-green-500 focus:border-apple-green-500 focus:ring-apple-green-500/30'
    : '';

  return (
    <select
      ref={ref}
      className={cn(
        'field appearance-none bg-no-repeat bg-right bg-[length:16px] cursor-pointer',
        'bg-[url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'m6 8 4 4 4-4\'/%3e%3c/svg%3e")]',
        statusClasses,
        className
      )}
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {children}
    </select>
  );
});
Select.displayName = 'Select';

// === CHECKBOX ===
const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    description?: string;
  }
>(({ className, label, description, ...props }, ref) => (
  <div className="flex items-start gap-3">
    <input
      type="checkbox"
      ref={ref}
      className={cn(
        'w-4 h-4 mt-0.5 rounded border-white/20 bg-white/10 text-apple-blue-600',
        'focus:ring-2 focus:ring-apple-blue-500/50 focus:ring-offset-2 focus:ring-offset-black',
        'transition-colors duration-200',
        className
      )}
      {...props}
    />
    {(label || description) && (
      <div className="flex-1">
        {label && (
          <label className="apple-body text-white font-medium cursor-pointer">
            {label}
          </label>
        )}
        {description && (
          <p className="apple-caption text-apple-gray-400 mt-1">
            {description}
          </p>
        )}
      </div>
    )}
  </div>
));
Checkbox.displayName = 'Checkbox';

// === RADIO GROUP ===
const RadioGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    name: string;
    value?: string;
    onChange?: (value: string) => void;
    options: Array<{
      value: string;
      label: string;
      description?: string;
    }>;
  }
>(({ className, name, value, onChange, options, ...props }, ref) => (
  <div ref={ref} className={cn('space-y-3', className)} {...props}>
    {options.map((option) => (
      <div key={option.value} className="flex items-start gap-3">
        <input
          type="radio"
          id={`${name}-${option.value}`}
          name={name}
          value={option.value}
          checked={value === option.value}
          onChange={(e) => onChange?.(e.target.value)}
          className="w-4 h-4 mt-0.5 border-white/20 bg-white/10 text-apple-blue-600 focus:ring-2 focus:ring-apple-blue-500/50 focus:ring-offset-2 focus:ring-offset-black transition-colors duration-200"
        />
        <div className="flex-1">
          <label 
            htmlFor={`${name}-${option.value}`}
            className="apple-body text-white font-medium cursor-pointer"
          >
            {option.label}
          </label>
          {option.description && (
            <p className="apple-caption text-apple-gray-400 mt-1">
              {option.description}
            </p>
          )}
        </div>
      </div>
    ))}
  </div>
));
RadioGroup.displayName = 'RadioGroup';

// === FORM ACTIONS ===
const FormActions = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    justify?: 'start' | 'center' | 'end' | 'between';
  }
>(({ className, justify = 'end', children, ...props }, ref) => {
  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  } as const;

  return (
    <div
      ref={ref}
      className={cn('flex items-center gap-3 pt-6', justifyClasses[justify], className)}
      {...props}
    >
      {children}
    </div>
  );
});
FormActions.displayName = 'FormActions';

export {
  Form,
  FormGroup,
  Label,
  Input,
  Textarea,
  Select,
  Checkbox,
  RadioGroup,
  FormActions,
};