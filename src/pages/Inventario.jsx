import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, Scale, Plus, X, Syringe, ClipboardPlus, CheckCircle2, XCircle, Check, AlertCircle } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { calculateAge, formatWeight, parseLocalDate } from '@/lib/dateUtils';
import SyncStatus from '@/components/ui/SyncStatus';
import AnimalImage from '@/components/inventario/AnimalImage';
import { motion, AnimatePresence } from 'framer-motion';

const actionOptions = [
  { label: 'Vacunación por Lotes', icon: Syringe, type: 'batch' },
  { label: 'Nuevo Registro', icon: ClipboardPlus, href: '/inventario/nuevo' },
];

const ITEMS_PER_PAGE = 50;

// --- COMPONENTE DE CHECKBOX ---
const FilterCheckbox = ({ label, count, checked, onChange }) => (
  <label className="flex items-center gap-3 py-2.5 cursor-pointer group">
    <input
      type="checkbox"
      className="hidden"
      checked={checked}
      onChange={onChange}
    />
    <div className={`w-5 h-5 rounded-[6px] border-[1.5px] flex items-center justify-center transition-all ${checked ? 'bg-[#1B4820] border-[#1B4820]' : 'border-neutral-300 bg-white group-hover:border-[#1B4820]/50'
      }`}>
      {checked && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
    </div>
    <span className="text-sm font-bold text-neutral-700 select-none flex-1 group-hover:text-black transition-colors">{label}</span>
    {count !== undefined && <span className="text-xs font-bold text-neutral-400">({count})</span>}
  </label>
);

const SearchInput = ({ isMobile = false, searchTerm, setSearchTerm, onOpenFilters, activeFiltersCount }) => (
  <div className={`relative flex items-center ${isMobile
    ? 'md:hidden bg-white mt-4 w-full border-neutral-300'
    : 'hidden md:flex bg-white md:w-full md:max-w-md border-neutral-300 shadow-sm'
    } rounded-2xl py-2 px-4 border focus-within:border-[#1B4820] transition-all`}>

    <Search className="w-5 h-5 text-neutral-600 mr-2 shrink-0" />
    <input
      type="text"
      placeholder={isMobile ? "Buscar ID o número..." : "Buscar animal por ID o número..."}
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="flex-1 bg-transparent border-none outline-none text-black font-medium placeholder-neutral-500 text-sm w-full"
    />
    <div className="border-l pl-3 ml-2 border-neutral-300 shrink-0 relative">
      <button onClick={onOpenFilters} className="p-1 hover:bg-neutral-100 rounded-lg transition-colors focus:outline-none cursor-pointer">
        <SlidersHorizontal className="w-5 h-5 text-black" />
        {activeFiltersCount > 0 && (
          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        )}
      </button>
    </div>
  </div>
);

export default function InventarioPage() {
  const navigate = useNavigate();
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // --- ESTADO DE PAGINACIÓN ---
  const [currentPage, setCurrentPage] = useState(1);

  // --- ESTADOS PARA BATCH MODE ---
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedAnimalIds, setSelectedAnimalIds] = useState(new Set());

  // --- ESTADO PARA RESALTAR 8 MESES ---
  const [viewedHighlights, setViewedHighlights] = useState(() => {
    try { return JSON.parse(localStorage.getItem('viewed8Months') || '[]'); }
    catch { return []; }
  });

  const [filters, setFilters] = useState({
    sex: [],
    status: [],
    category: []
  });

  const allAnimals = useLiveQuery(
    () => db.animals
      .orderBy('updated_at')
      .reverse()
      .filter(a => !a.deleted_at)
      .toArray(),
    []
  );

  const toggleFilter = (type, value) => {
    setFilters(prev => ({
      ...prev,
      [type]: prev[type].includes(value)
        ? prev[type].filter(item => item !== value)
        : [...prev[type], value]
    }));
  };

  const clearFilters = () => setFilters({ sex: [], status: [], category: [] });

  const activeFiltersCount = filters.sex.length + filters.status.length + filters.category.length;

  // Lógica para detectar exactamente los 8 meses
  const is8MonthsOld = (animal) => {
    if (!animal.birth_date) return false;
    if (viewedHighlights.includes(animal.id)) return false;
    
    const birth = parseLocalDate(animal.birth_date);
    const months = (new Date() - birth) / (1000 * 60 * 60 * 24 * 30.44);
    return Math.floor(months) === 8;
  };

  const filteredAnimals = useMemo(() => {
    if (!allAnimals) return [];

    const filtered = allAnimals.filter(a => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = !term || a.number.toLowerCase().includes(term) || a.id.toLowerCase().includes(term);
      const matchesSex = filters.sex.length === 0 || filters.sex.includes(a.sex);
      const currentStatus = a.status || 'Activo';
      const matchesStatus = filters.status.length === 0 || filters.status.includes(currentStatus);

      let category = 'Desconocida';
      if (a.birth_date) {
        const birth = parseLocalDate(a.birth_date);
        const months = (new Date() - birth) / (1000 * 60 * 60 * 24 * 30.44);
        if (months < 9) category = 'Becerro';
        else if (months < 19) category = 'Maute';
        else if (months < 25) category = 'Novillo';
        else category = 'Adulto';
      }
      const matchesCategory = filters.category.length === 0 || filters.category.includes(category);

      return matchesSearch && matchesSex && matchesStatus && matchesCategory;
    });

    // Ordenar: Los de 8 meses resaltados van de primeros
    const highlighted = [];
    const normal = [];
    
    filtered.forEach(a => {
      if (is8MonthsOld(a)) highlighted.push(a);
      else normal.push(a);
    });

    return [...highlighted, ...normal];
  }, [allAnimals, searchTerm, filters, viewedHighlights]);

  // --- REINICIAR PAGINACIÓN AL FILTRAR O BUSCAR ---
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters]);

  // --- PAGINACIÓN ---
  const totalPages = Math.ceil(filteredAnimals.length / ITEMS_PER_PAGE);
  const paginatedAnimals = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAnimals.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAnimals, currentPage]);

  const getCount = (type, value) => {
    if (!allAnimals) return 0;
    return allAnimals.filter(a => {
      if (type === 'sex') return a.sex === value;
      if (type === 'status') return (a.status || 'Activo') === value;
      if (type === 'category') {
        let cat = 'Desconocida';
        if (a.birth_date) {
          const birth = parseLocalDate(a.birth_date);
          const months = (new Date() - birth) / (1000 * 60 * 60 * 24 * 30.44);
          if (months < 9) cat = 'Becerro';
          else if (months < 19) cat = 'Maute';
          else if (months < 25) cat = 'Novillo';
          else cat = 'Adulto';
        }
        return cat === value;
      }
      return false;
    }).length;
  };

  const toggleAnimalSelection = (id) => {
    const newSelection = new Set(selectedAnimalIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedAnimalIds(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedAnimalIds.size === filteredAnimals.length) {
      setSelectedAnimalIds(new Set());
    } else {
      setSelectedAnimalIds(new Set(filteredAnimals.map(a => a.id)));
    }
  };

  const handleContinueBatch = () => {
    if (selectedAnimalIds.size === 0) return;
    sessionStorage.setItem('batchAnimalIds', JSON.stringify(Array.from(selectedAnimalIds)));
    navigate('/inventario/tratamiento-lote');
  };

  const cancelBatchMode = () => {
    setIsBatchMode(false);
    setSelectedAnimalIds(new Set());
  };

  return (
    <main className="min-h-screen bg-[#F0F2EB] font-sans pb-32 relative">

      {/* OVERLAY FONDO OSCURO */}
      <AnimatePresence>
        {(isFabOpen || isFilterOpen) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[35] cursor-pointer"
            onClick={() => { setIsFabOpen(false); setIsFilterOpen(false); }}
          />
        )}
      </AnimatePresence>

      {/* --- PANEL DE FILTROS ADAPTATIVO --- */}
      <AnimatePresence>
        {isFilterOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed z-[60] bg-white flex flex-col shadow-2xl
                       bottom-0 left-0 w-full max-h-[85vh] rounded-t-[2rem]
                       lg:bottom-auto lg:top-24 lg:right-8 lg:left-auto lg:w-96 lg:h-auto lg:max-h-[calc(100vh-8rem)] lg:rounded-[2rem] lg:border lg:border-neutral-200"
          >
            <div className="w-full flex justify-center pt-3 pb-2 lg:hidden">
              <div className="w-12 h-1.5 bg-neutral-200 rounded-full"></div>
            </div>

            <div className="px-6 pt-2 lg:pt-6 pb-4 flex items-center justify-between border-b border-neutral-100">
              <h3 className="text-xl font-black text-neutral-900">Filtrar por</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={clearFilters}
                  className="bg-neutral-100 hover:bg-neutral-200 text-neutral-600 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Borrar
                </button>
                <button onClick={() => setIsFilterOpen(false)} className="hidden lg:flex p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-500 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div>
                <h4 className="text-sm font-black text-neutral-900 mb-2 uppercase tracking-wider">Estatus del Animal</h4>
                <div className="space-y-0.5">
                  <FilterCheckbox label="Activos en finca" count={getCount('status', 'Activo')} checked={filters.status.includes('Activo')} onChange={() => toggleFilter('status', 'Activo')} />
                  <FilterCheckbox label="Inactivos (Vendidos/Fallecidos)" count={getCount('status', 'Inactivo')} checked={filters.status.includes('Inactivo')} onChange={() => toggleFilter('status', 'Inactivo')} />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-black text-neutral-900 mb-2 uppercase tracking-wider">Género</h4>
                <div className="space-y-0.5">
                  <FilterCheckbox label="Hembras" count={getCount('sex', 'Hembra')} checked={filters.sex.includes('Hembra')} onChange={() => toggleFilter('sex', 'Hembra')} />
                  <FilterCheckbox label="Machos" count={getCount('sex', 'Macho')} checked={filters.sex.includes('Macho')} onChange={() => toggleFilter('sex', 'Macho')} />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-black text-neutral-900 mb-2 uppercase tracking-wider">Categoría por Edad</h4>
                <div className="space-y-0.5">
                  <FilterCheckbox label="Becerros/as (0 a 8 meses)" count={getCount('category', 'Becerro')} checked={filters.category.includes('Becerro')} onChange={() => toggleFilter('category', 'Becerro')} />
                  <FilterCheckbox label="Mautes/as (9 a 18 meses)" count={getCount('category', 'Maute')} checked={filters.category.includes('Maute')} onChange={() => toggleFilter('category', 'Maute')} />
                  <FilterCheckbox label="Novillos/as (19 a 24 meses)" count={getCount('category', 'Novillo')} checked={filters.category.includes('Novillo')} onChange={() => toggleFilter('category', 'Novillo')} />
                  <FilterCheckbox label="Adultos Toro/Vaca (+24 meses)" count={getCount('category', 'Adulto')} checked={filters.category.includes('Adulto')} onChange={() => toggleFilter('category', 'Adulto')} />
                  <FilterCheckbox label="Edad Desconocida" count={getCount('category', 'Desconocida')} checked={filters.category.includes('Desconocida')} onChange={() => toggleFilter('category', 'Desconocida')} />
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-neutral-100 bg-white lg:rounded-b-[2rem]">
              <button
                onClick={() => setIsFilterOpen(false)}
                className="w-full bg-[#1B4820] text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-950 transition-colors shadow-lg shadow-[#1B4820]/20 cursor-pointer"
              >
                Ver {filteredAnimals.length} Resultados
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="bg-white md:bg-[#1B4820] w-full px-4 pt-6 pb-4 md:py-4 md:px-8 sticky top-0 z-30 shadow-md transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex md:flex-1 items-center justify-between md:justify-start w-full">
            <span className="text-lg md:text-3xl font-black text-[#1B4820] md:text-white tracking-tight whitespace-nowrap">
             Finca Los Muchachos
            </span>
            <div className="md:hidden">
              <SyncStatus />
            </div>
          </div>
          <div className="hidden md:flex md:flex-1 justify-center">
            <SearchInput searchTerm={searchTerm} setSearchTerm={setSearchTerm} onOpenFilters={() => setIsFilterOpen(true)} activeFiltersCount={activeFiltersCount} />
          </div>
          <div className="hidden md:flex md:flex-1 justify-end">
            <SyncStatus />
          </div>
          <SearchInput isMobile={true} searchTerm={searchTerm} setSearchTerm={setSearchTerm} onOpenFilters={() => setIsFilterOpen(true)} activeFiltersCount={activeFiltersCount} />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-5 md:mt-8 relative z-0">

        {activeFiltersCount > 0 && !isBatchMode && (
          <div className="mb-4 flex items-center justify-between bg-emerald-100 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl">
            <span className="text-xs font-bold uppercase tracking-wider">Filtros Activos ({activeFiltersCount})</span>
            <button onClick={clearFilters} className="text-xs font-black underline hover:text-emerald-950 cursor-pointer">Limpiar filtros</button>
          </div>
        )}

        {/* Banner de Modo Batch */}
        {isBatchMode && (
          <div className="mb-6 flex items-center justify-between bg-[#1B4820] text-white px-6 py-4 rounded-[2rem] shadow-lg shadow-[#1B4820]/20 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <Syringe className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-black uppercase tracking-widest">Modo Vacunación por Lotes</span>
            </div>
            <button
              onClick={toggleSelectAll}
              className="text-xs font-black uppercase tracking-widest bg-white/10 px-4 py-2 rounded-xl hover:bg-white/20 transition-colors cursor-pointer"
            >
              {selectedAnimalIds.size === filteredAnimals.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
            </button>
          </div>
        )}

        {paginatedAnimals.length > 0 ? (
          <>
            <motion.div
              layout
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6"
            >
              {paginatedAnimals.map((animal) => {
                const isSelected = selectedAnimalIds.has(animal.id);
                const isHighlight = is8MonthsOld(animal);

                const CardContent = (
                  <article className={`relative bg-white rounded-[2rem] overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col h-full cursor-pointer group border-2 ${isSelected ? 'border-[#1B4820]' : isHighlight ? 'border-amber-400 shadow-amber-400/20 shadow-lg' : 'border-neutral-200'}`}>
                    
                    {/* Alerta Visual de 8 Meses */}
                    {isHighlight && !isBatchMode && (
                      <div className="absolute top-0 left-0 w-full bg-amber-400 text-amber-950 text-[9px] font-black uppercase tracking-widest text-center py-1.5 z-20 flex items-center justify-center gap-1 shadow-sm">
                        <AlertCircle className="w-3 h-3" />
                        ¡8 Meses!
                      </div>
                    )}

                    <div className={`relative aspect-square w-full bg-[#E5E7EB] overflow-hidden ${isHighlight && !isBatchMode ? 'mt-6' : ''}`}>
                      <AnimalImage
                        photoPath={animal.photo_path}
                        photoBlob={animal.photo_blob}
                        alt={`#${animal.number}`}
                        className={`w-full h-full group-hover:scale-105 transition-transform duration-500 opacity-100 ${isSelected ? 'opacity-70 grayscale-[0.3]' : ''}`}
                      />

                      {isBatchMode && (
                        <div className={`absolute top-3 left-3 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all z-10 ${isSelected ? 'bg-[#1B4820] border-[#1B4820]' : 'bg-white/80 border-white shadow-sm'
                          }`}>
                          {isSelected && <Check className="w-4 h-4 text-white stroke-[4]" />}
                        </div>
                      )}

                      <div className={`absolute top-3 right-3 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg ${animal.status === 'Inactivo' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
                        {animal.status === 'Inactivo' ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        <span className="text-[9px] font-black uppercase tracking-widest">{animal.status || 'Activo'}</span>
                      </div>
                    </div>

                    <div className="px-5 pt-4 pb-6 flex flex-col justify-between flex-1 gap-1">
                      <div>
                        <div className={`inline-block px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest text-white mb-2 ${animal.sex === 'Hembra' ? 'bg-pink-600' : 'bg-blue-700'}`}>
                          {animal.sex}
                        </div>
                        <h2 
  className="text-lg sm:text-xl md:text-2xl font-black text-black leading-tight mb-1" 
  title={`#${animal.number}`}
>
  <span className="md:hidden">
    #{animal.number.length > 10 ? animal.number.substring(0, 10) + '...' : animal.number}
  </span>
  <span className="hidden md:inline">
    #{animal.number.length > 12 ? animal.number.substring(0, 12) + '...' : animal.number}
  </span>
</h2>
                        <p className="text-xs text-neutral-700 font-bold uppercase tracking-wider">{calculateAge(animal.birth_date)}</p>
                      </div>

                      <div className="flex items-center text-black mt-4 bg-neutral-100 border border-neutral-200 w-fit px-3 py-2 rounded-xl">
                        <Scale className="w-4 h-4 mr-2 text-[#1B4820]" strokeWidth={3} />
                        <span className="text-sm font-black tracking-tight">{formatWeight(animal.last_weight_kg)}</span>
                      </div>
                    </div>
                  </article>
                );

                // Único contenedor motion por elemento, soluciona el bug de la tarjeta invisible
                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={animal.id}
                    onClick={() => {
                      if (isBatchMode) {
                        toggleAnimalSelection(animal.id);
                      } else if (isHighlight) {
                        // Guardar en cache al darle click para quitarle el resaltado
                        const updated = [...viewedHighlights, animal.id];
                        setViewedHighlights(updated);
                        localStorage.setItem('viewed8Months', JSON.stringify(updated));
                      }
                    }}
                  >
                    {isBatchMode ? (
                      <div className="block h-full">
                        {CardContent}
                      </div>
                    ) : (
                      <Link to={`/inventario/perfil?id=${animal.id}`} className="block h-full">
                        {CardContent}
                      </Link>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>

            {/* --- CONTROLES DE PAGINACIÓN --- */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between mt-10 mb-8 bg-white px-6 py-4 rounded-3xl border border-neutral-200 shadow-sm gap-4">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-full sm:w-auto px-6 py-3 bg-neutral-100 text-neutral-600 font-black text-xs uppercase tracking-widest rounded-2xl disabled:opacity-40 transition-colors hover:bg-neutral-200 cursor-pointer disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <span className="text-xs font-black text-neutral-500 uppercase tracking-widest">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-full sm:w-auto px-6 py-3 bg-[#1B4820] text-white font-black text-xs uppercase tracking-widest rounded-2xl disabled:opacity-40 transition-colors hover:bg-emerald-900 cursor-pointer disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-lg font-black text-neutral-400 uppercase tracking-widest">Sin resultados</p>
          </div>
        )}
      </div>

      {/* FOOTER BAR FOR BATCH MODE */}
      <AnimatePresence>
        {isBatchMode && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 w-full bg-white border-t border-neutral-200 z-[60] px-6 py-5 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] rounded-t-[2.5rem]"
          >
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-2xl font-black text-black leading-none">{selectedAnimalIds.size}</span>
                <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest mt-1">Animales Seleccionados</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={cancelBatchMode}
                  className="flex-1 sm:flex-initial px-8 py-4 rounded-2xl bg-neutral-100 text-neutral-600 font-black text-xs uppercase tracking-widest hover:bg-neutral-200 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleContinueBatch}
                  disabled={selectedAnimalIds.size === 0}
                  className="flex-1 sm:flex-initial px-10 py-4 rounded-2xl bg-[#1B4820] text-white font-black text-xs uppercase tracking-widest hover:bg-emerald-900 transition-all shadow-lg shadow-[#1B4820]/20 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed group flex items-center justify-center gap-2 cursor-pointer"
                >
                  Continuar
                  <Syringe className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isBatchMode && (
        <div className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50 flex flex-col items-end gap-3">
          <AnimatePresence>
            {isFabOpen && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                className="flex flex-col items-end gap-3 mb-2"
              >
                {actionOptions.map((option, index) => {
                  const Icon = option.icon;

                  const content = (
                    <div
                      key={index}
                      onClick={() => {
                        if (option.type === 'batch') {
                          setIsBatchMode(true);
                          setIsFabOpen(false);
                        }
                      }}
                      className="flex items-center gap-3 bg-white rounded-full py-3.5 px-6 shadow-2xl border-2 border-[#1B4820]/10 group hover:bg-[#1B4820] transition-all cursor-pointer"
                    >
                      <span className="text-sm font-black uppercase tracking-widest text-black group-hover:text-white transition-colors">{option.label}</span>
                      <div className="bg-[#1B4820] p-2 rounded-full text-white group-hover:bg-white group-hover:text-[#1B4820] transition-colors"><Icon className="w-4 h-4" /></div>
                    </div>
                  );

                  return option.href ? (
                    <Link key={index} to={option.href}>
                      {content}
                    </Link>
                  ) : content;
                })}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setIsFabOpen(!isFabOpen)}
            className={`bg-[#1B4820] p-4 rounded-full text-white shadow-2xl transform transition-transform duration-300 cursor-pointer hover:scale-110 active:scale-95 ${isFabOpen ? 'rotate-180 bg-black' : ''}`}
          >
            {isFabOpen ? <X className="w-8 h-8" strokeWidth={3} /> : <Plus className="w-8 h-8" strokeWidth={3} />}
          </button>
        </div>
      )}
    </main>
  );
}