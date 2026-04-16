
import React, { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * CustomSelect: Un selector estilizado que reemplaza al <select> nativo.
 * 
 * @param {string} value - El valor seleccionado.
 * @param {function} onChange - Callback cuando cambia la selección.
 * @param {Array} options - Arreglo de { value: string, label: string }.
 * @param {string} placeholder - Texto por defecto.
 * @param {string} label - Etiqueta opcional arriba del input.
 * @param {string} bgClass - Clase de fondo (ej: 'bg-white' o 'bg-neutral-50').
 */
export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Seleccionar...',
  label,
  bgClass = 'bg-white'
}) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative w-full">
      {label && (
        <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1.5 block">
          {label}
        </label>
      )}

      {/* Trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full ${bgClass} rounded-2xl px-4 py-4 flex items-center justify-between border shadow-sm transition-all cursor-pointer ${
          isOpen ? 'border-[#1B4820]/30 ring-2 ring-[#1B4820]/20' : 'border-neutral-200'
        }`}
      >
        <span className={`text-sm font-medium ${selectedOption ? 'text-neutral-800' : 'text-neutral-400'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          className={`w-5 h-5 text-neutral-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </div>

      {/* Dropdown Expandible (Inline) */}
      {isOpen && (
        <div className="w-full mt-2 bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-h-60 overflow-y-auto">
            {options.length > 0 ? (
              options.map((option) => (
                <div
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between px-4 py-3.5 cursor-pointer transition-colors ${
                    value === option.value ? 'bg-emerald-50 text-[#1B4820]' : 'hover:bg-neutral-50'
                  }`}
                >
                  <span className="font-bold text-sm">{option.label}</span>
                  {value === option.value && <Check className="w-4 h-4 text-[#1B4820]" />}
                </div>
              ))
            ) : (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-neutral-400 italic">No hay opciones disponibles</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
