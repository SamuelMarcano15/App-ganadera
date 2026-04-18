import { useState, useEffect, useRef, useMemo } from "react";
import { useForm } from "react-hook-form";
import {
  Calendar,
  Ruler,
  Camera,
  Save,
  X,
  ChevronDown,
  CheckCircle,
  MessageSquare,
  AlertTriangle,
  Loader2,
  Info
} from "lucide-react";

// Importaciones Core
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabaseClient";
import { addToSyncQueue } from "@/lib/syncUtils";
import { compressImage } from "@/lib/imageUtils"; // <-- Eliminamos uploadImageToSupabase
import AnimalImage from "@/components/inventario/AnimalImage";
import BottomSheet from "@/components/ui/BottomSheet";

export default function EventForm({ 
  animal, 
  initialValues = null, 
  existingEvents = [], 
  onSubmitSuccess, 
  onCancel,
  isModal = false 
}) {
  const isEditing = !!initialValues?.id;

  // --- OPCIONES ---
  const tipoOpciones = ["Destete", "Peso a los 12 meses", "Peso a los 18 meses", "Otro"];
  const largoOpciones = [
    { value: "1", label: "Corto (1)" },
    { value: "2", label: "Moderado (2)" },
    { value: "3", label: "Medio (3)" },
    { value: "4", label: "Largo (4)" },
    { value: "5", label: "Muy Largo (5)" }
  ];

  // --- ESTADOS REACT ---
  const [tipoEvento, setTipoEvento] = useState(() => {
    if (!initialValues) return "Destete";
    const knownTypes = ["Destete", "Peso a los 12 meses", "Peso a los 18 meses"];
    if (knownTypes.includes(initialValues.event_type)) return initialValues.event_type;
    return "Otro";
  });

  const [eventoPersonalizado, setEventoPersonalizado] = useState(() => {
    if (!initialValues) return "";
    const knownTypes = ["Destete", "Peso a los 12 meses", "Peso a los 18 meses"];
    return knownTypes.includes(initialValues.event_type) ? "" : initialValues.event_type;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempNombreEvento, setTempNombreEvento] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const [isTipoOpen, setIsTipoOpen] = useState(false);
  const [isLargoOpen, setIsLargoOpen] = useState(false);

  const [photoPreview, setPhotoPreview] = useState(() => {
    if (initialValues?.photo_path) return initialValues.photo_path;
    if (initialValues?.photo_blob) return URL.createObjectURL(initialValues.photo_blob);
    return null;
  });
  const [photoBlob, setPhotoBlob] = useState(null);
  const fileInputRef = useRef(null);

  // --- FORMULARIO ---
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: {
      fechaEvento: initialValues?.event_date || new Date().toISOString().split('T')[0],
      pesoVaca: initialValues?.mother_weight_kg || "",
      pesoCria: initialValues?.weight_kg || "",
      circunferencia: initialValues?.scrotal_circumference_cm || "",
      largoViril: initialValues?.navel_length || "1",
      observaciones: initialValues?.observations || "",
    },
  });

  const selectedLargo = watch("largoViril");

  // --- LÓGICA DE DUPLICADOS ---
  const isDuplicateBlocked = useMemo(() => {
    const uniqueEvents = ['Destete'];
    if (!uniqueEvents.includes(tipoEvento)) return false;
    return existingEvents?.some(e => e.event_type === tipoEvento && e.id !== initialValues?.id);
  }, [tipoEvento, existingEvents, initialValues]);

  const duplicateWarning = useMemo(() => {
    if (isDuplicateBlocked) return null;
    return existingEvents?.find(e => e.event_type === tipoEvento && e.id !== initialValues?.id) || null;
  }, [tipoEvento, existingEvents, isDuplicateBlocked, initialValues]);

  // --- MANEJADORES ---
  const handleNumericInput = (e) => {
    let val = e.target.value.replace(/[^0-9.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
    e.target.value = val;
  };

  const preventInvalidNumberKeys = (e) => {
    if (['+', '-', 'e', 'E', '*', '/', '{', '}', 'ñ', 'Ñ'].includes(e.key) || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
    }
  };

  const selectTipoEvento = (opcion) => {
    if (opcion === "Otro") {
      setIsTipoOpen(false);
      setIsModalOpen(true);
    } else {
      setTipoEvento(opcion);
      setEventoPersonalizado("");
      setIsTipoOpen(false);
    }
  };

  const handleModalConfirm = () => {
    if (tempNombreEvento.trim()) {
      setEventoPersonalizado(tempNombreEvento);
      setTipoEvento("Otro");
    } else {
      setTipoEvento(isEditing ? (["Destete", "Peso a los 12 meses", "Peso a los 18 meses"].includes(initialValues.event_type) ? initialValues.event_type : "Destete") : "Destete");
    }
    setIsModalOpen(false);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setPhotoBlob(compressed);
      setPhotoPreview(URL.createObjectURL(compressed));
    } catch (err) {
      console.error('Error procesando imagen:', err);
    }
  };

  const getDisplayTitleExternal = () => {
    if (tipoEvento === "Otro" && eventoPersonalizado) return eventoPersonalizado;
    return tipoEvento;
  };

  // --- OBTENER USUARIO ---
  const getSafeUserId = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) return session.user.id;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const isOfflineAuthorized = localStorage.getItem("ganadera_offline_session") === "true";
      if (isOfflineAuthorized) {
        if (animal?.user_id) return animal.user_id;
        const anyAnimal = await db.animals.toCollection().first();
        return anyAnimal?.user_id || "offline-user";
      }
    }
    return null; 
  };

  const onSubmit = async (data) => {
    if (isSaving || isDuplicateBlocked) return;
    setIsSaving(true);

    try {
      const userId = await getSafeUserId();
      
      if (!userId) {
        window.location.href = '/login';
        return;
      }

      const now = new Date().toISOString();

      // --- MAGIA OFFLINE: SOLO GUARDAMOS EL BLOB EN DEXIE ---
      const eventData = {
        id: isEditing ? initialValues.id : crypto.randomUUID(),
        user_id: userId,
        animal_id: animal.id,
        event_type: getDisplayTitleExternal(),
        event_date: data.fechaEvento,
        weight_kg: data.pesoCria ? parseFloat(data.pesoCria) : null,
        mother_weight_kg: data.pesoVaca ? parseFloat(data.pesoVaca) : null,
        scrotal_circumference_cm: data.circunferencia ? parseFloat(data.circunferencia) : null,
        navel_length: data.largoViril || null,
        observations: data.observations || null,
        photo_path: isEditing ? initialValues.photo_path : null, // Dejamos que SyncManager la llene luego
        photo_blob: photoBlob || (isEditing ? initialValues.photo_blob : null),
        created_at: isEditing ? initialValues.created_at : now,
        updated_at: now,
      };

      await db.transaction('rw', [db.growth_events, db.animals, db.sync_queue], async () => {
        if (isEditing) {
          await db.growth_events.put(eventData);
          await addToSyncQueue('growth_events', 'UPDATE', eventData);
        } else {
          await db.growth_events.add(eventData);
          await addToSyncQueue('growth_events', 'INSERT', eventData);
        }

        if (eventData.weight_kg) {
          await db.animals.update(animal.id, {
            last_weight_kg: eventData.weight_kg,
            last_weight_date: eventData.event_date,
            updated_at: now
          });
        }
      });

      setShowToast(true);
      // --- CAMBIO UX: Cerrar rápido en 500ms ---
      setTimeout(() => {
        setShowToast(false);
        onSubmitSuccess();
      }, 500);

    } catch (err) {
      console.error('Error guardando evento:', err);
      alert('Error al guardar el evento. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed z-[100] px-5 py-4 bg-[#1A3621] text-white rounded-2xl shadow-xl transition-all animate-in fade-in slide-in-from-top-5 top-5 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:-translate-x-0 font-bold text-sm flex items-center gap-3 w-[90%] max-w-sm sm:w-auto">
          <CheckCircle className="w-6 h-6 text-emerald-400" />
          {isEditing ? 'Evento de vida actualizado' : 'Evento de vida registrado exitosamente'}
        </div>
      )}

      {/* Hero Card Dinámico */}
      {!isModal && (
        <div className="relative w-full h-48 rounded-[2.5rem] overflow-hidden shadow-2xl bg-black group">
          <AnimalImage 
            photoPath={animal.photo_path} 
            photoBlob={animal.photo_blob} 
            alt={`#${animal.number}`}
            className="w-full h-full transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
          <div className="absolute bottom-6 left-7 flex flex-col gap-0.5">
            <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-white">
              ID ANIMAL: {animal.number}
            </span>
            <span className="text-3xl font-black text-white tracking-tight uppercase">
              {getDisplayTitleExternal()}
            </span>
          </div>
        </div>
      )}

      {/* Dropdown - Tipo de Evento */}
      <div className="w-full custom-dropdown relative z-20">
        <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-2 pl-2">Tipo de Evento</label>
        <div
          className={`w-full bg-white font-bold text-gray-800 text-lg rounded-2xl px-5 py-4 shadow-sm flex items-center justify-between cursor-pointer border transition-all ${isTipoOpen ? "border-emerald-500 ring-4 ring-emerald-50" : "border-gray-100"}`}
          onClick={() => {
            setIsTipoOpen(!isTipoOpen);
            setIsLargoOpen(false);
          }}
        >
          <span>{tipoEvento === 'Otro' && eventoPersonalizado ? eventoPersonalizado : tipoEvento}</span>
          <ChevronDown className={`w-5 h-5 text-[#1A3621] transition-transform duration-300 ${isTipoOpen ? "rotate-180" : ""}`} />
        </div>

        {isDuplicateBlocked && (
          <div className="mt-2 flex items-center gap-2 px-3 py-2.5 bg-red-50 text-red-700 rounded-xl border border-red-100 animate-in fade-in slide-in-from-top-1">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <p className="text-[11px] font-bold leading-tight">Ya existe un registro de "Destete". No se puede repetir este evento único.</p>
          </div>
        )}

        {duplicateWarning && (
          <div className="mt-2 flex items-center gap-2 px-3 py-2.5 bg-amber-50 text-amber-700 rounded-xl border border-amber-100 animate-in fade-in slide-in-from-top-1">
            <Info className="w-4 h-4 flex-shrink-0" />
            <p className="text-[11px] font-bold leading-tight">Ya existe un registro de "{tipoEvento}". ¿Deseas registrar un nuevo pesaje?</p>
          </div>
        )}

        {isTipoOpen && (
          <div className="absolute top-[90px] left-0 w-full bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
            {tipoOpciones.map((opcion) => (
              <div
                key={opcion}
                onClick={() => selectTipoEvento(opcion)}
                className={`px-6 py-4 font-bold cursor-pointer hover:bg-emerald-50 transition-colors ${tipoEvento === opcion ? "text-emerald-700 bg-emerald-50/50" : "text-gray-700"}`}
              >
                {opcion}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Datos Pesaje */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100/50 flex flex-col">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-1 h-3 rounded-full bg-emerald-600" />
            <label className="text-[9px] font-black uppercase tracking-wider text-gray-400">Peso Animal (KG)</label>
          </div>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            onKeyDown={preventInvalidNumberKeys}
            className="text-2xl font-black text-[#1A3621] outline-none w-full bg-transparent placeholder-gray-200"
            {...register("pesoCria", { onChange: handleNumericInput })}
          />
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100/50 flex flex-col opacity-80">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-1 h-3 rounded-full bg-amber-600" />
            <label className="text-[9px] font-black uppercase tracking-wider text-gray-400">Peso Madre (KG)</label>
          </div>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            onKeyDown={preventInvalidNumberKeys}
            className="text-2xl font-black text-amber-900/40 outline-none w-full bg-transparent placeholder-gray-200 focus:text-amber-900 focus:opacity-100 transition-all"
            {...register("pesoVaca", { onChange: handleNumericInput })}
          />
        </div>
      </div>

      {/* FECHA Y MEDIDAS */}
      <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-100/50 space-y-6">
        <div className="flex flex-col">
          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3 ml-1">Fecha del Evento</label>
          <div className="flex items-center gap-4 bg-gray-50 rounded-2xl px-5 py-4 border border-gray-100">
            <Calendar size={22} className="text-[#1A3621] opacity-70" />
            <input type="date" className="font-black text-gray-800 text-lg outline-none w-full bg-transparent" {...register("fechaEvento")} />
          </div>
        </div>

        <div className="h-[1px] bg-gray-100 w-full" />

        <div className="grid grid-cols-1 gap-5">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3 ml-1">Circ. Escrotal (CM)</label>
            <div className="flex items-center gap-4 bg-gray-50 rounded-2xl px-5 py-4 border border-gray-100">
              <Ruler size={22} className="text-[#1A3621] opacity-70" />
              <input type="text" inputMode="decimal" placeholder="0.0" onKeyDown={preventInvalidNumberKeys} className="font-black text-gray-800 text-lg outline-none w-full bg-transparent" {...register("circunferencia", { onChange: handleNumericInput })} />
            </div>
          </div>

          <div className="custom-dropdown relative flex flex-col">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3 ml-1">Largo Viril/Ombligo</label>
            <div
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 flex items-center justify-between cursor-pointer"
              onClick={() => {
                setIsLargoOpen(!isLargoOpen);
                setIsTipoOpen(false);
              }}
            >
              <span className="font-black text-gray-800 text-base">{largoOpciones.find(o => o.value === selectedLargo)?.label || "Corto (1)"}</span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isLargoOpen ? "rotate-180" : ""}`} />
            </div>

            {isLargoOpen && (
              <div className="absolute top-[85px] left-0 w-full bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden py-2 z-40 animate-in fade-in zoom-in-95">
                {largoOpciones.map((opcion) => (
                  <div
                    key={opcion.value}
                    onClick={() => {
                      setValue("largoViril", opcion.value);
                      setIsLargoOpen(false);
                    }}
                    className={`px-6 py-4 font-bold text-base cursor-pointer hover:bg-gray-50 transition-colors ${selectedLargo === opcion.value ? "text-emerald-700 bg-emerald-50/50" : "text-gray-700"}`}
                  >
                    {opcion.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Observaciones */}
      <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-100/50 flex flex-col">
        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4 ml-1 flex items-center gap-2">
          <MessageSquare size={14} className="text-emerald-600" />
          Notas del Ganadero
        </label>
        <textarea
          placeholder="Añade detalles relevantes..."
          rows={3}
          className="font-bold text-gray-800 text-base outline-none w-full bg-transparent resize-none placeholder-gray-200 min-h-[100px]"
          {...register("observaciones")}
        />
      </div>

      {/* Fotografía */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="relative h-48 border-4 border-dashed border-gray-200 rounded-[3rem] flex flex-col items-center justify-center bg-white cursor-pointer active:scale-95 transition-all hover:border-emerald-200 hover:bg-emerald-50/10 overflow-hidden"
      >
        {photoPreview ? (
          <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center">
            <div className="bg-emerald-50 rounded-full p-5 mb-4 group-hover:bg-emerald-100 transition-colors">
              <Camera className="text-emerald-700 w-8 h-8" strokeWidth={1.5} />
            </div>
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-900">Tomar Foto del Evento</span>
            <span className="text-[9px] text-gray-400 mt-1 font-bold">Opcional para el registro</span>
          </div>
        )}
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" />
      </div>

      {/* Footer */}
      <div className={`${isModal ? "" : "fixed bottom-0 left-0 w-full bg-gradient-to-t from-[#F8F9F5] via-[#F8F9F5] to-transparent pt-12 pb-8 px-5 z-40"}`}>
        <div className={`max-w-md mx-auto grid grid-cols-2 gap-4 ${isModal ? "mt-4" : ""}`}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 bg-[#D15E5A] hover:bg-[#B94545] text-white rounded-full py-4 transition-all active:scale-95 shadow-[0_4px_14px_rgba(209,94,90,0.3)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <X size={20} strokeWidth={2.5} />
            <span className="text-xs font-bold uppercase tracking-widest">Cancelar</span>
          </button>

          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={isSaving || isDuplicateBlocked}
            className={`flex items-center justify-center gap-2 rounded-full py-4 transition-all active:scale-95 shadow-lg shadow-emerald-900/20 disabled:opacity-70 disabled:cursor-not-allowed ${isDuplicateBlocked ? "bg-gray-300 text-gray-500" : "bg-[#1A3621] hover:bg-[#0F2912] text-white cursor-pointer"}`}
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save size={20} strokeWidth={2.5} />
            )}
            <span className="text-xs font-bold uppercase tracking-widest">
              {isSaving ? 'Guardando...' : 'Guardar'}
            </span>
          </button>
        </div>
      </div>

      {/* MODAL: Nombre del Evento */}
      <BottomSheet
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setTipoEvento(isEditing ? (["Destete", "Peso a los 12 meses", "Peso a los 18 meses"].includes(initialValues.event_type) ? initialValues.event_type : "Destete") : "Destete");
        }}
        title="Tipo Personalizado"
        description="Define el nombre de este pesaje o evento especial."
      >
        <div className="flex flex-col pb-2">
          <input
            type="text"
            onChange={(e) => setTempNombreEvento(e.target.value)}
            value={tempNombreEvento}
            placeholder="Ej. Pesaje de Verano"
            className="w-full bg-gray-50 border-2 border-gray-100 rounded-3xl px-7 py-5 text-2xl font-black text-[#1A3621] outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner mb-10"
            autoFocus
          />
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setTipoEvento(isEditing ? (["Destete", "Peso a los 12 meses", "Peso a los 18 meses"].includes(initialValues.event_type) ? initialValues.event_type : "Destete") : "Destete");
              }}
              className="flex-1 py-5 font-black text-gray-500 bg-gray-100 rounded-full uppercase tracking-widest text-xs transition-all active:scale-95 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleModalConfirm}
              className="flex-1 py-5 font-black text-white bg-emerald-700 rounded-full shadow-lg shadow-emerald-900/20 uppercase tracking-widest text-xs transition-all active:scale-95 cursor-pointer"
            >
              Confirmar
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}