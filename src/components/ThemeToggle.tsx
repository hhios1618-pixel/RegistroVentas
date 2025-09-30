'use client';

import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useMemo } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils/cn';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === 'dark';
  const label = useMemo(() => (isDark ? 'Modo oscuro' : 'Modo claro'), [isDark]);

  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      onClick={toggleTheme}
      whileTap={{ scale: 0.96 }}
      className={cn(
        'inline-flex items-center gap-3 rounded-xl px-3 py-2 self-start',
        'transition-colors duration-500 ease-apple shadow-[0_10px_22px_rgba(15,23,42,0.1)]',
        'bg-[color:var(--toggle-bg)] text-[color:var(--toggle-fg)]',
        'dark:bg-white/10 dark:text-white/80 dark:shadow-[0_10px_26px_rgba(0,0,0,0.45)]',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-lg transition-colors duration-500',
            'bg-white text-apple-gray-700 shadow-[0_6px_14px_rgba(15,23,42,0.12)]',
            'dark:bg-black dark:text-white/80 dark:shadow-[0_6px_14px_rgba(0,0,0,0.45)]'
          )}
        >
          <motion.div
            key={isDark ? 'moon' : 'sun'}
            initial={{ opacity: 0, rotate: isDark ? -10 : 10, y: 4 }}
            animate={{ opacity: 1, rotate: 0, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {isDark ? <Moon size={14} strokeWidth={1.6} /> : <Sun size={16} strokeWidth={1.6} />}
          </motion.div>
        </div>
        <div className="flex flex-col text-left">
          <span className="text-apple-caption font-medium opacity-70">Tema</span>
          <span className="text-[15px] leading-none font-semibold tracking-apple-tight">
            {isDark ? 'Noche' : 'Día'}
          </span>
        </div>
      </div>
      <motion.div
        layout
        className="ml-3 relative h-5 w-10 rounded-full border border-[color:var(--toggle-indicator-border)] bg-[color:var(--toggle-indicator-bg)] transition-colors duration-500"
      >
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute left-[4px] top-1/2 h-[16px] w-[16px] -translate-y-1/2 rounded-full bg-white shadow-[0_4px_10px_rgba(15,23,42,0.18)] dark:bg-black dark:shadow-[0_4px_10px_rgba(0,0,0,0.45)]"
          animate={{ x: isDark ? 13 : 0 }}
        />
      </motion.div>
    </motion.button>
  );
}
