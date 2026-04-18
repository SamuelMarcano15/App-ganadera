import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Calendar,
  CalendarClock,
  Leaf,
  FlaskConical,
  ShieldCheck,
  CheckCircle2,
  X,
  Save,
  Loader2,
  AlertCircle
} from "lucide-react";

// Importaciones Core
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabaseClient";
import { addToSyncQueue } from "@/lib/syncUtils";
import GenealogySelector from "@/components/inventario/GenealogySelector";
import BottomSheet from "@/components/ui/BottomSheet";
import AnimalForm from "@/components/inventario/AnimalForm";

export default function ServicioForm({
  animal,
  initialValues = null,
  onSubmitSuccess,
  onCancel,
  isModal = false
}) {
  const isEditing = !!initialValues?.id;

  // --- CONSULTAS REACTIVAS ---
  const lastOffspring = useLiveQuery(
    () => db.animals
      .where('mother_id').equals(animal.id)
      .sortBy('birth_date')
      .then(res => res.filter(a => !a.deleted_at).pop()),
    [animal.id]
  );

  // --- ESTADOS REACT ---
  const [tipoServicio, setTipoServicio] = useState(() => {
    if (initialValues?.type_conception) {
      if (initialValues.type_conception === 'MN') return 'Monta Natural';
      if (initialValues.type_conception === 'IA') return 'Inseminación Artificial';
      return initialValues.type_conception;
    }
    return 'Monta Natural';
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [isCreatingAnimal, setIsCreatingAnimal] = useState(false);

  // --- FORMULARIO ---
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      fechaServicio: initialValues?.service_date || new Date().toISOString().split('T')[0],
      toroId: initialValues?.father_id || "",
    },
  });

  // --- LÓGICA LOCAL-FIRST (Zero Delay) ---
  const getLocalUserId = () => {
    return localStorage.getItem("ganadera_user_id");
  };

  const onSubmit = async (data) => {
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
        mother_id: animal.id,
        father_id: data.toroId || null,
        type_conception: tipoServicio,
        service_date: data.fechaServicio,
        created_at: isEditing ? initialValues.created_at : now,
        updated_at: now,
      };

      await db.transaction('rw', [db.services, db.sync_queue], async () => {
        if (isEditing) {
          await db.services.put(recordData);
          await addToSyncQueue('services', 'UPDATE', recordData);
        } else {
          await db.services.add(recordData);
          await addToSyncQueue('services', 'INSERT', recordData);
        }
      });

      setShowToast(true);
      
      // --- CAMBIO UX: Cerrar rápido en 500ms ---
      setTimeout(() => {
        setShowToast(false);
        onSubmitSuccess();
      }, 500);

    } catch (err) {
      console.error('Error guardando servicio:', err);
      alert('Error al guardar. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed z-[100] px-5 py-4 bg-[#1A3621] text-white rounded-2xl shadow-xl transition-all animate-in fade-in slide-in-from-top-5 top-5 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:-translate-x-0 font-bold text-sm flex items-center gap-3 w-[90%] max-w-sm sm:w-auto">
          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          {isEditing ? 'Servicio actualizado' : 'Servicio registrado exitosamente'}
        </div>
      )}

      {/* REFERENCIA HISTÓRICA */}
      <div className="bg-[#EFEFE6] rounded-xl border-l-[6px] border-[#1A3621] p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <CalendarClock className="text-[#1A3621] mt-0.5 flex-shrink-0" size={20} strokeWidth={2.5} />
          <div>
            <span className="block text-[0.65rem] uppercase font-bold tracking-widest text-gray-500 mb-1">
              Referencia Histórica
            </span>
            <h3 className="font-bold text-[#1A3621] text-[17px] leading-tight">
              Fecha del Parto Anterior:<br />
              {lastOffspring ? new Date(lastOffspring.birth_date).toLocaleDateString('es-ES') : 'Sin registros previos'}
            </h3>
            <p className="text-[11px] text-gray-500 mt-2 font-medium leading-relaxed">
              Información vital para el cálculo del intervalo entre partos y la ventana de fertilidad actual.
            </p>
          </div>
        </div>
      </div>

      {/* FECHA DE SERVICIO */}
      <div className="space-y-2.5">
        <label className="flex items-center text-[0.68rem] font-bold uppercase tracking-widest text-[#1A3621] ml-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1A3621] mr-2"></span>
          Fecha de Servicio *
        </label>
        <div className={`bg-white rounded-xl p-4 flex items-center justify-between shadow-sm border border-gray-100 border-l-4 ${errors.fechaServicio ? 'border-l-red-400' : 'border-l-[#EAECE4]'}`}>
          <input
            type="date"
            className="font-bold text-gray-800 text-base outline-none w-full bg-transparent appearance-none"
            {...register("fechaServicio", { required: true })}
          />
        </div>
        {errors.fechaServicio && <p className="text-[10px] text-red-500 font-bold flex items-center gap-1 ml-1"><AlertCircle size={10} /> Campo obligatorio</p>}
      </div>

      {/* TIPO DE SERVICIO (RADIO CARDS) */}
      <div className="space-y-2.5">
        <label className="flex items-center text-[0.68rem] font-bold uppercase tracking-widest text-[#1A3621] ml-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1A3621] mr-2"></span>
          Tipo de Servicio
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setTipoServicio('Monta Natural')}
            className={`flex flex-col items-center justify-center p-5 rounded-2xl cursor-pointer transition-all active:scale-95 ${tipoServicio === 'Monta Natural'
              ? 'bg-[#F0F2EB] border-2 border-[#1A3621] shadow-sm'
              : 'bg-[#F4F5F0] border-2 border-transparent opacity-80 hover:bg-[#EAECE4]'
              }`}
          >
            <Leaf size={24} className={`mb-3 ${tipoServicio === 'Monta Natural' ? 'text-[#1A3621]' : 'text-gray-400'}`} strokeWidth={2.5} />
            <span className={`text-[13px] font-bold text-center ${tipoServicio === 'Monta Natural' ? 'text-[#1A3621]' : 'text-gray-500'}`}>
              Monta Natural
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTipoServicio('Inseminación Artificial')}
            className={`flex flex-col items-center justify-center p-5 rounded-2xl cursor-pointer transition-all active:scale-95 ${tipoServicio === 'Inseminación Artificial'
              ? 'bg-[#F0F2EB] border-2 border-[#1A3621] shadow-sm'
              : 'bg-[#F4F5F0] border-2 border-transparent opacity-80 hover:bg-[#EAECE4]'
              }`}
          >
            <FlaskConical size={24} className={`mb-3 ${tipoServicio === 'Inseminación Artificial' ? 'text-[#1A3621]' : 'text-gray-400'}`} strokeWidth={2.5} />
            <span className={`text-[13px] font-bold text-center ${tipoServicio === 'Inseminación Artificial' ? 'text-[#1A3621]' : 'text-gray-500'}`}>
              Inseminación Artificial
            </span>
          </button>
        </div>
      </div>

      {/* IDENTIFICACIÓN DEL TORO */}
      <div className="relative z-50">
        <GenealogySelector
          label={
            <span className="flex items-center text-[0.68rem] font-bold uppercase tracking-widest text-[#1A3621] ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1A3621] mr-2"></span>
              Identificación del Toro
            </span>
          }
          value={watch("toroId")}
          onChange={(val) => setValue("toroId", val || "")}
          sex="Macho"
          onCreateNew={() => setIsCreatingAnimal(true)}
        />
      </div>

      {/* Footer Buttons */}
      <div className="mt-8">
        <div className="max-w-md mx-auto grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="flex flex-col items-center justify-center gap-1.5 bg-[#CC5A5A] hover:bg-[#b84e4e] text-white rounded-full py-2 transition-all active:scale-95 shadow-md disabled:opacity-50 cursor-pointer"
          >
            <X size={24} strokeWidth={2.5} />
            <span className="text-[10px] font-black uppercase tracking-widest">Cancelar</span>
          </button>

          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={isSaving}
            className={`flex flex-col items-center justify-center gap-1.5 bg-[#1A3621] hover:bg-[#122b19] text-white rounded-full py-2 transition-all active:scale-95 shadow-lg shadow-[#1A3621]/20 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer`}
          >
            {isSaving ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <CheckCircle2 size={24} strokeWidth={2.5} />
            )}
            <span className="text-[10px] font-black uppercase tracking-widest">
              {isSaving ? 'Guardando...' : 'Guardar'}
            </span>
          </button>
        </div>
      </div>

      {/* MODAL CREAR NUEVO ANIMAL (TORO) */}
      <BottomSheet
        isOpen={isCreatingAnimal}
        onClose={() => setIsCreatingAnimal(false)}
        title="Registrar Semental"
        description="Añade un nuevo toro al inventario para seleccionarlo en este servicio."
      >
        <div className="pb-8">
          <AnimalForm
            initialValues={{ sex: 'Macho', status: 'Activo' }}
            onSubmitSuccess={() => setIsCreatingAnimal(false)}
            onCancel={() => setIsCreatingAnimal(false)}
            isModal={true}
          />
        </div>
      </BottomSheet>
    </div>
  );
}