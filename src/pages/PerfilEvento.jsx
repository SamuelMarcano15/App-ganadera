import React, { Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

// Importaciones Core
import { db } from '@/lib/db';
import EventForm from '@/components/inventario/EventForm';

// 1. EL CONTENIDO PRINCIPAL SEPARADO PARA LEER LA URL
function EventoContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const animalId = searchParams.get("id"); // Leemos el ID de la URL

  // --- CONSULTAS REACTIVAS (DEXIE) ---
  const animal = useLiveQuery(() => {
    if (animalId) return db.animals.get(animalId);
    return null;
  }, [animalId]);
  
  const existingEvents = useLiveQuery(
    () => {
      if (!animalId) return [];
      return db.growth_events
        .where('animal_id').equals(animalId)
        .and(e => !e.deleted_at)
        .toArray();
    },
    [animalId]
  );

  // --- GUARDS DE CARGA ---
  if (animal === undefined || !animalId) {
    return (
      <div className="min-h-screen bg-[#F8F9F5] flex flex-col items-center justify-center text-[#1A3621]">
        <Loader2 className="w-10 h-10 animate-spin mb-4" />
        <p className="font-bold uppercase tracking-widest text-xs opacity-60">Cargando datos del animal...</p>
      </div>
    );
  }

  if (animal === null) {
    return (
      <div className="min-h-screen bg-[#F8F9F5] flex flex-col items-center justify-center text-[#1A3621] px-6 text-center">
        <h2 className="text-2xl font-black mb-2">Animal no encontrado</h2>
        <p className="text-sm text-neutral-500 mb-6 font-medium">No se pudo cargar la información para este registro.</p>
        <button onClick={() => navigate(-1)} className="bg-[#1A3621] text-white px-8 py-3 rounded-full font-bold text-sm cursor-pointer">VOLVER</button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F9F5] font-sans pb-40 relative transition-all">
      {/* HEADER */}
      <header className="flex items-center justify-between px-5 pt-6 pb-4 sticky top-0 bg-[#F8F9F5]/90 backdrop-blur-md z-30 border-b border-gray-100/50">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="p-1 -ml-1 rounded-full hover:bg-black/5 transition-colors cursor-pointer">
            <ArrowLeft size={24} className="text-[#1A3621]" strokeWidth={2.5} />
          </button>
          <h1 className="font-sans text-lg font-bold text-[#1A3621]">Registrar Evento</h1>
        </div>
      </header>

      {/* FORMULARIO WRAPPER */}
      <div className="px-5 mt-6 max-w-2xl mx-auto">
        <EventForm 
          animal={animal}
          existingEvents={existingEvents || []}
          onSubmitSuccess={() => navigate(`/inventario/perfil?id=${animalId}&tab=evolution`)}
          onCancel={() => navigate(-1)}
        />
      </div>
    </main>
  );
}

// 2. EXPORTAMOS LA PÁGINA ENVUELTA EN SUSPENSE PARA EL CACHÉ OFFLINE
export default function PerfilEventoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8F9F5] flex flex-col items-center justify-center text-[#1A3621]">
        <Loader2 className="w-10 h-10 animate-spin mb-4" />
        <p className="font-bold uppercase tracking-widest text-xs opacity-60">Preparando formulario...</p>
      </div>
    }>
      <EventoContent />
    </Suspense>
  );
}
