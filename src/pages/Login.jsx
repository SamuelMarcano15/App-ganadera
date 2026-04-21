import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Tractor, ArrowRight } from "lucide-react";
import InputField from "@/components/ui/InputField";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { supabase } from "@/lib/supabaseClient";

const loginSchema = z.object({
  email: z.string().min(1, "El correo electrónico es requerido").email("Ingresa un correo electrónico válido"),
  password: z.string().min(1, "La contraseña es requerida").min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export default function LoginPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState(null);

  // --- FASE 1: EL PASAPORTE LOCAL (Cero Supabase, Cero navigator.onLine) ---
  useEffect(() => {
    const verificarAcceso = () => {
      // 1. Leemos directamente el disco duro del teléfono
      const userId = localStorage.getItem("ganadera_user_id");

      // 2. Si el pasaporte existe, entra directo. No preguntamos a Supabase.
      if (userId) {
        navigate("/inventario");
      }
    };

    verificarAcceso();
  }, [navigate]);
  // --------------------------------------------------------------------------

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data) {
    setIsLoading(true);
    setServerError(null);
    try {
      // Esta es la ÚNICA vez que el usuario necesita internet para entrar
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) throw error;

      if (authData.session?.user?.id) {
        // --- FASE 1: CREACIÓN DEL PASAPORTE ---
        // Guardamos el ID real del usuario, no solo un "true/false"
        localStorage.setItem("ganadera_user_id", authData.session.user.id);

        // Limpiamos la bandera vieja de Next.js si es que quedó por ahí
        localStorage.removeItem("ganadera_offline_session");

        navigate("/inventario");
      }
    } catch (error) {
      const msg = error?.message || "";
      if (msg === "Failed to fetch") {
        setServerError("Necesitas conexión a internet para iniciar sesión por primera vez.");
      } else {
        setServerError("Correo o contraseña incorrectos. Intenta de nuevo.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mobile-shell-wrapper">
      <div className="mobile-shell bg-surface-container-low">
        <div className="flex flex-col items-center pt-[clamp(56px,12vh,80px)] px-6 pb-10">
          <div className="flex flex-col items-center gap-[14px] mb-10">
            <div className="w-[80px] h-[80px] rounded-3xl bg-primary-container flex items-center justify-center">
              <Tractor size={44} strokeWidth={1.5} className="text-primary-fixed" />
            </div>
            <h1 className="font-display text-4xl font-bold text-on-surface tracking-[-0.02em] leading-tight m-0 text-center">
              Inicio de Sesión
            </h1>
            <p className="font-sans text-[0.6875rem] font-medium text-outline tracking-[0.16em] uppercase m-0 text-center">
              Gestión Ganadera de Precisión
            </p>
          </div>

          <div className="w-full bg-surface-container-low rounded-[28px] p-7">
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col">
              <div className="mb-5">
                <InputField id="login-email" label="Correo Electrónico" type="email" placeholder="nombre@campo.com" autoComplete="email" registration={register("email")} error={errors.email?.message} />
              </div>
              <div className="flex items-baseline justify-between mb-2">
                <label htmlFor="login-password" className="font-sans text-sm font-medium text-on-surface-variant">Contraseña</label>
              </div>
              <div className="mb-7">
                <InputField id="login-password" label="" type="password" placeholder="••••••••" autoComplete="current-password" registration={register("password")} error={errors.password?.message} />
              </div>

              {serverError && (
                <div role="alert" className="bg-error-container rounded-xl py-3 px-4 font-sans text-sm text-on-error-container mb-4 leading-relaxed">
                  {serverError}
                </div>
              )}

              <PrimaryButton type="submit" isLoading={isLoading} fullWidth={true}>
                Iniciar Sesión
                <ArrowRight size={20} strokeWidth={2.5} />
              </PrimaryButton>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}