import React, { useState, useEffect, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Users } from "lucide-react";
import { db } from "@/lib/db";
import HealthForm from "@/components/inventario/HealthForm";

function LoteContent() {
  const navigate = useNavigate();
  const [animalIds, setAnimalIds] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedIds = sessionStorage.getItem('batchAnimalIds');
    if (!storedIds) {
      navigate('/inventario');
      return;
    }

    try {
      const ids = JSON.parse(storedIds);
      if (!Array.isArray(ids) || ids.length === 0) {
        navigate('/inventario');
        return;
      }
      setAnimalIds(ids);
      
      // Cargar animales desde Dexie
      db.animals.where('id').anyOf(ids).toArray()
        .then(res => {
          setAnimals(res.filter(a => !a.deleted_at));
          setLoading(false);
        })
        .catch(err => {
          console.error("Error cargando animales para lote:", err);
          setLoading(false);
        });
        
    } catch (e) {
      console.error("Error parseando batchAnimalIds:", e);
      navigate('/inventario');
    }
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9F5] flex flex-col items-center justify-center text-[#1A3621]">
        <Loader2 className="w-10 h-10 animate-spin mb-4" />
        <p className="font-bold uppercase tracking-widest text-xs opacity-60">Preparando lote de animales...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F9F5] font-sans pb-40 relative transition-all">
      {/* HEADER */}
      <header className="flex items-center justify-between px-5 pt-6 pb-4 sticky top-0 bg-[#F8F9F5]/90 backdrop-blur-md z-30 border-b border-gray-100/50">
        <div className="flex items-center gap-3">
          <button 
            type="button" 
            onClick={() => navigate(-1)} 
            className="p-1 -ml-1 rounded-full hover:bg-black/5 transition-colors cursor-pointer"
          >
            <ArrowLeft size={24} className="text-[#1A3621]" strokeWidth={2.5} />
          </button>
          <h1 className="font-sans text-lg font-bold text-[#1A3621]">Vacunación por Lotes</h1>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-5 mt-6 mb-8 sm:px-6 sm:mt-8 sm:mb-10 max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-3">
          <Users size={14} strokeWidth={2.5} className="text-[#1A3621]" />
          <span className="font-sans text-xs font-bold uppercase tracking-widest text-[#1A3621]">
            MODO MASIVO ({animals.length} ANIMALES)
          </span>
        </div>

        <h2 className="font-display text-[2.5rem] sm:text-5xl leading-[1.05] font-extrabold text-[#1A3621] mb-3 block">
          Registrar<br className="sm:hidden" /> Tratamiento Colectivo
        </h2>

        <p className="font-sans text-base font-medium text-gray-500 leading-relaxed max-w-[500px] sm:max-w-2xl mt-4">
          Estás aplicando el mismo protocolo médico a un grupo de animales seleccionados. 
          Se creará un registro individual en el historial de cada ejemplar.
        </p>

        {/* Resumen de animales seleccionados */}
        <div className="mt-8 flex flex-wrap gap-2">
          {animals.map(a => (
            <div 
              key={a.id} 
              className="bg-[#1A3621] text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm"
            >
              #{a.number}
            </div>
          ))}
        </div>
      </section>

      {/* FormLayout */}
      <section className="px-5 sm:px-6 space-y-6 sm:space-y-10 max-w-2xl mx-auto">
        <HealthForm
          batchAnimalIds={animalIds}
          onSubmitSuccess={() => {
            sessionStorage.removeItem('batchAnimalIds');
            navigate('/inventario');
          }}
          onCancel={() => navigate(-1)}
        />
      </section>
    </main>
  );
}

// 2. EXPORTAMOS LA PÁGINA ENVUELTA EN SUSPENSE PARA EL CACHÉ OFFLINE
export default function TratamientoLotePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8F9F5] flex flex-col items-center justify-center text-[#1A3621]">
        <Loader2 className="w-10 h-10 animate-spin mb-4" />
        <p className="font-bold uppercase tracking-widest text-xs opacity-60">Preparando lote...</p>
      </div>
    }>
      <LoteContent />
    </Suspense>
  );
}
