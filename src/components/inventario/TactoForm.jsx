import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Calendar,
  Check,
  TriangleAlert,
  CheckCircle,
  X,
  Save,
  Loader2,
  AlertCircle
} from "lucide-react";

// Importaciones Core
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabaseClient";
import { addToSyncQueue } from "@/lib/syncUtils";

const RESULT_MAP = {
  'prenada': 'Preñada',
  'vacia': 'Vacía'
};

const RESULT_REVERSE = {
  'Preñada': 'prenada',
  'Vacía': 'vacia'
};

export default function TactoForm({
  animal,
  initialValues = null,
  onSubmitSuccess,
  onCancel,
  isModal = false
}) {
  const isEditing = !!initialValues?.id;

  // --- ESTADOS REACT ---
  const [resultado, setResultado] = useState(() => {
    if (initialValues?.result) {
      return RESULT_REVERSE[initialValues.result] || null;
    }
    return null;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // --- FORMULARIO ---
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      fechaTacto: initialValues?.check_date || new Date().toISOString().split('T')[0],
      observaciones: initialValues?.observations || "",
    },
  });

  // --- LÓGICA LOCAL-FIRST (Zero Delay) ---
  const getLocalUserId = () => {
    return localStorage.getItem("ganadera_user_id");
  };

  const onSubmit = async (data) => {
    if (!resultado) {
      alert("Por favor selecciona un resultado para la palapación.");
      return;
    }

    if (isSaving) return;
    setIsSaving(true);

    try {
      const userId = getLocalUserId();
      
      if (!userId) {
        window.location.href = '/login';
        return;
      }

      const now = new Date().toISOString();
      const recordData = {
        id: isEditing ? initialValues.id : crypto.randomUUID(),
        user_id: userId,
        animal_id: animal.id,
        check_date: data.fechaTacto,
        result: RESULT_MAP[resultado],
        observations: data.observaciones || null,
        created_at: isEditing ? initialValues.created_at : now,
        updated_at: now,
      };

      await db.transaction('rw', [db.pregnancy_checks, db.sync_queue], async () => {
        if (isEditing) {
          await db.pregnancy_checks.put(recordData);
          await addToSyncQueue('pregnancy_checks', 'UPDATE', recordData);
        } else {
          await db.pregnancy_checks.add(recordData);
          await addToSyncQueue('pregnancy_checks', 'INSERT', recordData);
        }
      });

      setShowToast(true);
      
      // --- CAMBIO UX: Cerrar rápido en 500ms ---
      setTimeout(() => {
        setShowToast(false);
        onSubmitSuccess();
      }, 500);

    } catch (err) {
      console.error('Error guardando palpación:', err);
      alert('Error al guardar. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col space-y-8">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed z-[100] px-5 py-4 bg-[#1A3621] text-white rounded-2xl shadow-xl transition-all animate-in fade-in slide-in-from-top-5 top-5 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:-translate-x-0 font-bold text-sm flex items-center gap-3 w-[90%] max-w-sm sm:w-auto">
          <CheckCircle className="w-6 h-6 text-emerald-400" />
          {isEditing ? 'Registro actualizado' : 'Registro de palpación guardado'}
        </div>
      )}

      {/* BLOQUE EVALUANDO ANIMAL */}
      <div className="flex justify-between items-end">
        <div>
          <span className="text-[10px] text-gray-400 font-extrabold tracking-widest uppercase ml-1">
            Evaluando Animal
          </span>
          <h2 className="text-4xl font-black text-[#1A3621] tracking-tight mt-0.5">
            #{animal.number}
          </h2>
        </div>
      </div>

      {/* SECCIÓN 1: FECHA DEL TACTO */}
      <div className="space-y-3">
        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Fecha de la Palpación *</label>
        <div className={`flex items-center gap-4 bg-gray-50 rounded-2xl px-5 py-4 border border-gray-100 focus-within:border-[#1B4820]`}>
           <Calendar size={20} className="text-[#1A3621] opacity-40" />
           <input
            type="date"
            className="font-black text-gray-800 text-lg outline-none w-full bg-transparent"
            {...register("fechaTacto", { required: true })}
          />
        </div>
        {errors.fechaTacto && <p className="text-[10px] text-red-500 font-black flex items-center gap-1 ml-1"><AlertCircle size={10} /> Campo obligatorio</p>}
      </div>

      {/* SECCIÓN 2: RESULTADO DEL TACTO (RADIO CARDS) */}
      <div className="space-y-3">
        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Resultado de la Palpación</label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setResultado('prenada')}
            className={`flex flex-col items-center justify-center p-6 rounded-[2.5rem] border-2 transition-all active:scale-95 cursor-pointer shadow-sm
              ${resultado === 'prenada' ? 'ring-4 ring-[#1B4820]/10 border-[#1B4820] bg-white' : 'border-transparent bg-gray-50/50'}
            `}
          >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${resultado === 'prenada' ? 'bg-[#EEF7EE] text-emerald-600' : 'bg-gray-100 text-gray-400 opacity-60'}`}>
              <Check size={28} strokeWidth={3} />
            </div>
            <span className={`text-sm font-black uppercase tracking-widest ${resultado === 'prenada' ? 'text-[#1A3621]' : 'text-gray-400 opacity-60'}`}>
              Preñada
            </span>
          </button>

          <button
            type="button"
            onClick={() => setResultado('vacia')}
            className={`flex flex-col items-center justify-center p-6 rounded-[2.5rem] border-2 transition-all active:scale-95 cursor-pointer shadow-sm
              ${resultado === 'vacia' ? 'ring-4 ring-red-400/10 border-red-400 bg-white' : 'border-transparent bg-gray-50/50'}
            `}
          >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${resultado === 'vacia' ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-400 opacity-60'}`}>
              <TriangleAlert size={28} strokeWidth={2.5} />
            </div>
            <span className={`text-sm font-black uppercase tracking-widest ${resultado === 'vacia' ? 'text-[#1A3621]' : 'text-gray-400 opacity-60'}`}>
              Vacía
            </span>
          </button>
        </div>
      </div>

      {/* SECCIÓN 3: OBSERVACIONES */}
      <div className="space-y-3">
        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Observaciones</label>
        <textarea
          rows={4}
          placeholder="Ej: Condición corporal, anomalías..."
          className="w-full bg-gray-50 rounded-[2rem] p-6 outline-none text-gray-800 font-bold text-lg placeholder-gray-300 border border-gray-100 focus:border-[#1B4820] focus:bg-white transition-all resize-none shadow-inner"
          {...register("observaciones")}
        />
      </div>

      {/* Footer Buttons */}
      <div className={`${isModal ? "" : "fixed bottom-0 left-0 w-full bg-gradient-to-t from-[#F8F9F5] via-[#F8F9F5] to-transparent pt-12 pb-8 px-5 z-40"}`}>
        <div className={`max-w-md mx-auto grid grid-cols-2 gap-4 ${isModal ? "mt-4" : ""}`}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="flex flex-col items-center justify-center gap-1.5 bg-[#CC5A5A] hover:bg-[#b84e4e] text-white rounded-full py-4 transition-all active:scale-95 shadow-md disabled:opacity-50 cursor-pointer"
          >
            <X size={24} strokeWidth={2.5} />
            <span className="text-[10px] font-black uppercase tracking-widest">Cancelar</span>
          </button>

          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={isSaving}
            className={`flex flex-col items-center justify-center gap-1.5 bg-[#1A3621] hover:bg-[#122b19] text-white rounded-full py-4 transition-all active:scale-95 shadow-lg shadow-[#1A3621]/20 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer`}
          >
            {isSaving ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Save size={24} strokeWidth={2.5} />
            )}
            <span className="text-[10px] font-black uppercase tracking-widest">
              {isSaving ? 'Guardando...' : 'Guardar'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}