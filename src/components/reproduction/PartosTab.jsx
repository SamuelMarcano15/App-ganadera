import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { GiCow } from 'react-icons/gi';
import { formatDateLocal } from '@/lib/dateUtils';

export default function PartosTab({ animalId }) {
  const offspring = useLiveQuery(
    () => db.animals
      .where('mother_id').equals(animalId)
      .and(a => !a.deleted_at)
      .toArray()
      .then(res => res.sort((a, b) => (b.birth_date || '').localeCompare(a.birth_date || ''))),
    [animalId]
  );

  return (
    <div className="space-y-4">
      {offspring && offspring.length > 0 ? (
        offspring.map((calf) => (
          <div key={calf.id} className="bg-white p-5 rounded-2xl border border-neutral-200">
            <span className="text-xs uppercase tracking-widest text-[#1B4820] font-bold">
              {formatDateLocal(calf.birth_date)}
            </span>
            <h3 className="font-bold text-gray-800 text-lg mt-1">Nacimiento de Cría #{calf.number}</h3>
            <p className="text-sm text-gray-500 mt-2">
              Sexo: <span className="font-bold text-[#1B4820]">{calf.sex}</span> • 
             
            </p>
          </div>
        ))
      ) : (
        <div className="bg-white/50 p-10 rounded-2xl border border-dashed border-neutral-300 text-center">
          <GiCow className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
          <p className="text-sm text-neutral-400 font-bold uppercase tracking-widest">Sin partos registrados</p>
        </div>
      )}
    </div>
  );
}
