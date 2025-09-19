// src/components/ui/Modal.tsx
'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/cn';
import { X } from 'lucide-react';

// === TIPOS ===
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

interface ModalHeaderProps {
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
  showCloseButton?: boolean;
}

interface ModalBodyProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
  justify?: 'start' | 'center' | 'end' | 'between';
}

// === MODAL PRINCIPAL ===
const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  className,
}) => {
  // Cerrar con Escape
  useEffect(() => {
    if (!closeOnEscape) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, closeOnEscape]);

  // Prevenir scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw] max-h-[95vh]',
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleBackdropClick}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ 
              type: 'spring', 
              stiffness: 400, 
              damping: 25,
              duration: 0.3 
            }}
            className={cn(
              'relative w-full glass backdrop-blur-apple-lg rounded-apple-lg shadow-apple-xl',
              'max-h-[90vh] overflow-hidden',
              sizes[size],
              className
            )}
          >
            {/* Close Button */}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
                aria-label="Cerrar modal"
              >
                <X size={16} />
              </button>
            )}

            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// === MODAL HEADER ===
const ModalHeader: React.FC<ModalHeaderProps> = ({
  children,
  className,
  onClose,
  showCloseButton = false,
}) => (
  <div className={cn('flex items-center justify-between p-6 border-b border-white/10', className)}>
    <div className="flex-1 pr-4">{children}</div>
    {showCloseButton && onClose && (
      <button
        onClick={onClose}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
        aria-label="Cerrar modal"
      >
        <X size={16} />
      </button>
    )}
  </div>
);

// === MODAL BODY ===
const ModalBody: React.FC<ModalBodyProps> = ({
  children,
  className,
  noPadding = false,
}) => (
  <div className={cn(
    'overflow-y-auto',
    !noPadding && 'p-6',
    className
  )}>
    {children}
  </div>
);

// === MODAL FOOTER ===
const ModalFooter: React.FC<ModalFooterProps> = ({
  children,
  className,
  justify = 'end',
}) => {
  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div className={cn(
      'flex items-center gap-3 p-6 border-t border-white/10',
      justifyClasses[justify],
      className
    )}>
      {children}
    </div>
  );
};

// === MODAL TITLE ===
const ModalTitle: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <h2 className={cn('apple-h2 text-white', className)}>
    {children}
  </h2>
);

// === MODAL DESCRIPTION ===
const ModalDescription: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <p className={cn('apple-body text-apple-gray-300 mt-2', className)}>
    {children}
  </p>
);

// === CONFIRMATION MODAL ===
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  loading = false,
}) => {
  const variants = {
    danger: {
      icon: '⚠️',
      confirmVariant: 'danger' as const,
      color: 'text-apple-red-400',
    },
    warning: {
      icon: '⚠️',
      confirmVariant: 'warning' as const,
      color: 'text-apple-orange-400',
    },
    info: {
      icon: 'ℹ️',
      confirmVariant: 'primary' as const,
      color: 'text-apple-blue-400',
    },
  };

  const config = variants[variant];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalBody>
        <div className="text-center">
          <div className="text-4xl mb-4">{config.icon}</div>
          <ModalTitle className="mb-2">{title}</ModalTitle>
          {description && (
            <ModalDescription>{description}</ModalDescription>
          )}
        </div>
      </ModalBody>
      <ModalFooter justify="center">
        <button
          onClick={onClose}
          disabled={loading}
          className="btn-secondary"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`btn-${config.confirmVariant}`}
        >
          {loading ? 'Procesando...' : confirmText}
        </button>
      </ModalFooter>
    </Modal>
  );
};

// === ALERT MODAL ===
interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  variant?: 'success' | 'error' | 'warning' | 'info';
  buttonText?: string;
}

const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  variant = 'info',
  buttonText = 'Entendido',
}) => {
  const variants = {
    success: { icon: '✅', color: 'text-apple-green-400' },
    error: { icon: '❌', color: 'text-apple-red-400' },
    warning: { icon: '⚠️', color: 'text-apple-orange-400' },
    info: { icon: 'ℹ️', color: 'text-apple-blue-400' },
  };

  const config = variants[variant];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalBody>
        <div className="text-center">
          <div className="text-4xl mb-4">{config.icon}</div>
          <ModalTitle className={cn('mb-2', config.color)}>{title}</ModalTitle>
          {description && (
            <ModalDescription>{description}</ModalDescription>
          )}
        </div>
      </ModalBody>
      <ModalFooter justify="center">
        <button onClick={onClose} className="btn-primary">
          {buttonText}
        </button>
      </ModalFooter>
    </Modal>
  );
};

export {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalTitle,
  ModalDescription,
  ConfirmationModal,
  AlertModal,
};
