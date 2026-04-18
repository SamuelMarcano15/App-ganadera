import React, { useState, useEffect } from 'react'; // <-- Agregamos useEffect
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useSyncStore } from '@/store/syncStore';
import { runFullSync } from '@/lib/syncUtils';
import { motion } from 'framer-motion';

export default function SyncStatus() {
  const { isOnline, syncStatus, pendingItemsCount } = useSyncStore();

  // --- SOLUCIÓN AL ERROR DE HIDRATACIÓN ---
  const [mounted, setMounted] = useState(false);

  // useEffect solo se ejecuta en el cliente después del primer renderizado
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSyncClick = async () => {
    if (isOnline && syncStatus !== 'SYNCING') {
      await runFullSync();
    }
  };

  // Si no ha montado (está en el servidor), renderizamos un "cascarón" vacío 
  // o un estado neutro para que el HTML coincida perfectamente
  if (!mounted) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 opacity-50 border border-transparent">
        <Cloud className="w-4 h-4 text-gray-400" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
          Cargando...
        </span>
      </div>
    );
  }

  // --- LÓGICA VISUAL (Solo se ejecuta en el navegador) ---
  let StatusIcon = Cloud;
  let statusText = '';
  let statusColor = 'text-gray-400';
  let bgColor = 'bg-gray-100';
  let isRotating = false;

  if (!isOnline) {
    StatusIcon = CloudOff;
    statusText = 'Offline 🔴';
    statusColor = 'text-red-500';
    bgColor = 'bg-red-50';
  } else if (syncStatus === 'SYNCING') {
    StatusIcon = RefreshCw;
    statusText = 'Sincronizando 🔄';
    statusColor = 'text-blue-500';
    bgColor = 'bg-blue-50';
    isRotating = true;
  } else if (pendingItemsCount > 0) {
    StatusIcon = AlertCircle;
    statusText = `Pendiente (${pendingItemsCount}) 🟡`;
    statusColor = 'text-amber-500';
    bgColor = 'bg-amber-50';
  } else if (syncStatus === 'ERROR') {
    StatusIcon = AlertCircle;
    statusText = 'Red Inestable ⚠️';
    statusColor = 'text-orange-500';
    bgColor = 'bg-orange-50';
  } else {
    StatusIcon = CheckCircle2;
    statusText = 'Respaldado 🟢';
    statusColor = 'text-emerald-600';
    bgColor = 'bg-emerald-50';
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleSyncClick}
      className={`flex items-center gap-2 px-1 sm:px-3 py-1.5 rounded-full border border-transparent transition-all shadow-sm cursor-pointer ${bgColor}`}
    >
      <div className={isRotating ? 'animate-spin' : ''}>
        <StatusIcon className={`w-3 h-3 sm:w-4 sm:h-4 ${statusColor}`} />
      </div>
      <span className={`text-[8px] sm:text-[10px] font-bold uppercase tracking-wider ${statusColor}`}>
        {statusText}
      </span>

      {pendingItemsCount > 0 && syncStatus !== 'SYNCING' && isOnline && (
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
      )}
    </motion.button>
  );
}