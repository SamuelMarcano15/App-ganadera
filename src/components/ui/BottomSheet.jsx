import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * BottomSheet: Modal responsivo.
 * - Mobile: Desliza desde abajo (Bottom Sheet).
 * - sm+: Flotante centrado (Modal).
 */
export default function BottomSheet({ 
  isOpen, 
  onClose, 
  title, 
  description, 
  children 
}) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth >= 640); // 640px es el breakpoint 'sm' de Tailwind
    };

    checkIsDesktop();
    window.addEventListener('resize', checkIsDesktop);
    return () => window.removeEventListener('resize', checkIsDesktop);
  }, []);

  // Bloquear el scroll del body
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Variantes para móvil (Bottom Sheet)
  const mobileVariants = {
    initial: { y: '100%', opacity: 1 },
    animate: { y: 0, opacity: 1 },
    exit: { y: '100%', opacity: 1 }
  };

  // Variantes para escritorio (Modal Centrado)
  const desktopVariants = {
    initial: { opacity: 0, scale: 0.9, y: '-45%', x: '-50%' },
    animate: { opacity: 1, scale: 1, y: '-50%', x: '-50%' },
    exit: { opacity: 0, scale: 0.95, y: '-45%', x: '-50%' }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay / Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]"
          />

          {/* Sheet/Modal Container */}
          <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            variants={isDesktop ? desktopVariants : mobileVariants}
            transition={isDesktop 
              ? { type: 'spring', damping: 25, stiffness: 300 }
              : { type: 'spring', damping: 25, stiffness: 200 }
            }
            drag={!isDesktop ? "y" : false}
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (!isDesktop && (info.offset.y > 150 || info.velocity.y > 500)) {
                onClose();
              }
            }}
            className={`fixed z-50 flex flex-col bg-white shadow-2xl overflow-hidden
              ${isDesktop 
                ? 'top-1/2 left-1/2 w-[95%] max-w-lg max-h-[85dvh] rounded-3xl' 
                : 'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[2.5rem]'
              }`}
          >
            {/* Handle / Grip (Solo móvil) */}
            {!isDesktop && (
              <div className="w-full flex justify-center py-4 cursor-grab active:cursor-grabbing">
                <div className="w-12 h-1.5 bg-neutral-200 rounded-full" />
              </div>
            )}

            {/* Header */}
            <div className={`px-6 pt-4 sm:pt-6 pb-4 ${isDesktop ? 'border-b border-neutral-50' : ''}`}>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xl font-bold text-neutral-900">{title}</h2>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-neutral-500" />
                </button>
              </div>
              {description && (
                <p className="text-sm text-neutral-500">{description}</p>
              )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-6 pb-8 sm:pb-10 pt-4">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
