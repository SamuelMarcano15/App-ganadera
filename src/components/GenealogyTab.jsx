import React from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import AnimalImage from '@/components/inventario/AnimalImage';
import { Share2 } from 'lucide-react';

export default function GenealogyTab({ animal }) {
  const animalId = animal?.id;

  // --- CONSULTA DE DATOS ---
  const data = useLiveQuery(async () => {
    if (!animal) return null;

    // 1. Ascendencia
    const father = animal.father_id ? await db.animals.get(animal.father_id) : null;
    const mother = animal.mother_id ? await db.animals.get(animal.mother_id) : null;
    const gPaternalf = father?.father_id ? await db.animals.get(father.father_id) : null;
    const gPaternalm = father?.mother_id ? await db.animals.get(father.mother_id) : null;
    const gMaternalf = mother?.father_id ? await db.animals.get(mother.father_id) : null;
    const gMaternalm = mother?.mother_id ? await db.animals.get(mother.mother_id) : null;

    // 2. Descendencia Directa (Hijos)
    const children = await db.animals
      .where('mother_id').equals(animalId)
      .or('father_id').equals(animalId)
      .toArray()
      .then(res => res.filter(a => !a.deleted_at));

    // 3. Nietos (Hijos de los hijos)
    const childrenIds = children.map(c => c.id);
    const grandchildren = await db.animals
      .where('mother_id').anyOf(childrenIds)
      .or('father_id').anyOf(childrenIds)
      .toArray()
      .then(res => res.filter(a => !a.deleted_at));

    return { father, mother, gPaternalf, gPaternalm, gMaternalf, gMaternalm, children, grandchildren };
  }, [animal]);

  if (!animal || !data) return null;

  // --- COMPONENTES INTERNOS ---
  const NodeContent = ({ animal, label, variant }) => (
    <div className="flex flex-col items-center z-10 shrink-0">
      <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 overflow-hidden bg-white shadow-md transition-transform hover:cursor-pointer hover:scale-110 ${
        variant === "main" ? 'border-[#1B4820] sm:w-24 sm:h-24 w-18 h-18 ring-4 ring-emerald-50' : 'border-neutral-200'
      }`}>
        <AnimalImage photoPath={animal?.photo_path} photoBlob={animal?.photo_blob} className="w-full h-full object-cover" />
      </div>
      <div className="mt-1 text-center">
        <p className={`text-[10px] font-black leading-none ${variant === "main" ? 'text-[#1B4820] text-sm' : 'text-neutral-800'}`}>
          #{animal?.number || '---'}
        </p>
        <p className="text-[7px] font-bold text-neutral-400 uppercase tracking-tighter">{label}</p>
      </div>
    </div>
  );

  const Node = ({ animal, label, variant = "default" }) => {
    // Si el animal no existe (ej. un abuelo no registrado), renderiza solo el diseño sin Link
    if (!animal) {
      return <NodeContent animal={null} label={label} variant={variant} />;
    }

    // --- ENLACE ACTUALIZADO ---
    // Agregamos &tab=detalles (o el nombre que uses) para forzar que al hacer clic 
    // se salga de la pestaña de genealogía y vuelva a la vista principal del perfil
    return (
      <Link to={`/inventario/perfil?id=${animal.id}`} className="block focus:outline-none">
        <NodeContent animal={animal} label={label} variant={variant} />
      </Link>
    );
  };

  const LevelIndicator = ({ text }) => (
    <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 bg-[#F0F2EB] px-2 pb-1 rounded-full border border-neutral-200 z-20">
      <span className="text-[6px] font-black text-neutral-400 uppercase tracking-widest whitespace-nowrap">{text}</span>
    </div>
  );

  return (
    <div className="py-8 px-2 max-w-2xl mx-auto overflow-hidden">
      
      {/* 1. NIVEL: ABUELOS */}
      <div className="grid grid-cols-4 gap-1 mb-4">
        <Node animal={data.gPaternalf} label="Abuelo Pat." />
        <Node animal={data.gPaternalm} label="Abuela Pat." />
        <Node animal={data.gMaternalf} label="Abuelo Mat." />
        <Node animal={data.gMaternalm} label="Abuela Mat." />
      </div>

      {/* LÍNEAS ABUELOS -> PADRES */}
      <div className="grid grid-cols-2 h-8 -mt-2 mb-2 relative">
        <div className="border-x border-t border-neutral-300 rounded-t-xl mx-auto w-1/2 h-full"></div>
        <div className="border-x border-t border-neutral-300 rounded-t-xl mx-auto w-1/2 h-full"></div>
      </div>

      {/* 2. NIVEL: PADRES */}
      <div className="grid grid-cols-2 gap-10 mb-6">
        <Node animal={data.father} label="Padre" />
        <Node animal={data.mother} label="Madre" />
      </div>

      {/* LÍNEAS PADRES -> SUJETO (Con Etiqueta) */}
      <div className="relative h-10 -mt-4 mb-4">
        <div className="absolute top-0 left-1/4 right-1/4 h-full border-x border-b border-neutral-300 rounded-b-2xl"></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-1/2 bg-neutral-300"></div>
        <LevelIndicator text="Padres" />
      </div>

      {/* 3. NIVEL: ANIMAL ACTUAL (CENTRO) */}
      <div className="flex justify-center mb-10">
        <Node animal={animal} label="Sujeto Actual" variant="main" />
      </div>

      {/* LÍNEA SUJETO -> HIJOS (Con Etiqueta) */}
      <div className="relative h-10 -mt-10 mb-4">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-full bg-neutral-300"></div>
        <LevelIndicator text="Hijos" />
      </div>

      {/* 4. NIVEL: HIJOS (Línea Horizontal con Scroll Corregido) */}
      <div className="w-full overflow-x-auto no-scrollbar py-2 mb-4">
        <div className="flex gap-4 w-max mx-auto px-4">
          {data.children.length > 0 ? (
            data.children.map(child => (
              <Node key={child.id} animal={child} label={child.sex === 'Hembra' ? 'Hija' : 'Hijo'} />
            ))
          ) : (
            <div className="flex flex-col items-center text-neutral-300 py-4 w-full">
               <Share2 className="w-6 h-6 opacity-20" />
               <p className="text-[8px] font-black uppercase mt-1">Sin Hijos</p>
            </div>
          )}
        </div>
      </div>

      {/* LÍNEAS HIJOS -> NIETOS (Con Etiqueta) */}
      {data.grandchildren.length > 0 && (
        <>
          <div className="relative h-10 -mt-2 mb-4">
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-neutral-300"></div>
            <LevelIndicator text="Nietos" />
          </div>

          {/* 5. NIVEL: NIETOS (Línea Horizontal con Scroll Corregido) */}
          <div className="w-full overflow-x-auto no-scrollbar py-2">
            <div className="flex gap-4 w-max mx-auto px-4">
              {data.grandchildren.map(grandchild => (
                <Node key={grandchild.id} animal={grandchild} label="Nieto(a)" />
              ))}
            </div>
          </div>
        </>
      )}

    </div>
  );
}