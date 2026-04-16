import React, { Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Briefcase } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

// Importaciones Core
import { db } from '@/lib/db';
import HealthForm from '@/components/inventario/HealthForm';

// 1. EL CONTENIDO PRINCIPAL SEPARADO PARA LEER LA URL
function TratamientoContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const animalId = searchParams.get("id"); // Leemos el ID desde ?id=...

  // --- CONSULTAS REACTIVAS (DEXIE) ---
  const animal = useLiveQuery(() => {
    if (animalId) return db.animals.get(animalId);
    return null;
  }, [animalId]);

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
          <h1 className="font-sans text-lg font-bold text-[#1A3621]">Registros de salud</h1>
        </div>
      </header>
      {/* Hero Section */}
      <section className="px-5 mt-6 mb-8 sm:px-6 sm:mt-8 sm:mb-10 max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-3">
          <Briefcase size={14} strokeWidth={2.5} className="text-[#1A3621]" />
          <span className="font-sans text-xs font-bold uppercase tracking-widest text-[#1A3621]">
            GESTIÓN GANADERA
          </span>
        </div>

        <span className="font-display text-[2.5rem] sm:text-5xl leading-[1.05] font-extrabold text-[#1A3621] mb-3 block">
          Registrar<br className="sm:hidden" /> Tratamiento
        </span>

        <p className="font-sans text-base font-medium text-gray-500 leading-relaxed max-w-[500px] sm:max-w-2xl mt-4">
          Ingrese los detalles del protocolo médico para actualizar el historial del ejemplar.
          Registrar información veraz ayuda al control total de la rentabilidad y calidad.
        </p>
      </section>

      {/* Dashboard Form Layout */}
      <section className="px-5 sm:px-6 space-y-6 sm:space-y-10 max-w-2xl mx-auto">
        <HealthForm
          animal={animal}
          onSubmitSuccess={() => navigate(`/inventario/perfil?id=${animalId}&tab=health`)}
          onCancel={() => navigate(-1)}
        />
      </section>
    </main>
  );
}

// 2. EXPORTAMOS LA PÁGINA ENVUELTA EN SUSPENSE PARA EL CACHÉ OFFLINE
export default function PerfilTratamientoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8F9F5] flex flex-col items-center justify-center text-[#1A3621]">
        <Loader2 className="w-10 h-10 animate-spin mb-4" />
        <p className="font-bold uppercase tracking-widest text-xs opacity-60">Preparando formulario...</p>
      </div>
    }>
      <TratamientoContent />
    </Suspense>
  );
}
