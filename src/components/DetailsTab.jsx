import React from 'react';
import { IdCard, Network, FileText, Pencil, CircleAlert } from 'lucide-react';
import AnimalImage from '@/components/inventario/AnimalImage';
import { calculateAge, formatWeight } from '@/lib/dateUtils';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Link } from 'react-router-dom';

export default function DetailsTab({ animal, onEdit }) {
  const parents = useLiveQuery(
    async () => {
      if (!animal) return { father: null, mother: null };
      const father = animal.father_id ? await db.animals.get(animal.father_id) : null;
      const mother = animal.mother_id ? await db.animals.get(animal.mother_id) : null;
      return { father, mother };
    },
    [animal]
  );
  if (!animal) return null;

  return (
    <div className="max-w-6xl mx-auto md:grid md:grid-cols-12 md:gap-8 md:items-start">

      {/* COLUMNA 1: Perfil Rápido */}
      <div className="md:col-span-5 md:sticky md:top-32 space-y-5">
        <div className="w-full aspect-[4/3] rounded-3xl overflow-hidden shadow-sm border border-neutral-100 bg-neutral-200">
          <AnimalImage
            photoPath={animal.photo_path}
            photoBlob={animal.photo_blob}
            alt={`#${animal.number}`}
            className="w-full h-full"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-3xl font-black text-[#1B4820] tracking-tight block">#{animal.number}</span>

          {/* Badge de Estatus Dinámico */}
          <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${animal.status === 'Inactivo' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'
            }`}>
            {animal.status || 'Activo'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm text-center border border-neutral-100">
            <span className="text-[10px] uppercase font-bold text-neutral-500 mb-1 block tracking-widest">Peso Actual</span>
            <span className="text-2xl font-black text-[#1B4820]">{formatWeight(animal.last_weight_kg)}</span>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm text-center border border-neutral-100">
            <span className="text-[10px] uppercase font-bold text-neutral-500 mb-1 block tracking-widest">Edad</span>
            <span className="text-lg font-black text-[#1B4820]">{calculateAge(animal.birth_date)}</span>
          </div>
        </div>

        {/* Botón Editar en Desktop */}
        <button 
          onClick={onEdit}
          className="hidden md:flex w-full items-center justify-center gap-2 bg-[#FBE3C5] text-[#8C6746] font-bold py-4 rounded-2xl shadow-sm transition-transform hover:scale-[0.99] cursor-pointer"
        >
          <Pencil className="w-5 h-5" /> EDITAR
        </button>
      </div>

      {/* COLUMNA 2: Información Detallada */}
      <div className="md:col-span-7 space-y-4 mt-6 md:mt-0">

        {/* Identificación Detallada */}
        <section className="bg-white p-5 rounded-3xl shadow-sm border border-neutral-100">
          <div className="flex items-center gap-2 mb-5">
            <IdCard className="w-5 h-5 text-[#4F663F]" />
            <h3 className="text-lg font-bold text-[#1B4820]">Identificación Detallada</h3>
          </div>
          <div className="grid grid-cols-2 gap-y-4 text-sm">
            <DataRow label="Número / ID" value={`#${animal.number}`} />
            <DataRow label="Fecha Nacimiento" value={animal.birth_date ? new Date(animal.birth_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '---'} />
            <DataRow label="Sexo" value={animal.sex || '---'} />
            <DataRow label="Color / Pelaje" value={animal.color || '---'} />
            <DataRow label="Estado Actual" value={animal.status || 'Activo'} isStatus={true} statusType={animal.status} />
          </div>
        </section>

        {/* Genealogía (ID de Padres) */}
        <section className="bg-white p-5 rounded-3xl shadow-sm border border-neutral-100">
          <div className="flex items-center gap-2 mb-5">
            <Network className="w-5 h-5 text-[#4F663F]" />
            <h3 className="text-lg font-bold text-[#1B4820]">Genealogía Directa</h3>
          </div>
          <div className="pl-4 border-l-2 border-neutral-100 grid grid-cols-2 gap-y-4 text-sm">
            <DataRow 
              label="Padre (Semental)" 
              value={
                animal.father_id ? (
                  // --- ENLACE AL PERFIL DEL PADRE ACTUALIZADO ---
                  <Link to={`/inventario/perfil?id=${animal.father_id}`} className="hover:underline hover:text-[#1A3621] transition-colors cursor-pointer inline-flex items-center">
                    {parents?.father?.number ? `#${parents.father.number}` : `#${animal.father_id.split('-')[0]}`}
                  </Link>
                ) : (
                  'Desconocido'
                )
              } 
            />
            <DataRow 
              label="Madre (Vientre)" 
              value={
                animal.mother_id ? (
                  // --- ENLACE AL PERFIL DE LA MADRE ACTUALIZADO ---
                  <Link to={`/inventario/perfil?id=${animal.mother_id}`} className="hover:underline hover:text-[#1A3621] transition-colors cursor-pointer inline-flex items-center">
                    {parents?.mother?.number ? `#${parents.mother.number}` : `#${animal.mother_id.split('-')[0]}`}
                  </Link>
                ) : (
                  'Desconocida'
                )
              } 
            />
          </div>
        </section>

        {/* Observaciones */}
        {animal.observations && (
          <section className="bg-[#EEF2EA] p-5 rounded-3xl border border-transparent">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-[#4F663F]" />
              <h3 className="text-lg font-bold text-[#1B4820]">Observaciones del Ganadero</h3>
            </div>
            <p className="text-sm text-[#4F663F] leading-relaxed font-medium">
              {animal.observations}
            </p>
          </section>
        )}

        {/* Razón de Inactividad (Solo si aplica) */}
        {animal.status === 'Inactivo' && (
          <section className="bg-red-50 p-5 rounded-3xl border border-red-100 animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="flex items-center gap-2 mb-3 text-red-700">
              <CircleAlert className="w-5 h-5" />
              <h3 className="text-lg font-bold">Razón de Inactividad</h3>
            </div>
            <p className="text-sm text-red-600 leading-relaxed font-bold">
              {animal.inactivity_reason || 'No se especificó una razón para la baja del animal.'}
            </p>
          </section>
        )}

        {/* Botón Editar para MÓVIL */}
        <button 
          onClick={onEdit}
          className="md:hidden w-full flex items-center justify-center gap-2 bg-[#FBE3C5] text-[#8C6746] font-bold py-4 rounded-2xl shadow-sm mt-6 mb-4 cursor-pointer"
        >
          <Pencil className="w-5 h-5" /> EDITAR
        </button>
      </div>
    </div>
  );
}

function DataRow({ label, value, isStatus = false, statusType = 'Activo' }) {
  return (
    <div>
      <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest">{label}</p>
      {isStatus ? (
        <p className={`font-black uppercase text-xs mt-1 ${statusType === 'Inactivo' ? 'text-red-600' : 'text-emerald-700'}`}>
          {value}
        </p>
      ) : (
        <p className="font-bold text-neutral-800 text-[15px]">{value}</p>
      )}
    </div>
  );
}