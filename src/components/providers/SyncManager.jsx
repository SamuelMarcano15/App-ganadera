
import { useEffect, useRef } from 'react';
import { useSyncStore } from '@/store/syncStore';
import { runFullSync } from '@/lib/syncUtils';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';

export default function SyncManager() {
  const { setOnline, setPendingItemsCount } = useSyncStore();
  const isSyncing = useRef(false); // <-- CANDADO ANTIRREBOTE

  const pendingCount = useLiveQuery(
    () => db.sync_queue.where('status').equals('PENDING').count(),
    [],
    0
  );

  useEffect(() => {
    setPendingItemsCount(pendingCount);
    
    // Solo programar sync si estamos online Y hay items pendientes
    if (typeof navigator !== 'undefined' && navigator.onLine && pendingCount > 0) {
      const debounce = setTimeout(() => triggerSync(), 2000);
      return () => clearTimeout(debounce);
    }
  }, [pendingCount, setPendingItemsCount]);

  // Función envoltorio para proteger con el candado
  const triggerSync = async () => {
    if (isSyncing.current) return; // Si ya está sincronizando, ignora la orden
    isSyncing.current = true;
    try {
      await runFullSync();
    } catch (error) {
      console.error('[Sync Engine] Error catastrófico en la sincronización:', error);
    } finally {
      isSyncing.current = false; // Libera el candado al terminar (o fallar)
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      console.log('[Sync Engine] Online recuperado. Iniciando...');
      setOnline(true);
      triggerSync();
    };
    
    const handleOffline = () => {
      console.log('[Sync Engine] Offline activo.');
      setOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      triggerSync();
    }

    const interval = setInterval(() => {
      if (navigator.onLine) {
        console.log('[Sync Engine] Polling automático (5min)...');
        triggerSync();
      }
    }, 1000 * 60 * 5);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [setOnline]);

  return null;
}