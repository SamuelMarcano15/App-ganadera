import { create } from 'zustand';

export const useSyncStore = create((set) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  syncStatus: 'IDLE',
  pendingItemsCount: 0,

  // Acciones
  setOnline: (isOnline) => set({ isOnline }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  setPendingItemsCount: (pendingItemsCount) => set({ pendingItemsCount }),
  
  // Helper para inicialización
  initSyncStore: () => {
    if (typeof window !== 'undefined') {
      set({ isOnline: navigator.onLine });
    }
  },
}));
