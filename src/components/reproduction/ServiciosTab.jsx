import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Syringe } from 'lucide-react';
import { FaVenusMars } from 'react-icons/fa6';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import BottomSheet from '@/components/ui/BottomSheet';
import ServicioForm from '@/components/inventario/ServicioForm';

export default function ServiciosTab({ animal }) {
  const animalId = animal?.id;
  const [editingService, setEditingService] = useState(null);

  const services = useLiveQuery(
    async () => {
      if (!animalId) return [];
      const svcs = await db.services
        .where('mother_id').equals(animalId)
        .toArray()
        .then(res => res.sort((a, b) => new Date(b.service_date) - new Date(a.service_date)));
      
      const filteredSvcs = svcs.filter(s => !s.deleted_at);

      const fatherIds = filteredSvcs.map(s => s.father_id).filter(Boolean);
      const fathers = fatherIds.length > 0 ? await db.animals.where('id').anyOf(fatherIds).toArray() : [];
      
      const fatherMap = {};
      fathers.forEach(f => { fatherMap[f.id] = f.number; });

      return filteredSvcs.map(service => ({
        ...service,
        father_number: service.father_id ? (fatherMap[service.father_id] || null) : null
      }));
    },
    [animalId]
  );

  const cleanAnimalId = animalId?.toString().replace('#', '') || '';

  return (
    <div className="relative min-h-[50vh] space-y-4">
      {services && services.length > 0 ? (
        services.map((service) => (
          <div
            key={service.id}
            onClick={() => setEditingService(service)}
            className="bg-white p-5 rounded-2xl border border-neutral-200 cursor-pointer active:scale-[0.98] transition-all hover:border-[#1A3621]/30 shadow-sm"
          >
            <span className="text-xs uppercase tracking-widest text-[#1B4820] font-bold">
              {new Date(service.service_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <h3 className="font-bold text-gray-800 text-lg mt-1">
              {service.type_conception === 'IA' ? 'Inseminación Artificial' : 
               service.type_conception === 'MN' ? 'Monta Natural' : 
               service.type_conception}
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              Padre/Pajuela: <span className="font-bold text-[#1B4820]">
                {service.father_number 
                  ? `#${service.father_number}` 
                  : (service.father_id ? `#${service.father_id.split('-')[0]}` : 'N/A')}
              </span>
            </p>
          </div>
        ))
      ) : (
        <div className="bg-white/50 p-10 rounded-2xl border border-dashed border-neutral-300 text-center">
          <FaVenusMars className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
          <p className="text-sm text-neutral-400 font-bold uppercase tracking-widest">Sin servicios registrados</p>
        </div>
      )}

      {/* Floating Action Button (FAB) CON LA NUEVA RUTA */}
      <Link
        to={`/inventario/perfil/servicio?id=${cleanAnimalId}`}
        className="fixed bottom-28 md:bottom-10 right-6 md:right-10 bg-[#1A3621] text-white p-4 rounded-full shadow-lg z-50 transition-all active:scale-95 cursor-pointer"
      >
        <Plus className="w-7 h-7" strokeWidth={3} />
      </Link>

      {/* MODAL DE EDICIÓN */}
      <BottomSheet
        isOpen={!!editingService}
        onClose={() => setEditingService(null)}
        title="Editar Servicio"
        description={editingService ? `Modificar servicio del ${new Date(editingService.service_date).toLocaleDateString('es-ES')}` : ''}
      >
        <div className="pb-8">
          <ServicioForm
            key={editingService ? editingService.id : 'new'}
            animal={animal}
            initialValues={editingService}
            onSubmitSuccess={() => setEditingService(null)}
            onCancel={() => setEditingService(null)}
            isModal={true}
          />
        </div>
      </BottomSheet>
    </div>
  );
}