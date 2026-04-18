import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Syringe, 
  Pill, 
  Stethoscope, 
  Apple, 
  Plus, 
  Filter,
  ShieldCheck
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { formatWeight, formatShortDateLocal } from '@/lib/dateUtils';
import AnimalImage from '@/components/inventario/AnimalImage';
import BottomSheet from '@/components/ui/BottomSheet';
import HealthForm from '@/components/inventario/HealthForm';
import { TbMedicineSyrup } from "react-icons/tb";

const PRODUCT_STYLES = {
  'Vacuna': { icon: Syringe, color: 'bg-[#EEF7EE] text-[#1B4820]' },
  'Desparasitante': { icon: TbMedicineSyrup, color: 'bg-[#FDF2E9] text-[#8C6746]' },
  'Vitamina': { icon: Pill, color: 'bg-[#F7F9EE] text-[#4F663F]' },
  'Antibiótico': { icon: Stethoscope, color: 'bg-[#FEECEC] text-[#D15555]' },
};

export default function HealthTab({ animal }) {
  const animalId = animal?.id;
  const [editingRecord, setEditingRecord] = useState(null);

  // Consulta reactiva a registros de salud
  const records = useLiveQuery(
    () => db.health_records
      .where('animal_id').equals(animalId)
      .and(r => !r.deleted_at)
      .toArray()
      .then(res => res.sort((a, b) => b.application_date.localeCompare(a.application_date))),
    [animalId]
  );

  if (!animal) return null;

  return (
    <div className="max-w-2xl mx-auto pb-20">
      
      {/* 1. Encabezado de Identificación */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm text-center border border-neutral-100 mb-6">
        <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-4 border-4 border-[#F7F7F2] shadow-md bg-neutral-100">
          <AnimalImage 
            photoPath={animal.photo_path}
            photoBlob={animal.photo_blob}
            alt={animal.number}
            className="w-full h-full"
          />
        </div>
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] mb-1">Registro Individual</p>
        <span className="text-3xl font-black text-[#1B4820]">#{animal.number}</span>
      </div>

      {/* 2. Tarjeta de Peso Actual */}
      <div className="bg-[#1B4820] p-8 rounded-[2.5rem] text-white shadow-xl mb-10">
        <p className="text-[10px] uppercase font-bold opacity-70 tracking-[0.2em] mb-2">Último Peso Registrado</p>
        <div className="flex items-baseline gap-2">
          <span className="text-6xl font-black italic tracking-tighter">
            {animal.last_weight_kg ? Math.floor(animal.last_weight_kg) : '---'}
          </span>
          <span className="text-2xl font-bold opacity-80 tracking-tighter">kg</span>
        </div>
      </div>

      {/* 3. Sección Historial */}
      <div className="flex items-center justify-between px-2 mb-6">
        <h3 className="text-2xl font-black text-[#1B4820]">Historial de Salud</h3>
        <button className="bg-[#F1F3EE] p-2 rounded-xl text-neutral-600 hover:bg-neutral-200 transition-colors cursor-pointer">
          <Filter className="w-5 h-5" />
        </button>
      </div>

      {/* 4. Lista de Tratamientos */}
      <div className="space-y-4">
        {records && records.length > 0 ? (
          records.map((item, i) => {
            const style = PRODUCT_STYLES[item.product_type] || { icon: Stethoscope, color: 'bg-neutral-100 text-neutral-600' };
            const Icon = style.icon;
            
            return (
              <div 
                key={item.id} 
                onClick={() => setEditingRecord(item)}
                className="bg-white p-6 rounded-[2.5rem] flex items-start gap-5 border border-neutral-100 shadow-sm transition-all active:scale-[0.98] cursor-pointer hover:border-emerald-100"
              >
                {/* Círculo de Icono */}
                <div className={`${style.color} w-14 h-14 rounded-full flex items-center justify-center shrink-0`}>
                  <Icon className="w-6 h-6" />
                </div>

                {/* Información del Tratamiento */}
                <div className="flex-1 space-y-3">
                  <div className="flex justify-between items-start">
                    <p className="text-[11px] font-bold text-neutral-900 tracking-tight">
                      {formatShortDateLocal(item.application_date)}
                    </p>
                    <span className="text-[8px] font-black text-neutral-300 uppercase tracking-widest">Fecha</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-0.5">Tipo</p>
                      <p className="text-sm font-bold text-neutral-800 leading-none">{item.product_type}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-0.5">Cantidad / Dosis</p>
                      <p className="text-sm font-bold text-[#8C6746] leading-none">{item.dose || '---'}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-0.5">Producto</p>
                    <h4 className="text-base font-black text-neutral-900 leading-tight">{item.product_name}</h4>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-neutral-400 italic">
            <ShieldCheck className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm font-bold uppercase tracking-widest text-center">Sin registros médicos</p>
          </div>
        )}
      </div>

      {/* 5. BOTÓN FLOTANTE (FAB) CON LA NUEVA RUTA */}
      <Link to={`/inventario/perfil/tratamiento?id=${animalId}`}>
        <button className="fixed bottom-28 md:bottom-10 right-6 md:right-10 bg-[#1B4820] text-white p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all z-50 cursor-pointer">
          <Plus className="w-7 h-7" strokeWidth={3} />
        </button>
      </Link>

      {/* MODAL DE EDICIÓN */}
      <BottomSheet
        isOpen={!!editingRecord}
        onClose={() => setEditingRecord(null)}
        title="Editar Tratamiento"
        description={`Modifica el registro médico de ${editingRecord?.product_name}`}
      >
        <HealthForm 
          animal={animal}
          initialValues={editingRecord}
          onSubmitSuccess={() => setEditingRecord(null)}
          onCancel={() => setEditingRecord(null)}
          isModal
        />
      </BottomSheet>
    </div>
  );
}