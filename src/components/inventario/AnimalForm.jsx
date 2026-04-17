import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Camera, Save, X, ChevronUp, ChevronDown, Trash2, Plus, CheckCircle, TriangleAlert } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

import { db } from '@/lib/db';
import { addToSyncQueue } from '@/lib/syncUtils';
import { compressImage } from '@/lib/imageUtils';
import GenealogySelector from './GenealogySelector';
import CustomSelect from '@/components/ui/CustomSelect';
import { useNavigate } from 'react-router-dom';

// Esquema de validación (Se mantiene igual)
const animalSchema = z.object({
  number: z.string().min(1, 'El código es obligatorio'),
  sex: z.enum(['Macho', 'Hembra']),
  color: z.string().nullable().optional(),
  origin_service_id: z.string().nullable().optional(),
  birth_date: z.string().nullable().optional().refine(val => !val || new Date(val) <= new Date(), { message: 'La fecha no puede ser futura' }),
  birth_weight_kg: z.preprocess((val) => (val === '' || val === null) ? undefined : Number(val), z.number().optional()),
  mother_weight_at_birth: z.preprocess((val) => (val === '' || val === null) ? undefined : Number(val), z.number().optional()),
  navel_length: z.string().nullable().optional(),
  birth_observations: z.string().nullable().optional(),
  weaning_date: z.string().nullable().optional().refine(val => !val || new Date(val) <= new Date(), { message: 'La fecha no puede ser futura' }),
  weaning_weight_kg: z.preprocess((val) => (val === '' || val === null) ? undefined : Number(val), z.number().optional()),
  mother_weight_at_weaning: z.preprocess((val) => (val === '' || val === null) ? undefined : Number(val), z.number().optional()),
  sc_at_weaning: z.preprocess((val) => (val === '' || val === null) ? undefined : Number(val), z.number().optional()),
  weaning_observations: z.string().nullable().optional(),
  father_id: z.string().nullable().optional(),
  mother_id: z.string().nullable().optional(),
  current_weight_kg: z.preprocess((val) => (val === '' || val === null) ? undefined : Number(val), z.number().optional()),
  observations: z.string().nullable().optional(),
  status: z.enum(['Activo', 'Inactivo']).default('Activo'),
  inactivity_reason: z.string().nullable().optional(),
});

const ImageUploader = ({ preview, onCapture, onRemove, label }) => {
  const inputRef = useRef(null);
  return (
    <div
      onClick={() => !preview && inputRef.current?.click()}
      className={`relative border-2 border-dashed border-neutral-300 rounded-2xl flex flex-col items-center justify-center text-neutral-400 bg-white/50 hover:bg-white cursor-pointer transition-all group overflow-hidden shadow-inner ${preview ? 'h-48' : 'h-32'}`}
    >
      {preview ? (
        <>
          <img src={preview} alt={label} className="w-full h-full object-cover animate-in fade-in zoom-in duration-300" />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="absolute top-3 right-3 bg-red-500 text-white p-2.5 rounded-full shadow-lg hover:bg-red-600 active:scale-90 transition-all z-10 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </>
      ) : (
        <>
          <Camera className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform text-neutral-500" strokeWidth={1.5} />
          <span className="text-[11px] font-black uppercase tracking-widest text-neutral-500">{label}</span>
        </>
      )}
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onCapture} />
    </div>
  );
};

export default function AnimalForm({ initialValues, onSubmitSuccess, onCancel, onOpenModal, isModal = false }) {
  const navigate = useNavigate();
  const [activeAccordions, setActiveAccordions] = useState({ birth: false, weaning: false, service: false });
  const [eventIds, setEventIds] = useState({ birth: null, weaning: null });
  const [images, setImages] = useState({
    main: { blob: null, preview: initialValues?.photo_path || null },
    birth: { blob: null, preview: null },
    weaning: { blob: null, preview: null }
  });
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });
  const [showQuickService, setShowQuickService] = useState(false);
  const [isSavingQuickService, setIsSavingQuickService] = useState(false);
  const [quickServiceData, setQuickServiceData] = useState({ date: '', type: 'Monta Natural' });

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(animalSchema),
    defaultValues: useMemo(() => {
      if (!initialValues) return { sex: 'Macho', status: 'Activo' };
      return { ...initialValues, current_weight_kg: initialValues.last_weight_kg };
    }, [initialValues])
  });

  const selectedSex = watch('sex');
  const selectedStatus = watch('status');
  const fatherId = watch('father_id');
  const motherId = watch('mother_id');
  const originServiceId = watch('origin_service_id');

  // Carga de eventos existentes (Se mantiene igual)
  useEffect(() => {
    const loadExistingEvents = async () => {
      if (!initialValues?.id) return;
      const events = await db.growth_events.where('animal_id').equals(initialValues.id).toArray();
      const birth = events.find(e => e.event_type === 'Nacimiento');
      const weaning = events.find(e => e.event_type === 'Destete');

      if (birth) {
        setEventIds(prev => ({ ...prev, birth: birth.id }));
        setValue('birth_date', birth.event_date);
        setValue('birth_weight_kg', birth.weight_kg);
        setValue('mother_weight_at_birth', birth.mother_weight_kg);
        setValue('navel_length', birth.navel_length);
        setValue('birth_observations', birth.observations);
        setImages(prev => ({ ...prev, birth: { blob: null, preview: birth.photo_path } }));
      }

      if (weaning) {
        setEventIds(prev => ({ ...prev, weaning: weaning.id }));
        setValue('weaning_date', weaning.event_date);
        setValue('weaning_weight_kg', weaning.weight_kg);
        setValue('mother_weight_at_weaning', weaning.mother_weight_kg);
        setValue('sc_at_weaning', weaning.scrotal_circumference_cm);
        setValue('weaning_observations', weaning.observations);
        setImages(prev => ({ ...prev, weaning: { blob: null, preview: weaning.photo_path } }));
      }
    };
    loadExistingEvents();
  }, [initialValues, setValue]);

  const motherServices = useLiveQuery(
    async () => {
      if (!motherId) return [];
      const services = await db.services.where('mother_id').equals(motherId).toArray();
      const validServices = services.filter(s => !s.deleted_at);
      const fatherIds = validServices.map(s => s.father_id).filter(Boolean);
      const fathers = fatherIds.length > 0 ? await db.animals.where('id').anyOf(fatherIds).toArray() : [];
      const fatherMap = {};
      fathers.forEach(f => { fatherMap[f.id] = f.number; });
      return validServices.map(service => ({
        ...service,
        father_number: service.father_id ? (fatherMap[service.father_id] || null) : null
      }));
    }, [motherId]
  );

  const motherServicesOptions = useMemo(() => {
    if (!motherServices) return [];
    return motherServices.map(s => ({
      value: s.id,
      label: `${new Date(s.service_date).toLocaleDateString()} - ${s.type_conception} ${s.father_number ? `(Toro: #${s.father_number})` : ''}`
    }));
  }, [motherServices]);

  const handleImageCapture = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const compressedBlob = await compressImage(file);
      const previewUrl = URL.createObjectURL(compressedBlob);
      setImages(prev => ({ ...prev, [type]: { blob: compressedBlob, preview: previewUrl } }));
    } catch (error) {
      console.error('Error procesando imagen:', error);
    }
  };

  const removeImage = (type) => {
    setImages(prev => ({ ...prev, [type]: { blob: null, preview: null } }));
  };

  // --- FASE 2: BLINDAJE LOCAL (Cero espera a Supabase) ---
  const getLocalUserId = () => {
    return localStorage.getItem("ganadera_user_id");
  };

  const handleQuickServiceCreate = async () => {
    if (!quickServiceData.date) return alert('Selecciona una fecha');
    setIsSavingQuickService(true);
    try {
      const userId = getLocalUserId();
      if (!userId) return navigate('/login');

      const newService = {
        id: crypto.randomUUID(),
        user_id: userId,
        mother_id: motherId,
        father_id: fatherId || null,
        type_conception: quickServiceData.type,
        service_date: quickServiceData.date,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await db.transaction('rw', [db.services, db.sync_queue], async () => {
        await db.services.add(newService);
        await addToSyncQueue('services', 'INSERT', newService);
      });

      setToast({ show: true, type: 'success', message: 'Servicio registrado' });
      setTimeout(() => {
        setToast({ show: false, type: 'success', message: '' });
        setValue('origin_service_id', newService.id);
        setShowQuickService(false);
      }, 400);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingQuickService(false);
    }
  };

  const handleSave = async (data) => {
    try {
      const userId = getLocalUserId();
      if (!userId) return navigate('/login');

      const isEditing = !!initialValues?.id;
      const animalId = initialValues?.id || crypto.randomUUID();
      const now = new Date().toISOString();

      await db.transaction('rw', [db.animals, db.growth_events, db.sync_queue], async () => {
        const animalData = {
          id: animalId,
          user_id: userId,
          number: data.number,
          sex: data.sex,
          status: data.status || 'Activo',
          inactivity_reason: data.status === 'Inactivo' ? data.inactivity_reason : null,
          color: data.color || null,
          birth_date: data.birth_date || null,
          mother_id: data.mother_id || null,
          father_id: data.father_id || null,
          origin_service_id: data.origin_service_id || null,
          observations: data.observations || null,
          photo_path: isEditing ? initialValues?.photo_path : null,
          photo_blob: images.main.blob || (isEditing ? initialValues.photo_blob : null),
          last_weight_kg: data.current_weight_kg || data.weaning_weight_kg || data.birth_weight_kg || (isEditing ? initialValues.last_weight_kg : null),
          last_weight_date: data.current_weight_kg ? now : (data.weaning_weight_kg ? data.weaning_date : now),
          created_at: isEditing ? initialValues.created_at : now,
          updated_at: now,
          deleted_at: null
        };

        await db.animals.put(animalData);
        await addToSyncQueue('animals', isEditing ? 'UPDATE' : 'INSERT', animalData);

        if (data.birth_date) {
          const birthEvent = {
            id: eventIds.birth || crypto.randomUUID(),
            user_id: userId, animal_id: animalId, event_type: 'Nacimiento', event_date: data.birth_date,
            weight_kg: data.birth_weight_kg || null, mother_weight_kg: data.mother_weight_at_birth || null,
            navel_length: data.navel_length || null, observations: data.birth_observations || null,
            photo_blob: images.birth.blob || (eventIds.birth && isEditing ? undefined : null),
            updated_at: now
          };
          await db.growth_events.put(birthEvent);
          await addToSyncQueue('growth_events', eventIds.birth ? 'UPDATE' : 'INSERT', birthEvent);
        }

        if (data.weaning_date) {
          const weaningEvent = {
            id: eventIds.weaning || crypto.randomUUID(),
            user_id: userId, animal_id: animalId, event_type: 'Destete', event_date: data.weaning_date,
            weight_kg: data.weaning_weight_kg || null, mother_weight_kg: data.mother_weight_at_weaning || null,
            scrotal_circumference_cm: data.sc_at_weaning || null, observations: data.weaning_observations || null,
            photo_blob: images.weaning.blob || (eventIds.weaning && isEditing ? undefined : null),
            updated_at: now
          };
          await db.growth_events.put(weaningEvent);
          await addToSyncQueue('growth_events', eventIds.weaning ? 'UPDATE' : 'INSERT', weaningEvent);
        }
      });

      setToast({ show: true, type: 'success', message: isEditing ? 'Cambios guardados' : 'Registro exitoso' });
      setTimeout(() => {
        setToast({ show: false, type: 'success', message: '' });
        onSubmitSuccess && onSubmitSuccess(animalId);
      }, 400);

    } catch (err) {
      console.error(err);
      setToast({ show: true, type: 'error', message: 'Error al guardar' });
    }
  };

  return (
    <form onSubmit={handleSubmit(handleSave)} className="pb-10">
      {/* Toast de notificación */}
      {toast.show && (
        <div className={`fixed z-[100] px-5 py-4 ${toast.type === 'success' ? 'bg-[#1A3621]' : 'bg-red-900'} text-white rounded-2xl shadow-2xl transition-all animate-in fade-in slide-in-from-top-5 top-5 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:-translate-x-0 font-bold text-sm flex items-center gap-3 w-[85%] max-w-sm sm:w-auto`}>
          {toast.type === 'success' ? <CheckCircle className="w-6 h-6 text-emerald-400" /> : <TriangleAlert className="w-6 h-6 text-red-400" />}
          {toast.message}
        </div>
      )}

      {/* Identificación Visual */}
      <section className="bg-[#F4F5F0] rounded-3xl p-5 mb-4 shadow-sm border border-neutral-100/50">
        <div className="mb-5">
          <ImageUploader label="Foto del Animal" preview={images.main.preview} onCapture={(e) => handleImageCapture(e, 'main')} onRemove={() => removeImage('main')} />
        </div>
        <div>
          <label className="text-sm font-bold text-[#1B4820] mb-2 block">Descripción</label>
          <textarea {...register('observations')} placeholder="..." rows={3} className="w-full bg-white rounded-2xl px-4 py-3 text-neutral-800 border border-transparent focus:border-[#1B4820]/30 transition-all shadow-sm resize-none" />
        </div>
      </section>

      {/* Identificación Básica */}
      <section className="bg-neutral-50 rounded-3xl p-5 mb-4 border border-neutral-100 space-y-4">
        <div>
          <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block ml-1">Código / Número *</label>
          <input {...register('number')} placeholder="Ej: 1234" className={`w-full bg-white rounded-xl px-4 py-3 border transition-all ${errors.number ? 'border-red-500' : 'border-neutral-100'}`} />
          {errors.number && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.number.message}</p>}
        </div>
        <div>
          <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block ml-1">Sexo</label>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setValue('sex', 'Macho')} className={`py-3 rounded-xl font-bold text-sm transition-all border ${selectedSex === 'Macho' ? 'bg-[#1B4820] text-white border-[#1B4820]' : 'bg-white text-neutral-500 border-neutral-100'}`}>MACHO</button>
            <button type="button" onClick={() => setValue('sex', 'Hembra')} className={`py-3 rounded-xl font-bold text-sm transition-all border ${selectedSex === 'Hembra' ? 'bg-[#1B4820] text-white border-[#1B4820]' : 'bg-white text-neutral-500 border-neutral-100'}`}>HEMBRA</button>
          </div>
        </div>
      </section>

      {/* Estado */}
      <section className="bg-white rounded-3xl p-5 mb-4 border border-neutral-100 shadow-sm space-y-4">
        <CustomSelect label="Estado" value={selectedStatus} onChange={(val) => setValue('status', val)} options={[{ value: 'Activo', label: '🟢 Activo' }, { value: 'Inactivo', label: '🔴 Inactivo' }]} />
        {selectedStatus === 'Inactivo' && (
          <textarea {...register('inactivity_reason')} placeholder="Razón de baja..." className="w-full bg-neutral-50 rounded-xl px-4 py-3 text-sm border border-neutral-100 min-h-[100px] resize-none" />
        )}
      </section>

      {/* Genealogía */}
      <section className="bg-neutral-100/50 rounded-3xl p-5 mb-4 border border-neutral-100 space-y-4">
        <h3 className="text-lg font-bold text-[#1B4820]">Genealogía</h3>
        <GenealogySelector label="Padre" sex="Macho" value={fatherId} onChange={(id) => setValue('father_id', id)} onCreateNew={(sex) => onOpenModal && onOpenModal(sex, (id) => setValue('father_id', id))} />
        <GenealogySelector label="Madre" sex="Hembra" value={motherId} onChange={(id) => setValue('mother_id', id)} onCreateNew={(sex) => onOpenModal && onOpenModal(sex, (id) => setValue('mother_id', id))} />
      </section>

      {/* Servicio de Origen */}
      {motherId && (
        <div className="bg-neutral-50 rounded-3xl p-5 mb-4 border border-neutral-100">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setActiveAccordions(p => ({ ...p, service: !p.service }))}>
            <h3 className="text-lg font-bold text-[#1B4820]">Servicio de Origen</h3>
            {activeAccordions.service ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
          {activeAccordions.service && (
            <div className="pt-5 space-y-4">
              {showQuickService ? (
                <div className="bg-white p-4 rounded-2xl border border-neutral-200 space-y-4">
                  <input type="date" value={quickServiceData.date} onChange={e => setQuickServiceData(d => ({ ...d, date: e.target.value }))} className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3" />
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setShowQuickService(false)} className="flex-1 bg-neutral-100 py-3 rounded-xl font-bold text-xs">Cancelar</button>
                    <button type="button" disabled={isSavingQuickService} onClick={handleQuickServiceCreate} className="flex-1 bg-[#1B4820] text-white py-3 rounded-xl font-bold text-xs">
                      {isSavingQuickService ? '...' : 'Guardar y Usar'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <CustomSelect value={originServiceId} onChange={val => setValue('origin_service_id', val)} options={motherServicesOptions} placeholder="Seleccionar servicio..." />
                  <button type="button" onClick={() => setShowQuickService(true)} className="w-full flex items-center justify-center gap-2 bg-neutral-50 border border-dashed border-neutral-300 py-3.5 rounded-xl font-bold text-xs">
                    <Plus className="w-4 h-4" /> REGISTRAR NUEVO SERVICIO
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Eventos: Nacimiento y Destete (Simplificados visualmente para el código) */}
      <div className="bg-neutral-50 rounded-3xl p-5 mb-4 border border-neutral-100">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setActiveAccordions(p => ({ ...p, birth: !p.birth }))}>
          <h3 className="text-lg font-bold text-[#1B4820]">Evento: Nacimiento</h3>
          {activeAccordions.birth ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
        {activeAccordions.birth && (
          <div className="pt-5 space-y-4">
            <ImageUploader label="Foto al Nacer" preview={images.birth.preview} onCapture={(e) => handleImageCapture(e, 'birth')} onRemove={() => removeImage('birth')} />
            <input type="date" {...register('birth_date')} className="w-full bg-white rounded-xl px-4 py-3 border border-neutral-100" />
            <input type="number" step="any" {...register('birth_weight_kg')} placeholder="Peso al Nacer (KG)" className="w-full bg-white rounded-xl px-4 py-3 border border-neutral-100" />
          </div>
        )}
      </div>

      <div className="bg-neutral-50 rounded-3xl p-5 mb-4 border border-neutral-100">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setActiveAccordions(p => ({ ...p, weaning: !p.weaning }))}>
          <h3 className="text-lg font-bold text-[#1B4820]">Evento: Destete</h3>
          {activeAccordions.weaning ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
        {activeAccordions.weaning && (
          <div className="pt-5 space-y-4">
            <ImageUploader label="Foto al Destete" preview={images.weaning.preview} onCapture={(e) => handleImageCapture(e, 'weaning')} onRemove={() => removeImage('weaning')} />
            <input type="date" {...register('weaning_date')} className="w-full bg-white rounded-xl px-4 py-3 border border-neutral-100" />
            <input type="number" step="any" {...register('weaning_weight_kg')} placeholder="Peso al Destete (KG)" className="w-full bg-white rounded-xl px-4 py-3 border border-neutral-100" />
          </div>
        )}
      </div>

      {/* Peso Actual */}
      <section className="bg-neutral-50 rounded-3xl p-5 mb-4 border border-neutral-100">
        <h3 className="text-lg font-bold text-[#1B4820] mb-4">Peso Actual</h3>
        <input type="number" step="any" {...register('current_weight_kg')} placeholder="Peso Actual (KG)" className="w-full bg-white rounded-xl px-4 py-3 border border-neutral-100" />
      </section>

      {/* Botones Flotantes (Footer) */}
      {!isModal && (
        <div className="fixed bottom-0 left-0 w-full bg-[#fcfcfa]/90 backdrop-blur-md border-t border-neutral-100 p-4 z-40">
          <div className="max-w-md mx-auto grid grid-cols-2 gap-3">
            <button type="button" onClick={onCancel} className="flex items-center justify-center gap-2 bg-[#D15E5A] text-white rounded-full py-4 font-bold text-xs uppercase tracking-widest">
              <X className="w-5 h-5" strokeWidth={2.5} /> Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="flex items-center justify-center gap-2 bg-[#1A3621] text-white rounded-full py-4 font-bold text-xs uppercase tracking-widest shadow-lg">
              {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" strokeWidth={2.5} />}
              Guardar
            </button>
          </div>
        </div>
      )}
    </form>
  );
}