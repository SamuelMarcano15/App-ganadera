import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, List, TrendingUp, ShieldPlus, Share2, Baby, Loader2 } from 'lucide-react';
import { FaVenusMars } from 'react-icons/fa6';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

// Importación de Módulos (Tabs)
import DetailsTab from '@/components/DetailsTab';
import EvolutionTab from '@/components/EvolutionTab';
import HealthTab from '@/components/HealthTab';
import GenealogyTab from '@/components/GenealogyTab';
import ReproductionTab from '@/components/ReproductionTab';

// UI Components
import BottomSheet from '@/components/ui/BottomSheet';
import AnimalForm from '@/components/inventario/AnimalForm';
import { AnimatePresence } from 'framer-motion';

function ProfileContent() {
  const [searchParams] = useSearchParams();
  // CAPTURAMOS EL ID Y EL TAB DIRECTAMENTE DE LA URL (?id=...&tab=...)
  const animalId = searchParams.get("id"); 
  const initialTab = searchParams.get("tab") || 'details';
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // --- SISTEMA DE MODAL RECURSIVO (idéntico a NuevoAnimal.jsx) ---
  const [modalStack, setModalStack] = useState([]);

  const handleOpenModal = useCallback((sex, onSelect) => {
    setModalStack(prev => [...prev, { id: crypto.randomUUID(), sex, onSelect }]);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalStack(prev => prev.slice(0, -1));
  }, []);

  const handleModalSuccess = useCallback((newAnimalId) => {
    setModalStack(prev => {
      if (prev.length === 0) return prev;
      const currentModal = prev[prev.length - 1];
      if (currentModal && typeof currentModal.onSelect === 'function') {
        currentModal.onSelect(newAnimalId);
      }
      return prev.slice(0, -1);
    });
  }, []);
  // ------------------------------------------------

  // Consulta reactiva a Dexie usando el ID de la URL
  const animal = useLiveQuery(() => {
    if (animalId) return db.animals.get(animalId);
    return null;
  }, [animalId]);

  // Sincronizar el tab si cambia en la URL
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  // Mientras carga el animal inicial o si no hay ID en la URL
  if (animal === undefined || !animalId) {
    return (
      <div className="min-h-screen bg-[#F7F7F2] flex flex-col items-center justify-center text-[#1B4820]">
        <Loader2 className="w-10 h-10 animate-spin mb-4" />
        <p className="font-bold uppercase tracking-widest text-xs opacity-60">Cargando Ficha...</p>
      </div>
    );
  }

  // Si el animal no existe en Dexie
  if (animal === null) {
    return (
      <div className="min-h-screen bg-[#F7F7F2] flex flex-col items-center justify-center text-[#1B4820] px-6 text-center">
        <h2 className="text-2xl font-black mb-2">Animal no encontrado</h2>
        <p className="text-sm text-neutral-500 mb-6 font-medium">El registro que buscas no existe o fue eliminado.</p>
        <Link to="/inventario" className="bg-[#1B4820] text-white px-8 py-3 rounded-full font-bold text-sm">
          VOLVER AL INVENTARIO
        </Link>
      </div>
    );
  }

  const navItems = [
    { id: 'details', label: 'Detalles', icon: List },
    { id: 'evolution', label: 'Evolución', icon: TrendingUp },
    { id: 'health', label: 'Salud', icon: ShieldPlus },
  ];

  if (animal.sex === 'Hembra') {
    navItems.push({ id: 'reproduction', label: 'Reproducción', icon: FaVenusMars });
  }

  navItems.push({ id: 'genealogy', label: 'Genealogía', icon: Share2 });

  return (
    <main className="min-h-screen bg-[#F7F7F2] font-sans pb-24 md:pb-8 relative">
      {/* HEADER FIJO */}
      <header className="bg-[#F7F7F2] px-4 py-4 sticky top-0 z-30 flex items-center gap-4 border-b border-neutral-100 md:border-none">
        <Link to="/inventario" className="p-2 -ml-2 hover:bg-neutral-200 rounded-full transition-colors cursor-pointer">
          <ArrowLeft className="w-6 h-6 text-[#1B4820]" />
        </Link>
        <h1 className="text-xl font-bold text-[#1B4820]">
          {activeTab === 'details' ? 'Ficha del Animal' :
            activeTab === 'evolution' ? 'Evolución del Animal' :
              activeTab === 'health' ? 'Carnet de Salud' :
                activeTab === 'reproduction' ? 'Registro Reproductivo' : 'Genealogía'}
        </h1>
      </header>

      <div className="max-w-6xl mx-auto">
        {/* NAVEGACIÓN DESKTOP */}
        <nav className="hidden md:flex items-center justify-center gap-8 border-b border-neutral-200 mb-6 px-8 sticky top-[72px] bg-[#F7F7F2] z-20 pt-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center cursor-pointer gap-2 pb-3 -mb-[2px] transition-colors border-b-2 font-bold uppercase tracking-widest text-xs ${activeTab === item.id ? 'text-[#1B4820] border-[#1B4820]' : 'text-neutral-400 border-transparent hover:text-[#1B4820]'
                }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* CONTENIDO DINÁMICO */}
        <div className="px-4">
          {activeTab === 'details' && <DetailsTab animal={animal} onEdit={() => setIsEditModalOpen(true)} />}
          {activeTab === 'evolution' && <EvolutionTab animal={animal} />}
          {activeTab === 'health' && <HealthTab animal={animal} />}
          {activeTab === 'reproduction' && <ReproductionTab animal={animal} />}
          {activeTab === 'genealogy' && <GenealogyTab animal={animal} />}
        </div>
      </div>

      {/* BOTTOM NAV (Móvil) */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-neutral-200 px-4 py-3 md:hidden z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-center max-w-sm mx-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 flex-1 transition-colors cursor-pointer ${activeTab === item.id ? 'text-[#1B4820]' : 'text-neutral-400'
                }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-[8px] font-bold uppercase tracking-wider text-center whitespace-nowrap">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* MODAL DE EDICIÓN */}
      <BottomSheet
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Animal"
        description={`Actualiza la información de #${animal.number}`}
      >
        <AnimalForm 
          isModal
          initialValues={animal}
          onCancel={() => setIsEditModalOpen(false)}
          onSubmitSuccess={() => setIsEditModalOpen(false)}
          onOpenModal={handleOpenModal}
        />
      </BottomSheet>

      {/* MODALES RECURSIVOS PARA CREAR PADRES */}
      <AnimatePresence>
        {modalStack.map((modal, index) => (
          <BottomSheet
            key={modal.id}
            isOpen={true}
            onClose={handleCloseModal}
            title={`Registrar ${modal.sex === 'Macho' ? 'Padre' : 'Madre'}`}
            description="Completa los datos mínimos para identificar al progenitor."
            style={{ zIndex: 50 + index * 10 }}
          >
            <AnimalForm 
              isModal
              initialValues={{ sex: modal.sex }}
              onCancel={handleCloseModal}
              onSubmitSuccess={handleModalSuccess}
              onOpenModal={handleOpenModal}
            />
          </BottomSheet>
        ))}
      </AnimatePresence>
    </main>
  );
}

export default function AnimalProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F7F7F2] flex flex-col items-center justify-center text-[#1B4820]">
        <Loader2 className="w-10 h-10 animate-spin mb-4" />
        <p className="font-bold uppercase tracking-widest text-xs opacity-60">Cargando...</p>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}
