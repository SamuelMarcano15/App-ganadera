import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Stethoscope } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { formatDateLocal } from '@/lib/dateUtils';
import BottomSheet from '@/components/ui/BottomSheet';
import TactoForm from '@/components/inventario/TactoForm';

export default function TactosTab({ animal }) {
  const animalId = animal?.id;
  const [editingCheck, setEditingCheck] = useState(null);

  const checks = useLiveQuery(
    () => db.pregnancy_checks
      .where('animal_id').equals(animalId)
      .and(c => !c.deleted_at)
      .toArray()
      .then(res => res.sort((a, b) => b.check_date.localeCompare(a.check_date))),
    [animalId]
  );

  const cleanAnimalId = animalId?.toString().replace('#', '') || '';

  return (
    <div className="relative min-h-[50vh] space-y-4">
      {checks && checks.length > 0 ? (
        checks.map((check) => (
          <div 
            key={check.id} 
            onClick={() => setEditingCheck(check)}
            className="bg-white p-5 rounded-2xl border border-neutral-200 cursor-pointer active:scale-[0.98] transition-all hover:border-[#1B4820]/30 shadow-sm"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs uppercase tracking-widest text-[#1B4820] font-bold">
                {formatDateLocal(check.check_date)}
              </span>
              <div className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                check.result === 'Preñada' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
              }`}>
                {check.result}
              </div>
            </div>
            <h3 className="font-bold text-gray-800 text-lg">Diagnóstico: {check.result}</h3>
            {check.observations && (
              <p className="text-sm text-gray-500 mt-2 italic">"{check.observations}"</p>
            )}
          </div>
        ))
      ) : (
        <div className="bg-white/50 p-10 rounded-2xl border border-dashed border-neutral-300 text-center">
          <Stethoscope className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
          <p className="text-sm text-neutral-400 font-bold uppercase tracking-widest">Sin tactos registrados</p>
        </div>
      )}

      {/* Floating Action Button (FAB) CON LA NUEVA RUTA */}
      <Link 
        to={`/inventario/perfil/tacto?id=${cleanAnimalId}`} 
        className="fixed bottom-28 md:bottom-10 right-6 md:right-10 bg-[#1B4820] text-white p-4 rounded-full shadow-2xl z-50 transition-all active:scale-95 cursor-pointer"
      >
        <Plus className="w-7 h-7" strokeWidth={3} />
      </Link>

      {/* MODAL DE EDICIÓN */}
      <BottomSheet
        isOpen={!!editingCheck}
        onClose={() => setEditingCheck(null)}
        title="Editar Tacto"
        description={editingCheck ? `Modificar diagnóstico del ${formatDateLocal(editingCheck.check_date)}` : ''}
      >
        <div className="pb-8">
          <TactoForm
            animal={animal}
            initialValues={editingCheck}
            onSubmitSuccess={() => setEditingCheck(null)}
            onCancel={() => setEditingCheck(null)}
            isModal={true}
          />
        </div>
      </BottomSheet>
    </div>
  );
}