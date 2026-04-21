import { useState, useEffect } from "react";
// Importa el nuevo icono
import { TbMedicineSyrup } from "react-icons/tb";
import { useForm } from "react-hook-form";
import {
  Syringe,
  Pill,
  Apple,
  Stethoscope,
  Save,
  X,
  CheckCircle,
  FlaskConical,
  Calendar,
  Loader2,
  AlertCircle
} from "lucide-react";

// Importaciones Core
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabaseClient";
import { addToSyncQueue } from "@/lib/syncUtils";
import BottomSheet from "@/components/ui/BottomSheet";
import { DateInput } from '@/components/ui/DateInput';

const PRODUCT_TYPE_OPTIONS = [
  { id: 'vacuna', label: 'Vacuna', icon: Syringe, color: 'bg-[#EEF7EE] text-[#1B4820]', activeColor: 'ring-4 ring-[#1B4820]/10 border-[#1B4820]' },
  { 
  id: 'desparasitante',label: 'Desparasitante',icon: TbMedicineSyrup, color: 'bg-[#FDF2E9] text-[#8C6746]',activeColor: 'ring-4 ring-[#8C6746]/10 border-[#8C6746]' },
{ id: 'vitamina', label: 'Vitamina', icon: Pill, color: 'bg-[#F7F9EE] text-[#4F663F]', activeColor: 'ring-4 ring-[#4F663F]/10 border-[#4F663F]' },
  { id: 'antibiotico', label: 'Antibiótico', icon: Stethoscope, color: 'bg-[#FEECEC] text-[#D15555]', activeColor: 'ring-4 ring-[#D15555]/10 border-[#D15555]' },
];

const PRODUCT_TYPE_MAP = {
  'vacuna': 'Vacuna',
  'desparasitante': 'Desparasitante',
  'vitamina': 'Vitamina',
  'antibiotico': 'Antibiótico'
};

const PRODUCT_TYPE_REVERSE = {
  'Vacuna': 'vacuna',
  'Desparasitante': 'desparasitante',
  'Vitamina': 'vitamina',
  'Antibiótico': 'antibiotico'
};

/**
 * HealthForm: Formulario para CREAR o EDITAR registros médicos.
 * * @param {Object} animal - Datos del animal.
 * @param {Object} initialValues - Registro médico si es edición.
 * @param {Function} onSubmitSuccess - Callback éxito.
 * @param {Function} onCancel - Callback cancelar.
 * @param {Boolean} isModal - Si es modal (ajusta espaciados).
 */
export default function HealthForm({ 
  animal, 
  initialValues = null, 
  onSubmitSuccess, 
  onCancel,
  isModal = false,
  batchAnimalIds = []
}) {
  const isEditing = !!initialValues?.id;

  // --- ESTADOS REACT ---
  const [selectedType, setSelectedType] = useState(() => {
    if (initialValues?.product_type) {
      return PRODUCT_TYPE_REVERSE[initialValues.product_type] || 'vacuna';
    }
    return 'vacuna';
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
      productName: initialValues?.product_name || "",
      dose: initialValues?.dose || "",
      applicationDate: initialValues?.application_date || new Date().toISOString().split('T')[0],
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
      const batchId = batchAnimalIds.length > 1 ? globalThis.crypto.randomUUID() : null;

      if (batchAnimalIds.length > 0) {
        // --- MODO LOTE ---
        const records = batchAnimalIds.map(id => ({
          id: globalThis.crypto.randomUUID(),
          user_id: userId,
          animal_id: id,
          batch_id: batchId,
          product_type: PRODUCT_TYPE_MAP[selectedType],
          product_name: data.productName,
          dose: data.dose || null,
          application_date: data.applicationDate,
          created_at: now,
          updated_at: now,
        }));

        await db.transaction('rw', [db.health_records, db.sync_queue], async () => {
          await db.health_records.bulkAdd(records);
          for (const record of records) {
            await addToSyncQueue('health_records', 'INSERT', record);
          }
        });
      } else {
        // --- MODO INDIVIDUAL ---
        const recordData = {
          id: isEditing ? initialValues.id : globalThis.crypto.randomUUID(),
          user_id: userId,
          animal_id: animal.id,
          product_type: PRODUCT_TYPE_MAP[selectedType],
          product_name: data.productName,
          dose: data.dose || null,
          application_date: data.applicationDate,
          created_at: isEditing ? initialValues.created_at : now,
          updated_at: now,
        };

        await db.transaction('rw', [db.health_records, db.sync_queue], async () => {
          if (isEditing) {
            await db.health_records.put(recordData);
            await addToSyncQueue('health_records', 'UPDATE', recordData);
          } else {
            await db.health_records.add(recordData);
            await addToSyncQueue('health_records', 'INSERT', recordData);
          }
        });
      }

      setShowToast(true);
      
      // --- CAMBIO UX: Cerrar rápido en 500ms ---
      setTimeout(() => {
        setShowToast(false);
        onSubmitSuccess();
      }, 500);

    } catch (err) {
      console.error('Error guardando registro médico:', err);
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
          {batchAnimalIds.length > 0 
            ? `Tratamiento aplicado a ${batchAnimalIds.length} animales` 
            : (isEditing ? 'Tratamiento actualizado' : 'Tratamiento registrado exitosamente')}
        </div>
      )}

      {/* Título de Sección */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-6 bg-[#1A3621] rounded-full" />
          <h3 className="text-xl font-black text-[#1A3621] uppercase tracking-tight">Tipo de Producto</h3>
        </div>
        <p className="text-xs text-gray-400 font-medium ml-3.5">Selecciona la categoría del tratamiento médico.</p>
      </div>

      {/* Grid de Tipos */}
      <div className="grid grid-cols-2 gap-4">
        {PRODUCT_TYPE_OPTIONS.map((item) => {
          const Icon = item.icon;
          const isSelected = selectedType === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedType(item.id)}
              className={`flex flex-col items-center justify-center p-6 rounded-[2.5rem] border-2 transition-all active:scale-95 cursor-pointer shadow-sm
                ${isSelected ? item.activeColor + " bg-white" : "border-transparent bg-gray-50/50"}
              `}
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${item.color}`}>
                <Icon size={28} strokeWidth={isSelected ? 3 : 2} />
              </div>
              <span className={`text-sm font-black uppercase tracking-widest ${isSelected ? 'text-[#1A3621]' : 'text-gray-400 opacity-60'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Inputs Principales */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100/50 space-y-8">
        {/* Nombre del Producto */}
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Nombre del Medicamento / Producto</label>
          <div className={`flex items-center gap-4 bg-gray-50 rounded-2xl px-5 py-4 border transition-all ${errors.productName ? 'border-red-400 bg-red-50' : 'border-gray-100 focus-within:border-[#1B4820]'}`}>
            <FlaskConical size={20} className="text-[#1A3621] opacity-40" />
            <input 
              type="text" 
              placeholder="Ej. Ivermectina 1%"
              className="font-black text-gray-800 text-lg outline-none w-full bg-transparent placeholder:text-gray-300"
              {...register("productName", { required: true })}
            />
          </div>
          {errors.productName && <p className="text-[10px] text-red-500 font-black flex items-center gap-1 ml-1"><AlertCircle size={10} /> Este campo es obligatorio</p>}
        </div>

        {/* Dosis */}
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Dosis Aplicada</label>
          <div className={`flex items-center gap-4 bg-gray-50 rounded-2xl px-5 py-4 border border-gray-100 focus-within:border-[#1B4820]`}>
            <div className="font-black text-[#1A3621] opacity-40 text-lg ml-1">ml</div>
            <input 
              type="number"
              step="any"
              inputMode="decimal"
              onWheel={(e) => e.target.blur()}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
              }}
              placeholder="Ej. 10"
              className="font-black text-gray-800 text-lg outline-none w-full bg-transparent placeholder:text-gray-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              {...register("dose")}
            />
          </div>
        </div>

      </div>

      {/* Tarjeta Fecha de Aplicación */}
      <div className="relative overflow-hidden bg-[#eaf4e7] rounded-[2rem] border-l-[8px] border-[#1A3621] p-6 sm:p-8 shadow-sm">
        <div className="absolute -right-4 -top-4 w-32 h-32 rounded-3xl bg-[#1A3621]/5 rotate-12 pointer-events-none" />
        <div className="absolute right-12 top-10 w-16 h-16 rounded-full bg-[#1A3621]/5 pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-1.5">
              <h4 className="text-xl sm:text-2xl font-black text-[#1A3621] tracking-tight">Fecha de Aplicación</h4>
              <span className="text-red-500 font-black text-2xl leading-none">*</span>
            </div>
            <p className="text-[13px] sm:text-sm font-semibold text-[#1A3621]/70 leading-relaxed md:max-w-sm">
              Registrar la fecha exacta para el control de periodos de carencia.
            </p>
          </div>

          <div className="relative w-full sm:w-[45%]">
            <DateInput
              className={`w-full bg-white rounded-full py-4 px-6 font-black text-[#1A3621] text-lg outline-none transition-all shadow-sm border-2
                ${errors.applicationDate ? "border-red-400" : "border-transparent focus:border-[#1A3621]"}`}
              {...register("applicationDate", { required: true })}
            />
            {errors.applicationDate && (
              <p className="absolute -bottom-5 left-4 text-[10px] text-red-500 font-black flex items-center gap-1">
                <AlertCircle size={10} /> Obligatorio
              </p>
            )}
          </div>
        </div>
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