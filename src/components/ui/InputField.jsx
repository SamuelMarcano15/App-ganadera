
import { useState } from "react";
import { Eye, EyeOff, AlertCircle } from "lucide-react";

/**
 * InputField — Campo de texto reutilizable
 * Sistema de diseño: Terra Form ("The Pastoral Editorial")
 *
 * Props:
 *   id           — ID único del input (requerido para accesibilidad)
 *   label        — Etiqueta visible del campo
 *   type         — Tipo de input: "text" | "email" | "password" (default: "text")
 *   placeholder  — Texto placeholder
 *   autoComplete — Valor del atributo autocomplete
 *   error        — Mensaje de error (string | undefined)
 *   registration — Objeto retornado por react-hook-form register()
 *   icon         — Componente de ícono de lucide-react (optional)
 *   hint         — Texto de ayuda debajo del campo (optional)
 */
export default function InputField({
  id,
  label,
  type = "text",
  placeholder,
  autoComplete,
  error,
  registration,
  icon: Icon,
  rightIcon: RightIcon,
  hint,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const resolvedType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="flex flex-col gap-1.5">
      {/* Label */}
      <label
        htmlFor={id}
        className={`font-sans text-sm font-medium ${error ? "text-error" : "text-on-surface-variant"
          }`}
      >
        {label}
      </label>

      {/* Input wrapper */}
      <div
        className={`relative flex items-center transition-all duration-200 bg-surface-container-lowest rounded-full min-h-[56px] outline-none ${error ? "ring-2 ring-error" : ""}`}
      >
        {/* Left icon */}
        {Icon && (
          <span className="absolute left-4 pointer-events-none text-outline">
            <Icon size={20} strokeWidth={1.75} />
          </span>
        )}

        <input
          id={id}
          type={resolvedType}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${id}-error` : hint ? `${id}-hint` : undefined
          }
          {...registration}
          className={`w-full bg-transparent outline-none text-on-surface font-sans text-base py-3.5 placeholder:text-outline-variant placeholder:font-normal placeholder:opacity-80 ${Icon ? "pl-12" : "pl-6"
            } ${isPassword || RightIcon ? "pr-12" : "pr-6"}`}
        />

        {RightIcon && !isPassword && (
          <span className="absolute right-4 pointer-events-none text-on-surface-variant">
           <RightIcon size={20} strokeWidth={1.75} />
          </span>
        )}

        {/* Toggle visibilidad de contraseña */}
        {isPassword && (
          <button
            type="button"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 flex items-center justify-center p-2 rounded-full transition-colors duration-150 text-outline bg-transparent border-none cursor-pointer"
          >
            {showPassword ? (
              <EyeOff size={20} strokeWidth={1.75} />
            ) : (
              <Eye size={20} strokeWidth={1.75} />
            )}
          </button>
        )}
      </div>

      {/* Hint text */}
      {hint && !error && (
        <p id={`${id}-hint`} className="font-sans text-xs text-on-surface-variant m-0 leading-4">
          {hint}
        </p>
      )}

      {/* Error message */}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="flex items-center gap-1.5 font-sans text-[0.8125rem] text-error m-0"
        >
          <AlertCircle size={14} strokeWidth={2} className="shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
