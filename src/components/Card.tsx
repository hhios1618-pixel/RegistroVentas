// src/components/Card.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

// === CARD PRINCIPAL ===
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: 'default' | 'elevated' | 'outlined' | 'glass';
    hover?: boolean;
    animate?: boolean;
  }
>(({ className, variant = 'default', hover = false, animate = true, ...props }, ref) => {
  const variants = {
    default: 'glass-card',
    elevated: 'glass-card shadow-apple-lg',
    outlined: 'bg-white/5 border-2 border-white/20 rounded-apple p-apple',
    glass: 'glass backdrop-blur-apple-lg rounded-apple p-apple',
  };

  const Component = animate ? motion.div : 'div';
  const motionProps = animate ? {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, ease: 'easeOut' },
    ...(hover && {
      whileHover: { scale: 1.02, y: -4 },
      transition: { type: 'spring', stiffness: 400, damping: 25 }
    })
  } : {};

  return (
    <Component
      ref={ref}
      className={cn(
        variants[variant],
        'pointer-events-auto',
        hover && 'cursor-pointer transition-all duration-300',
        className
      )}
      {...motionProps}
      {...props}
    />
  );
});
Card.displayName = 'Card';

// === HEADER ===
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    centered?: boolean;
  }
>(({ className, centered = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex flex-col space-y-2 pb-4',
      centered && 'text-center items-center',
      className
    )}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

// === TÍTULO ===
const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement> & {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    gradient?: boolean;
  }
>(({ className, size = 'md', gradient = false, ...props }, ref) => {
  const sizes = {
    sm: 'apple-h3',
    md: 'apple-h2',
    lg: 'apple-h1',
    xl: 'text-apple-large-title',
  };

  return (
    <h3
      ref={ref}
      className={cn(
        sizes[size],
        'text-white font-semibold tracking-apple-tight',
        gradient && 'bg-gradient-to-r from-apple-blue-400 to-apple-green-400 bg-clip-text text-transparent',
        className
      )}
      {...props}
    />
  );
});
CardTitle.displayName = 'CardTitle';

// === DESCRIPCIÓN ===
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & {
    muted?: boolean;
  }
>(({ className, muted = true, ...props }, ref) => (
  <p 
    ref={ref} 
    className={cn(
      'apple-body',
      muted ? 'text-apple-gray-400' : 'text-white',
      className
    )} 
    {...props} 
  />
));
CardDescription.displayName = 'CardDescription';

// === CONTENIDO ===
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    noPadding?: boolean;
  }
>(({ className, noPadding = false, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn(
      !noPadding && 'py-4',
      className
    )} 
    {...props} 
  />
));
CardContent.displayName = 'CardContent';

// === FOOTER ===
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    justify?: 'start' | 'center' | 'end' | 'between';
  }
>(({ className, justify = 'start', ...props }, ref) => {
  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div
      ref={ref}
      className={cn(
        'flex items-center pt-4 gap-3',
        justifyClasses[justify],
        className
      )}
      {...props}
    />
  );
});
CardFooter.displayName = 'CardFooter';

// === COMPONENTES ESPECIALIZADOS ===

// Card con icono
const IconCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    icon: React.ReactNode;
    title: string;
    description?: string;
    color?: 'blue' | 'green' | 'orange' | 'purple' | 'red';
  }
>(({ icon, title, description, color = 'blue', className, ...props }, ref) => {
  const colorClasses = {
    blue: 'from-apple-blue-500/20 to-apple-blue-600/10 border-apple-blue-500/30 text-apple-blue-400',
    green: 'from-apple-green-500/20 to-apple-green-600/10 border-apple-green-500/30 text-apple-green-400',
    orange: 'from-apple-orange-500/20 to-apple-orange-600/10 border-apple-orange-500/30 text-apple-orange-400',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
    red: 'from-apple-red-500/20 to-apple-red-600/10 border-apple-red-500/30 text-apple-red-400',
  };

  return (
    <Card ref={ref} hover animate className={cn('', className)} {...props}>
      <CardHeader>
        <div className={`p-3 bg-gradient-to-br ${colorClasses[color]} rounded-apple border w-fit`}>
          <div className="text-xl">{icon}</div>
        </div>
        <CardTitle size="sm">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
    </Card>
  );
});
IconCard.displayName = 'IconCard';

// Card de estadística
const StatCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    title: string;
    value: string | number;
    change?: number;
    icon?: React.ReactNode;
    color?: 'blue' | 'green' | 'orange' | 'purple' | 'red';
  }
>(({ title, value, change, icon, color = 'blue', className, ...props }, ref) => {
  const colorClasses = {
    blue: 'from-apple-blue-500/20 to-apple-blue-600/10 border-apple-blue-500/30 text-apple-blue-400',
    green: 'from-apple-green-500/20 to-apple-green-600/10 border-apple-green-500/30 text-apple-green-400',
    orange: 'from-apple-orange-500/20 to-apple-orange-600/10 border-apple-orange-500/30 text-apple-orange-400',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
    red: 'from-apple-red-500/20 to-apple-red-600/10 border-apple-red-500/30 text-apple-red-400',
  };

  return (
    <Card ref={ref} hover animate className={cn('', className)} {...props}>
      <CardContent>
        <div className="flex items-start justify-between mb-4">
          {icon && (
            <div className={`p-2 bg-gradient-to-br ${colorClasses[color]} rounded-apple border`}>
              <div className="text-lg">{icon}</div>
            </div>
          )}
          {typeof change === 'number' && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-apple-caption2 font-semibold ${
              change >= 0 
                ? 'bg-apple-green-500/20 text-apple-green-300 border border-apple-green-500/30' 
                : 'bg-apple-red-500/20 text-apple-red-300 border border-apple-red-500/30'
            }`}>
              <span>{change >= 0 ? '+' : ''}{change.toFixed(1)}%</span>
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <p className="apple-caption text-apple-gray-400">{title}</p>
          <p className="apple-h2 text-white font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
});
StatCard.displayName = 'StatCard';

export { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent,
  IconCard,
  StatCard
};
