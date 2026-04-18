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
import { formatShortDateLocal } from '@/lib/dateUtils';

// Esquema de validación con Zod
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
  current_sc_cm: z.preprocess((val) => (val === '' || val === null) ? undefined : Number(val), z.number().optional()),
  observations: z.string().nullable().optional(),
  status: z.enum(['Activo', 'Inactivo']).default('Activo'),
  inactivity_reason: z.string().nullable().optional(),
});

// --- SUB-COMPONENTE REUTILIZABLE PARA IMÁGENES ---
const ImageUploader = ({ preview, onCapture, onRemove, label, id }) => {
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
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onCapture} />
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

  const defaultValuesMapped = useMemo(() => {
    if (!initialValues) return { sex: 'Macho', status: 'Activo' };
    return {
      ...initialValues,
      current_weight_kg: initialValues.last_weight_kg,
    };
  }, [initialValues]);

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(animalSchema),
    defaultValues: defaultValuesMapped
  });

  const selectedSex = watch('sex');
  const selectedStatus = watch('status');
  const fatherId = watch('father_id');
  const motherId = watch('mother_id');

  // --- CARGA DE DATOS AL EDITAR (FASE 3 & MEMORIA) ---
  useEffect(() => {
    const loadExistingEvents = async () => {
      if (!initialValues?.id) return;
      const events = await db.growth_events.where('animal_id').equals(initialValues.id).toArray();
      const birth = events.find(e => e.event_type === 'Nacimiento');
      const weaning = events.find(e => e.event_type === 'Destete');

      // Imagen Principal
      if (initialValues.photo_blob) {
        const url = URL.createObjectURL(initialValues.photo_blob);
        setImages(prev => ({ ...prev, main: { blob: null, preview: url } }));
      }

      if (birth) {
        setEventIds(prev => ({ ...prev, birth: birth.id }));
        setValue('birth_date', birth.event_date);
        setValue('birth_weight_kg', birth.weight_kg);
        setValue('mother_weight_at_birth', birth.mother_weight_kg);
        setValue('navel_length', birth.navel_length);
        setValue('birth_observations', birth.observations);
        
        // Priorizar BLOB local para previsualización en edición
        let birthPreview = birth.photo_path;
        if (birth.photo_blob) {
          birthPreview = URL.createObjectURL(birth.photo_blob);
        }
        setImages(prev => ({ ...prev, birth: { blob: null, preview: birthPreview } }));
      }

      if (weaning) {
        setEventIds(prev => ({ ...prev, weaning: weaning.id }));
        setValue('weaning_date', weaning.event_date);
        setValue('weaning_weight_kg', weaning.weight_kg);
        setValue('mother_weight_at_weaning', weaning.mother_weight_kg);
        setValue('sc_at_weaning', weaning.scrotal_circumference_cm);
        setValue('weaning_observations', weaning.observations);

        // Priorizar BLOB local
        let weaningPreview = weaning.photo_path;
        if (weaning.photo_blob) {
          weaningPreview = URL.createObjectURL(weaning.photo_blob);
        }
        setImages(prev => ({ ...prev, weaning: { blob: null, preview: weaningPreview } }));
      }
    };
    loadExistingEvents();

    // Limpieza de memoria: Revocamos los ObjectURLs al desmontar
    return () => {
      setImages(prev => {
        if (prev.main.preview?.startsWith('blob:')) URL.revokeObjectURL(prev.main.preview);
        if (prev.birth.preview?.startsWith('blob:')) URL.revokeObjectURL(prev.birth.preview);
        if (prev.weaning.preview?.startsWith('blob:')) URL.revokeObjectURL(prev.weaning.preview);
        return prev;
      });
    };
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
    },
    [motherId]
  );

  const toggleAccordion = (section) => {
    setActiveAccordions(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const originServiceId = watch('origin_service_id');

  const motherServicesOptions = useMemo(() => {
    if (!motherServices) return [];
    return motherServices.map(s => {
      let toroInfo = '';
      if (s.father_number) {
        toroInfo = ` (Toro: #${s.father_number})`;
      } else if (s.father_id) {
        if (s.father_id.includes('-') && s.father_id.length > 20) {
          toroInfo = ` (Toro: Desconocido/Eliminado)`;
        } else {
          toroInfo = ` (Toro: ${s.father_id})`;
        }
      } else {
        toroInfo = ` (Sin Toro)`;
      }
      return {
        value: s.id,
        label: `${formatShortDateLocal(s.service_date)} - ${s.type_conception}${toroInfo}`
      };
    });
  }, [motherServices]);

  const serviceTypeOptions = [
    { value: 'Monta Natural', label: 'Monta Natural' },
    { value: 'Inseminación Artificial', label: 'Inseminación Artificial' },
  ];

  const handleImageCapture = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const compressedBlob = await compressImage(file);
      const previewUrl = URL.createObjectURL(compressedBlob);
      setImages(prev => ({ ...prev, [type]: { blob: compressedBlob, preview: previewUrl } }));
    } catch (error) {
      console.error('Error procesando imagen:', error);
      alert('Error al comprimir la foto.');
    }
  };

  const removeImage = (type) => {
    setImages(prev => ({ ...prev, [type]: { blob: null, preview: null } }));
  };

  // --- LÓGICA LOCAL-FIRST (Fase 2) ---
  const getLocalUserId = () => {
    return localStorage.getItem("ganadera_user_id");
  };

  const handleQuickServiceCreate = async () => {
    if (!quickServiceData.date) return alert('Selecciona una fecha para el servicio');
    if (isSavingQuickService) return;

    setIsSavingQuickService(true);

    try {
      const userId = getLocalUserId();

      if (!userId) {
        setToast({ show: true, type: 'error', message: 'Sesión expirada. Conéctate a internet.' });
        navigate('/login');
        return;
      }

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

      setToast({ show: true, type: 'success', message: 'Servicio registrado correctamente' });

      setTimeout(() => {
        setToast({ show: false, type: 'success', message: '' });
        setValue('origin_service_id', newService.id);
        setShowQuickService(false);
      }, 500);

    } catch (err) {
      console.error('Error creando servicio rápido', err);
      setToast({ show: true, type: 'error', message: 'Fallo al registrar servicio' });
      setTimeout(() => setToast(p => ({ ...p, show: false })), 3000);
    } finally {
      setIsSavingQuickService(false);
    }
  };

  const handleSave = async (data) => {
    try {
      const userId = getLocalUserId();

      if (!userId) {
        alert('Sesión expirada. Por favor, conéctate a internet e inicia sesión nuevamente.');
        navigate('/login');
        return;
      }

      const isEditing = !!initialValues?.id;
      const animalId = initialValues?.id || crypto.randomUUID();
      const now = new Date().toISOString();

      const mainImg = {
        blob: images.main.blob || null,
        url: isEditing ? initialValues?.photo_path : null
      };

      const birthImg = {
        blob: images.birth.blob || null,
        url: images.birth.preview && typeof images.birth.preview === 'string' && !images.birth.preview.startsWith('blob:') ? images.birth.preview : null
      };

      const weaningImg = {
        blob: images.weaning.blob || null,
        url: images.weaning.preview && typeof images.weaning.preview === 'string' && !images.weaning.preview.startsWith('blob:') ? images.weaning.preview : null
      };

      await db.transaction('rw', [db.animals, db.growth_events, db.sync_queue], async () => {
        const animalData = {
          id: animalId,
          user_id: userId,
          number: data.number,
          sex: data.sex,
          status: data.status || 'Activo',
          inactivity_reason: data.status === 'Inactivo' ? (data.inactivity_reason || 'No se especificó una razón para la baja del animal.') : null,
          color: data.color || null,
          birth_date: data.birth_date || null,
          mother_id: data.mother_id || null,
          father_id: data.father_id || null,
          origin_service_id: data.origin_service_id || null,
          observations: data.observations || null,
          photo_path: mainImg.url,
          photo_blob: mainImg.blob || (isEditing ? initialValues.photo_blob : null),
          last_weight_kg: data.current_weight_kg || data.weaning_weight_kg || data.birth_weight_kg || (isEditing ? initialValues.last_weight_kg : null),
          last_weight_date: data.current_weight_kg ? now : (data.weaning_weight_kg ? data.weaning_date : (data.birth_weight_kg ? data.birth_date : (isEditing ? initialValues.last_weight_date : null))),
          created_at: isEditing ? initialValues.created_at : now,
          updated_at: now,
          deleted_at: null
        };

        if (isEditing) {
          await db.animals.put(animalData);
          await addToSyncQueue('animals', 'UPDATE', animalData);
        } else {
          await db.animals.add(animalData);
          await addToSyncQueue('animals', 'INSERT', animalData);
        }

        if (data.birth_date) {
          const birthEvent = {
            id: eventIds.birth || crypto.randomUUID(),
            user_id: userId,
            animal_id: animalId,
            event_type: 'Nacimiento',
            event_date: data.birth_date,
            weight_kg: data.birth_weight_kg || null,
            mother_weight_kg: data.mother_weight_at_birth || null,
            navel_length: data.navel_length || null,
            observations: data.birth_observations || null,
            photo_path: birthImg.url,
            photo_blob: birthImg.blob || (eventIds.birth && isEditing ? undefined : null),
            created_at: eventIds.birth ? undefined : now,
            updated_at: now
          };
          await db.growth_events.put(birthEvent);
          await addToSyncQueue('growth_events', eventIds.birth ? 'UPDATE' : 'INSERT', birthEvent);
        }

        if (data.weaning_date) {
          const weaningEvent = {
            id: eventIds.weaning || crypto.randomUUID(),
            user_id: userId,
            animal_id: animalId,
            event_type: 'Destete',
            event_date: data.weaning_date,
            weight_kg: data.weaning_weight_kg || null,
            mother_weight_kg: data.mother_weight_at_weaning || null,
            scrotal_circumference_cm: data.sc_at_weaning || null,
            observations: data.weaning_observations || null,
            photo_path: weaningImg.url,
            photo_blob: weaningImg.blob || (eventIds.weaning && isEditing ? undefined : null),
            created_at: eventIds.weaning ? undefined : now,
            updated_at: now
          };
          await db.growth_events.put(weaningEvent);
          await addToSyncQueue('growth_events', eventIds.weaning ? 'UPDATE' : 'INSERT', weaningEvent);
        }
      });

      setToast({
        show: true,
        type: 'success',
        message: isEditing ? 'Cambios guardados exitosamente' : 'Animal registrado con éxito'
      });

      setTimeout(() => {
        setToast({ show: false, type: 'success', message: '' });
        onSubmitSuccess && onSubmitSuccess(animalId);
      }, 500);

    } catch (err) {
      console.error('Error guardando animal:', err);
      setToast({ show: true, type: 'error', message: 'Error al procesar la información' });
      setTimeout(() => setToast(p => ({ ...p, show: false })), 3000);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleSave)} className="pb-10">
      {toast.show && (
        <div className={`fixed z-[100] px-5 py-4 ${toast.type === 'success' ? 'bg-[#1A3621]' : 'bg-red-900'} text-white rounded-2xl shadow-2xl transition-all animate-in fade-in slide-in-from-top-5 top-5 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:-translate-x-0 font-bold text-sm flex items-center gap-3 w-[85%] max-w-sm sm:w-auto`}>
          {toast.type === 'success' ? (
            <CheckCircle className="w-6 h-6 text-emerald-400" />
          ) : (
            <TriangleAlert className="w-6 h-6 text-red-400" />
          )}
          {toast.message}
        </div>
      )}

      {/* 0. IDENTIFICACIÓN VISUAL */}
      <section className="bg-[#F4F5F0] rounded-3xl p-5 mb-4 shadow-sm border border-neutral-100/50">
        <div className="mb-5">
          <ImageUploader id="main" label="Foto del Animal" preview={images.main.preview} onCapture={(e) => handleImageCapture(e, 'main')} onRemove={() => removeImage('main')} />
        </div>
        <div>
          <label className="text-sm font-bold text-[#1B4820] mb-2 block">Descripción del ganadero</label>
          <textarea {...register('observations')} placeholder="Añade una descripción visual del animal..." rows={3} className="w-full bg-white rounded-2xl px-4 py-3 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#1B4820]/20 border border-transparent focus:border-[#1B4820]/30 transition-all shadow-sm resize-none" />
        </div>
      </section>

      {/* 1. IDENTIFICACIÓN BÁSICA */}
      <section className="bg-neutral-50 rounded-3xl p-5 mb-4 border border-neutral-100 space-y-4">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-2 block">Identificación Básica</h3>

        <div>
          <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block ml-1">Código / Número *</label>
          <input {...register('number')} placeholder="Ej: 1234" className={`w-full bg-white rounded-xl px-4 py-3 text-neutral-800 placeholder-neutral-400 border transition-all focus:outline-none focus:ring-2 focus:ring-[#1B4820]/20 ${errors.number ? 'border-red-500' : 'border-neutral-100 focus:border-[#1B4820]/30'}`} />
          {errors.number && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.number.message}</p>}
        </div>

        <div>
          <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block ml-1">Sexo del Animal</label>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setValue('sex', 'Macho')} className={`py-3 rounded-xl font-bold text-sm transition-all border cursor-pointer ${selectedSex === 'Macho' ? 'bg-[#1B4820] text-white border-[#1B4820]' : 'bg-white text-neutral-500 border-neutral-100'}`}>MACHO</button>
            <button type="button" onClick={() => setValue('sex', 'Hembra')} className={`py-3 rounded-xl font-bold text-sm transition-all border cursor-pointer ${selectedSex === 'Hembra' ? 'bg-[#1B4820] text-white border-[#1B4820]' : 'bg-white text-neutral-500 border-neutral-100'}`}>HEMBRA</button>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block ml-1">Color del Animal</label>
          <input {...register('color')} placeholder="Ej: Rojo Suave" className="w-full bg-white rounded-xl px-4 py-3 text-neutral-800 placeholder-neutral-400 border border-neutral-100 focus:outline-none focus:ring-2 focus:ring-[#1B4820]/20" />
        </div>
      </section>

      {/* ESTADO Y DISPONIBILIDAD */}
      <section className="bg-white rounded-3xl p-5 mb-4 border border-neutral-100 shadow-sm space-y-4">
        <div>
          <CustomSelect
            label="Estado del Animal"
            value={selectedStatus}
            onChange={(val) => setValue('status', val)}
            options={[
              { value: 'Activo', label: '🟢 Activo (En el inventario)' },
              { value: 'Inactivo', label: '🔴 Inactivo (Vendido, Muerte, etc.)' }
            ]}
          />
        </div>

        {selectedStatus === 'Inactivo' && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block ml-1">Razón de la Inactividad</label>
            <textarea
              {...register('inactivity_reason')}
              placeholder="Ej: Vendido para carne, muerte por enfermedad..."
              className="w-full bg-neutral-50 rounded-xl px-4 py-3 text-sm text-neutral-800 placeholder-neutral-400 border border-neutral-100 focus:outline-none focus:ring-2 focus:ring-[#1B4820]/20 min-h-[100px] resize-none"
            />
          </div>
        )}
      </section>

      {/* GENEALOGÍA */}
      <section className="bg-neutral-100/50 rounded-3xl p-5 mb-4 border border-neutral-100 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-5 rounded-full bg-[#8C6746]"></div>
          <h3 className="text-lg font-bold text-[#1B4820]">Genealogía</h3>
        </div>

        <div>
          <GenealogySelector label="Padre (Toro)" sex="Macho" value={fatherId} onChange={(id) => setValue('father_id', id)} onCreateNew={(sex) => onOpenModal && onOpenModal(sex, (id) => setValue('father_id', id))} />
        </div>

        <div>
          <GenealogySelector label="Madre (Vaca)" sex="Hembra" value={motherId} onChange={(id) => setValue('mother_id', id)} onCreateNew={(sex) => onOpenModal && onOpenModal(sex, (id) => setValue('mother_id', id))} />
        </div>
      </section>

      {/* ACORDEÓN: SERVICIO DE ORIGEN */}
      {motherId && (
        <div className="bg-neutral-50 rounded-3xl p-5 mb-4 border border-neutral-100">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleAccordion('service')}>
            <div className="flex items-center gap-3">
              <div className="w-1 h-5 rounded-full bg-blue-500"></div>
              <h3 className="text-lg font-bold text-[#1B4820]">Servicio de Origen</h3>
            </div>
            {activeAccordions.service ? <ChevronUp className="w-5 h-5 text-neutral-500" /> : <ChevronDown className="w-5 h-5 text-neutral-500" />}
          </div>

          <div className={`grid transition-all duration-300 ease-in-out ${activeAccordions.service ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="overflow-hidden">
              <div className="pt-5 space-y-4">
                {motherServices === undefined ? (
                  <p className="text-sm text-neutral-500">Cargando servicios...</p>
                ) : showQuickService ? (
                  <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-[#1B4820] tracking-widest border-b border-neutral-100 pb-2">Nuevo Servicio Rápido</h4>

                    <div>
                      <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block ml-1">Fecha del Servicio</label>
                      <input type="date" value={quickServiceData.date} onChange={e => setQuickServiceData(d => ({ ...d, date: e.target.value }))} className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1B4820]/20 transition-all" />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block ml-1">Tipo de Concepción</label>
                      <CustomSelect
                        value={quickServiceData.type}
                        onChange={val => setQuickServiceData(d => ({ ...d, type: val }))}
                        options={serviceTypeOptions}
                        bgClass="bg-neutral-50"
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button type="button" disabled={isSavingQuickService} onClick={() => setShowQuickService(false)} className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-xs font-bold py-3.5 rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed">Cancelar</button>
                      <button type="button" disabled={isSavingQuickService} onClick={handleQuickServiceCreate} className="flex-1 bg-[#1B4820] hover:bg-[#0F2912] text-white text-xs font-bold py-3.5 rounded-xl disabled:opacity-50 transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2">
                        {isSavingQuickService ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            GUARDANDO...
                          </>
                        ) : 'Guardar y Usar'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {motherServices.length === 0 ? (
                      <div className="text-center bg-white border border-neutral-100 p-4 rounded-2xl">
                        <p className="text-xs text-neutral-500 mb-2 font-medium">Esta madre no tiene servicios registrados.</p>
                      </div>
                    ) : (
                      <div>
                        <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block ml-1">Seleccionar Servicio</label>
                        <CustomSelect
                          value={originServiceId}
                          onChange={val => setValue('origin_service_id', val)}
                          options={motherServicesOptions}
                          placeholder="Selecciona el servicio origen..."
                        />
                      </div>
                    )}

                    <button type="button" onClick={() => setShowQuickService(true)} className="w-full flex items-center justify-center gap-2 bg-neutral-50 border border-dashed border-neutral-300 hover:border-[#1B4820] hover:text-[#1B4820] hover:bg-emerald-50 text-neutral-600 font-bold py-3.5 rounded-xl transition-all text-xs cursor-pointer">
                      <Plus className="w-4 h-4" />
                      REGISTRAR NUEVO SERVICIO
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACORDEÓN: NACIMIENTO */}
      <div className="bg-neutral-50 rounded-3xl p-5 mb-4 border border-neutral-100">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleAccordion('birth')}>
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 rounded-full bg-emerald-600"></div>
            <h3 className="text-lg font-bold text-[#1B4820]">Evento: Nacimiento</h3>
          </div>
          {activeAccordions.birth ? <ChevronUp className="w-5 h-5 text-neutral-500" /> : <ChevronDown className="w-5 h-5 text-neutral-500" />}
        </div>
        <div className={`grid transition-all duration-300 ease-in-out ${activeAccordions.birth ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
          <div className="overflow-hidden">
            <div className="pt-5 space-y-4">
              <ImageUploader id="birth" label="Foto al Nacer" preview={images.birth.preview} onCapture={(e) => handleImageCapture(e, 'birth')} onRemove={() => removeImage('birth')} />

              <div>
                <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block ml-1">Fecha de Nacimiento</label>
                <input type="date" {...register('birth_date')} className="w-full bg-white rounded-xl px-4 py-3 text-neutral-800 border border-neutral-100 focus:outline-none focus:ring-2 focus:ring-[#1B4820]/20 transition-all" />
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block ml-1">Peso de la Cría al Nacer (KG)</label>
                <input type="number" step="any" {...register('birth_weight_kg')} placeholder="Ej: 35" className="w-full bg-white rounded-xl px-4 py-3 border border-neutral-100 outline-none focus:ring-2 focus:ring-[#1B4820]/20 transition-all" />
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block ml-1">Peso Madre al Parto (KG)</label>
                <input type="number" step="any" {...register('mother_weight_at_birth')} placeholder="Ej: 450" className="w-full bg-white rounded-xl px-4 py-3 border border-neutral-100 outline-none focus:ring-2 focus:ring-[#1B4820]/20 transition-all" />
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block ml-1">Longitud del Ombligo (CM)</label>
                <input {...register('navel_length')} placeholder="Ej: 5" className="w-full bg-white rounded-xl px-4 py-3 border border-neutral-100 outline-none focus:ring-2 focus:ring-[#1B4820]/20 transition-all" />
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block ml-1">Observaciones del Parto</label>
                <textarea {...register('birth_observations')} placeholder="Detalles u observaciones del parto..." rows={2} className="w-full bg-white rounded-xl px-4 py-3 border border-neutral-100 outline-none resize-none focus:ring-2 focus:ring-[#1B4820]/20 transition-all" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ACORDEÓN: DESTETE */}
      <div className="bg-neutral-50 rounded-3xl p-5 mb-4 border border-neutral-100">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleAccordion('weaning')}>
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 rounded-full bg-amber-600"></div>
            <h3 className="text-lg font-bold text-[#1B4820]">Evento: Destete</h3>
          </div>
          {activeAccordions.weaning ? <ChevronUp className="w-5 h-5 text-neutral-500" /> : <ChevronDown className="w-5 h-5 text-neutral-500" />}
        </div>
        <div className={`grid transition-all duration-300 ease-in-out ${activeAccordions.weaning ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
          <div className="overflow-hidden">
            <div className="pt-5 space-y-4">
              <ImageUploader id="weaning" label="Foto al Destete" preview={images.weaning.preview} onCapture={(e) => handleImageCapture(e, 'weaning')} onRemove={() => removeImage('weaning')} />

              <div>
                <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block ml-1">Fecha de Destete</label>
                <input type="date" {...register('weaning_date')} className="w-full bg-white rounded-xl px-4 py-3 text-neutral-800 border border-neutral-100 focus:outline-none focus:ring-2 focus:ring-[#1B4820]/20 transition-all" />
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block ml-1">Peso al Destete (KG)</label>
                <input type="number" step="any" {...register('weaning_weight_kg')} placeholder="Ej: 180" className="w-full bg-white rounded-xl px-4 py-3 border border-neutral-100 outline-none focus:ring-2 focus:ring-[#1B4820]/20 transition-all" />
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block ml-1">Circ. Escrotal al Destete (CM)</label>
                <input type="number" step="any" {...register('sc_at_weaning')} placeholder="Ej: 20" className="w-full bg-white rounded-xl px-4 py-3 border border-neutral-100 outline-none focus:ring-2 focus:ring-[#1B4820]/20 transition-all" />
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block ml-1">Peso Madre al Destete (KG)</label>
                <input type="number" step="any" {...register('mother_weight_at_weaning')} placeholder="Ej: 420" className="w-full bg-white rounded-xl px-4 py-3 border border-neutral-100 outline-none focus:ring-2 focus:ring-[#1B4820]/20 transition-all" />
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block ml-1">Observaciones del Destete</label>
                <textarea {...register('weaning_observations')} placeholder="Detalles u observaciones del destete..." rows={2} className="w-full bg-white rounded-xl px-4 py-3 border border-neutral-100 outline-none resize-none focus:ring-2 focus:ring-[#1B4820]/20 transition-all" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MEDIDAS ACTUALES */}
      <section className="bg-neutral-50 rounded-3xl p-5 mb-4 border border-neutral-100">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-1 h-5 rounded-full bg-[#1B4820]"></div>
          <h3 className="text-lg font-bold text-[#1B4820]">Peso Actual</h3>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block ml-1">Peso Actual (KG)</label>
            <input type="number" step="any" {...register('current_weight_kg')} placeholder="Ej: 250" className="w-full bg-white rounded-xl px-4 py-3 border border-neutral-100 outline-none focus:ring-2 focus:ring-[#1B4820]/20 transition-all" />
          </div>
        </div>
      </section>

      {/* FOOTERS (¡Totalmente Restaurados!) */}
      {!isModal && (
        <div className="fixed bottom-0 left-0 w-full bg-[#fcfcfa]/90 backdrop-blur-md border-t border-neutral-100 p-4 z-40">
          <div className="max-w-md mx-auto grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 bg-[#D15E5A] hover:bg-[#B94545] text-white rounded-full py-4 transition-all active:scale-95 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5" strokeWidth={2.5} />
              <span className="text-xs font-bold uppercase tracking-widest">Cancelar</span>
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 bg-[#1A3621] hover:bg-[#0F2912] text-white rounded-full py-4 transition-all active:scale-95 shadow-[0_4px_14px_rgba(26,54,33,0.3)] cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-xs font-bold uppercase tracking-widest">Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" strokeWidth={2.5} />
                  <span className="text-xs font-bold uppercase tracking-widest">Guardar</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {isModal && (
        <div className="grid grid-cols-2 gap-3 mt-8">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 bg-[#D15E5A] text-white rounded-full py-4 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" strokeWidth={2.5} />
            <span className="text-xs font-bold uppercase tracking-widest">Cancelar</span>
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 bg-[#1A3621] text-white rounded-full py-4 shadow-lg shadow-emerald-900/20 transition-all active:scale-95 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="text-xs font-bold uppercase tracking-widest">Guardando...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" strokeWidth={2.5} />
                <span className="text-xs font-bold uppercase tracking-widest">Guardar</span>
              </>
            )}
          </button>
        </div>
      )}
    </form>
  );
}