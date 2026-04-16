
import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Search, Plus, Check, ChevronDown, X } from 'lucide-react';

/**
 * GenealogySelector: Combobox reactivo para seleccionar padres (offline-first).
 * 
 * @param {string} label - Etiqueta del campo.
 * @param {string} value - UUID del animal seleccionado.
 * @param {function} onChange - Callback al seleccionar.
 * @param {string} sex - Filtro de sexo ('Macho' | 'Hembra').
 * @param {function} onCreateNew - Callback para abrir el modal de creación.
 */
export default function GenealogySelector({
  label,
  value,
  onChange,
  sex,
  onCreateNew
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Consulta reactiva a Dexie filtrando por sexo
  const animals = useLiveQuery(
    () => {
      let query = db.animals.where('sex').equals(sex);
      // Solo traemos los que no están eliminados lógicamente
      return query.and(a => !a.deleted_at).toArray();
    },
    [sex]
  );

  // 2. Filtrado local por término de búsqueda (número o ID)
  const filteredResults = useMemo(() => {
    if (!animals) return [];
    if (!searchTerm) return animals.slice(0, 10); // Mostrar top 10 si no hay búsqueda
    
    const term = searchTerm.toLowerCase();
    return animals.filter(a => 
      a.number.toLowerCase().includes(term) || 
      a.id.toLowerCase().includes(term)
    ).slice(0, 8);
  }, [animals, searchTerm]);

  // 3. Animal seleccionado (para mostrar el nombre/número en el input)
  const selectedAnimal = useMemo(() => {
    return animals?.find(a => a.id === value);
  }, [animals, value]);

  const handleSelect = (id) => {
    onChange(id);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div className="mb-4 last:mb-0 relative">
      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1.5 block">
        {label}
      </label>

      {/* Input / Trigger */}
      <div 
        onClick={() => setIsOpen(true)}
        className={`w-full bg-white rounded-xl px-4 py-3 flex items-center justify-between border shadow-sm transition-all focus-within:ring-2 focus-within:ring-[#1B4820]/20 ${isOpen ? 'border-[#1B4820]/30 ring-2 ring-[#1B4820]/20' : 'border-transparent'}`}
      >
        <div className="flex items-center flex-1 gap-2">
          <Search className="w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder={selectedAnimal ? `#${selectedAnimal.number}` : `Buscar ${sex === 'Macho' ? 'Padre' : 'Madre'}...`}
            className="flex-1 bg-transparent border-none outline-none text-neutral-800 placeholder-neutral-400 text-sm font-medium"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
          />
        </div>
        
        <div className="flex items-center gap-1">
          {value && (
            <button 
              onClick={handleClear}
              className="p-1 hover:bg-neutral-100 rounded-full transition-colors"
            >
              <X className="w-3.5 h-3.5 text-neutral-400" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute z-40 w-full mt-2 bg-white rounded-xl shadow-xl border border-neutral-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top">
            
            {/* Lista de Resultados */}
            <div className="max-h-60 overflow-y-auto">
              {filteredResults.length > 0 ? (
                filteredResults.map((animal) => (
                  <div
                    key={animal.id}
                    onClick={() => handleSelect(animal.id)}
                    className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${value === animal.id ? 'bg-emerald-50 text-[#1B4820]' : 'hover:bg-neutral-50'}`}
                  >
                    <div>
                      <p className="font-bold text-sm text-neutral-800">#{animal.number}</p>
                      {animal.color && <p className="text-[10px] text-neutral-500 uppercase">{animal.color}</p>}
                    </div>
                    {value === animal.id && <Check className="w-4 h-4 text-[#1B4820]" />}
                  </div>
                ))
              ) : (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-neutral-400">No se encontraron animales.</p>
                </div>
              )}
            </div>

            {/* Accion: Crear Nuevo */}
            <div className="p-2 border-t border-neutral-50 bg-neutral-50/50">
              <button
                type="button"
                onClick={() => {
                  onCreateNew(sex);
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 bg-white border border-dashed border-neutral-300 hover:border-[#1B4820] hover:text-[#1B4820] text-neutral-600 font-bold py-2.5 rounded-lg transition-all text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                REGISTRAR NUEVO {sex.toUpperCase()}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
