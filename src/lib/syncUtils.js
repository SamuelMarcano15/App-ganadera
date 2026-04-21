import { db } from './db';
import { supabase } from './supabaseClient';
import { useSyncStore } from '@/store/syncStore';
import { uploadImageToSupabase } from './imageUtils';

let isSyncing = false;

// Helper para timeout en promesas
const withTimeout = (promise, ms = 8000) => {
  const timeout = new Promise((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new Error('TIMEOUT_EXCEEDED'));
    }, ms);
  });
  return Promise.race([promise, timeout]);
};

/**
 * 1. PUSH: De local a la Nube.
 */
export async function processSyncQueue() {
  const pendingItems = await db.sync_queue
    .where('status')
    .anyOf(['PENDING', 'ERROR'])
    .sortBy('created_at');

  if (pendingItems.length === 0) return;

  const store = useSyncStore.getState();
  store.setPendingItemsCount(pendingItems.length);

  for (const item of pendingItems) {
    try {
      const payloadToUpload = { ...item.payload };

      // --- IMÁGENES ---
      if (payloadToUpload.photo_blob && !payloadToUpload.photo_path) {
        try {
          const fileName = `offline-sync-${item.table_name}-${payloadToUpload.id}`;
          const url = await uploadImageToSupabase(payloadToUpload.photo_blob, fileName);
          payloadToUpload.photo_path = url;
          await db.table(item.table_name).update(payloadToUpload.id, { photo_path: url });
        } catch (imgErr) {
          throw new Error(`Error de red/auth al subir imagen: ${imgErr.message}`);
        }
      }

      delete payloadToUpload.photo_blob;

      // --- SUBIDA A BASE DE DATOS ---
      let error;
      if (item.operation === 'INSERT' || item.operation === 'UPDATE') {
        const { error: upsertError } = await supabase.from(item.table_name).upsert(payloadToUpload);
        error = upsertError;
      } else if (item.operation === 'DELETE') {
        const { error: deleteError } = await supabase.from(item.table_name).delete().eq('id', item.payload.id);
        error = deleteError;
      }

      if (error) throw error;

      // Éxito: Eliminar de la cola local
      await db.sync_queue.delete(item.id);

      const currentCount = await db.sync_queue.where('status').anyOf(['PENDING', 'ERROR']).count();
      store.setPendingItemsCount(currentCount);

    } catch (err) {
      // FASE 4: CAPTURA INTELIGENTE DE ERRORES
      const errMsg = (err.message || '').toLowerCase();

      // Siempre lo devolvemos a PENDING (no a ERROR) para que la UI no se asuste
      await db.sync_queue.update(item.id, {
        status: 'PENDING',
        error_message: err.message || 'Error desconocido, se reintentará'
      });

      // Si el error es de sesión caducada (JWT), permisos (401), o falta de red real (fetch)
      // ABORTAMOS el bucle silenciosamente. No tiene sentido intentar subir los demás.
      if (errMsg.includes('jwt') || errMsg.includes('auth') || errMsg.includes('fetch') || err.code === 'PGRST301' || err.status === 401) {
        console.warn('[Sync Engine] Sesión caducada o red inaccesible. Sincronización pausada silenciosamente.');
        break; // Rompe el ciclo for. El resto de items se quedan PENDING.
      }

      // Si es otro tipo de error (ej. dato mal formateado), continúa con el siguiente item
      continue;
    }
  }
}

/**
 * 2. PULL: De Nube a Local
 */
export async function pullFromServer() {
  // FASE 4: Validar sesión de forma segura y silenciosa (con Timeout)
  let session;
  try {
    const { data } = await withTimeout(supabase.auth.getSession(), 6000);
    session = data?.session;
  } catch (err) {
    console.warn('[Sync Engine] PULL abortado por timeout o error de sesión:', err.message);
    return;
  }

  // Si no hay sesión válida
  if (!session?.user) {
    console.warn('[Sync Engine] PULL abortado: No hay sesión activa en el servidor.');
    return;
  }

  const user = session.user;
  const lastSync = localStorage.getItem('lastSyncTimestamp') || '1970-01-01T00:00:00Z';
  const currentSyncTime = new Date().toISOString();

  const tables = ['animals', 'growth_events', 'services', 'pregnancy_checks', 'health_records'];

  for (const table of tables) {
    const { data: serverData, error } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', user.id)
      .gt('updated_at', lastSync);

    // Si la descarga falla (ej. pérdida súbita de señal), abortar
    if (error) {
      console.warn(`[Sync Engine] Error descargando ${table}:`, error.message);
      return;
    }

    if (serverData && serverData.length > 0) {
      for (const record of serverData) {
        if ((table === 'animals' || table === 'growth_events') && record.photo_path) {
          try {
            const response = await fetch(record.photo_path);
            if (response.ok) {
              record.photo_blob = await response.blob();
            }
          } catch (imgErr) {
            // Ignorar silenciosamente, la imagen se intentará cargar por URL luego
          }
        }
        await db.table(table).put(record);
      }
    }
  }
  localStorage.setItem('lastSyncTimestamp', currentSyncTime);
}

/**
 * 3. MASTER SYNC: El Orquestador. 
 */
export async function runFullSync() {
  const store = useSyncStore.getState();

  if (!navigator.onLine) {
    if (store.syncStatus !== 'IDLE') store.setSyncStatus('IDLE');
    return;
  }

  if (isSyncing || store.syncStatus === 'SYNCING') return;

  isSyncing = true;
  store.setSyncStatus('SYNCING');

  let hasErrors = false;

  try {
    await processSyncQueue();
  } catch (err) {
    hasErrors = true;
  }

  try {
    await pullFromServer();
  } catch (err) {
    hasErrors = true;
  }

  try {
    const errorCount = await db.sync_queue.where('status').equals('ERROR').count();
    const pendingCount = await db.sync_queue.where('status').equals('PENDING').count();

    // Si quedaron items PENDING (porque pausamos por JWT expirado), no lo marcamos como error,
    // simplemente lo volvemos IDLE para que el usuario no vea advertencias rojas innecesarias.
    if (errorCount > 0 || hasErrors) {
      store.setSyncStatus('ERROR');
    } else if (pendingCount > 0) {
      store.setSyncStatus('IDLE');
    } else {
      store.setSyncStatus('UP_TO_DATE');
      setTimeout(() => {
        if (useSyncStore.getState().syncStatus === 'UP_TO_DATE') {
          useSyncStore.getState().setSyncStatus('IDLE');
        }
      }, 3000);
    }
  } finally {
    isSyncing = false;
  }
}

/**
 * Helper para agregar a la cola
 */
export async function addToSyncQueue(table_name, operation, payload) {
  await db.sync_queue.add({
    table_name,
    operation,
    payload,
    created_at: new Date().toISOString(),
    status: 'PENDING'
  });

  if (navigator.onLine) {
    setTimeout(() => {
      runFullSync();
    }, 500);
  }
}