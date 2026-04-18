import React, { useState } from 'react';
import { 
  TrendingUp, 
  Plus, 
  Scale, 
  Ruler, 
  Info,
  History
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { formatWeight, formatDateLocal } from '@/lib/dateUtils';
import AnimalImage from '@/components/inventario/AnimalImage';
import BottomSheet from '@/components/ui/BottomSheet';
import EventForm from '@/components/inventario/EventForm';

export default function EvolutionTab({ animal }) {
  const animalId = animal?.id;
  const [editingEvent, setEditingEvent] = useState(null);
  
  // Consulta reactiva a los eventos de crecimiento
  const events = useLiveQuery(
    () => db.growth_events
      .where('animal_id').equals(animalId)
      .and(e => !e.deleted_at)
      .toArray()
      .then(res => res.sort((a, b) => b.event_date.localeCompare(a.event_date))),
    [animalId]
  );

  if (!animal) return null;

  return (
    <div className="max-w-2xl mx-auto py-2 pb-24 relative">
      
      {/* TÍTULO DE SECCIÓN COMPACTO */}
      <div className="mb-6 px-2">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-black text-[#1B4820] leading-tight">Evolución</h2>
          <div className="bg-[#EEF7EE] px-3 py-1.5 rounded-xl text-[#1B4820] font-black text-lg border border-[#1B4820]/10">
            #{animal.number}
          </div>
        </div>
      </div>

      <div className="relative pl-6 border-l-2 border-neutral-200 space-y-6 ml-4">
        {events && events.length > 0 ? (
          events.map((event, i) => (
            <div key={event.id} className="relative">
              <div className={`absolute -left-[33px] top-0 w-4 h-4 rounded-full border-[3px] border-[#F7F7F2] shadow-sm z-10 ${
                i === 0 ? 'bg-[#1B4820]' : 'bg-neutral-300'
              }`} />

              <article 
                className="flex flex-col bg-white rounded-[2rem] overflow-hidden shadow-sm border border-neutral-100 group cursor-pointer active:scale-[0.98] transition-all"
                onClick={() => setEditingEvent(event)}
              >
                
                {/* IMAGEN DEL EVENTO */}
                <div className="relative h-48 md:h-80 w-full overflow-hidden bg-neutral-100">
                  <AnimalImage 
                    photoPath={event.photo_path}
                    photoBlob={event.photo_blob}
                    alt={event.event_type}
                    className="w-full h-full transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[9px] font-bold uppercase">
                    {formatDateLocal(event.event_date)}
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xl font-black text-neutral-900">{event.event_type}</h4>
                      
                      {/* DATOS SECUNDARIOS */}
                      {(event.scrotal_circumference_cm || event.navel_length) && (
                        <div className="flex gap-3 mt-1">
                          {event.scrotal_circumference_cm && (
                            <div className="flex items-center gap-1 text-neutral-500">
                              <Ruler className="w-3 h-3" />
                              <span className="text-[10px] font-bold">C.E: {event.scrotal_circumference_cm}cm</span>
                            </div>
                          )}
                          {event.navel_length && (
                            <div className="flex items-center gap-1 text-neutral-500">
                              <Info className="w-3 h-3" />
                              <span className="text-[10px] font-bold">Ombligo: {event.navel_length}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* GRID DE PESOS */}
                  <div className="grid grid-cols-2 gap-2">
                    <DataBox icon={Scale} label="Peso Cría" value={formatWeight(event.weight_kg)} />
                    <DataBox icon={Scale} label="Peso Madre" value={formatWeight(event.mother_weight_kg)} />
                  </div>

                  {/* OBSERVACIONES */}
                  {event.observations && (
                    <div className="bg-[#F8F9F5] p-3 rounded-xl">
                      <p className="text-[11px] text-neutral-600 font-medium leading-snug">
                        <span className="text-[8px] font-black text-neutral-400 uppercase mr-1">Nota:</span>
                        {event.observations}
                      </p>
                    </div>
                  )}
                </div>
              </article>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-neutral-400">
            <History className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm font-bold uppercase tracking-widest text-center">Sin eventos registrados</p>
          </div>
        )}
      </div>

      {/* --- ENLACE ACTUALIZADO HACIA EVENTO --- */}
      <Link to={`/inventario/perfil/evento?id=${animalId}`} className="fixed bottom-28 md:bottom-10 right-6 md:right-10 bg-[#1B4820] text-white p-4 rounded-full shadow-2xl z-50 transition-all active:scale-95 cursor-pointer">
        <Plus className="w-7 h-7" strokeWidth={3} />
      </Link>

      {/* MODAL DE EDICIÓN */}
      <BottomSheet
        isOpen={!!editingEvent}
        onClose={() => setEditingEvent(null)}
        title="Editar Evento"
        description={`Modifica los detalles del registro de ${editingEvent?.event_type}`}
      >
        <EventForm 
          animal={animal}
          initialValues={editingEvent}
          existingEvents={events || []}
          onSubmitSuccess={() => setEditingEvent(null)}
          onCancel={() => setEditingEvent(null)}
          isModal
        />
      </BottomSheet>

    </div>
  );
}

function DataBox({ icon: Icon, label, value }) {
  return (
    <div className="bg-neutral-50 p-2.5 rounded-xl border border-neutral-100 flex items-center gap-2">
      <div className="bg-white p-1.5 rounded-lg shadow-sm">
        <Icon className="w-3.5 h-3.5 text-[#8C6746]" />
      </div>
      <div>
        <p className="text-[8px] font-black text-neutral-400 uppercase leading-none mb-0.5">{label}</p>
        <p className="text-sm font-black text-neutral-800 leading-none">{value}</p>
      </div>
    </div>
  );
}