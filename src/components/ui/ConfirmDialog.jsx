import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

/**
 * ConfirmDialog — Modal de confirmación estilizado
 *
 * Props:
 *   isOpen      — Controla la visibilidad del diálogo
 *   title       — Título del diálogo
 *   description — Mensaje descriptivo
 *   confirmText — Texto del botón de confirmación (default: 'Confirmar')
 *   cancelText  — Texto del botón de cancelación (default: 'Cancelar')
 *   onConfirm   — Handler al presionar confirmar
 *   onCancel    — Handler al presionar cancelar o cerrar
 *   isDanger    — Si es true, usa tonos rojos de advertencia/error (default: false)
 */
export default function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  isDanger = false
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-[3px]"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="pointer-events-auto w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-neutral-100 flex flex-col p-6 sm:p-8"
            >
              {/* Header Icon / Close button */}
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-2xl ${isDanger ? 'bg-error-container text-on-error-container' : 'bg-secondary-fixed text-on-secondary-container'}`}>
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <button
                  onClick={onCancel}
                  className="p-2 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 text-neutral-400 hover:text-neutral-600" />
                </button>
              </div>

              {/* Title & Description */}
              <h3 className="text-xl sm:text-2xl font-black text-neutral-900 leading-tight mb-2 font-display">
                {title}
              </h3>
              <p className="text-sm font-medium text-neutral-500 leading-relaxed mb-6 font-sans">
                {description}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  onClick={onCancel}
                  className="w-full order-2 sm:order-1 px-6 py-4 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-black uppercase tracking-widest transition-all cursor-pointer text-center"
                >
                  {cancelText}
                </button>
                <button
                  onClick={onConfirm}
                  className={`w-full order-1 sm:order-2 px-6 py-4 rounded-full text-white text-xs font-black uppercase tracking-widest transition-all cursor-pointer text-center shadow-lg ${
                    isDanger
                      ? 'bg-error hover:bg-red-800 shadow-red-500/10'
                      : 'bg-primary hover:bg-[#2d4b2d] shadow-emerald-900/10'
                  }`}
                >
                  {confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
