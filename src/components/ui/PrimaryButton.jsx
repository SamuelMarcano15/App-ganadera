
/**
 * PrimaryButton — Botón principal tipo pill
 * Sistema de diseño: Terra Form ("The Pastoral Editorial")
 *
 * Props:
 *   type       — "button" | "submit" | "reset" (default: "button")
 *   isLoading  — Muestra spinner y deshabilita el botón
 *   disabled   — Deshabilita el botón
 *   onClick    — Handler de click (optional, para type="button")
 *   children   — Contenido/texto del botón
 *   fullWidth  — Si true, ocupa 100% del ancho (default: true)
 *   variant    — "primary" | "secondary" (default: "primary")
 */
export default function PrimaryButton({
  type = "button",
  isLoading = false,
  disabled = false,
  onClick,
  children,
  fullWidth = true,
  variant = "primary",
}) {
  const isDisabled = disabled || isLoading;

  const baseClasses = "relative flex items-center justify-center gap-[10px] min-h-[60px] rounded-full border-none px-7 font-sans text-[0.9375rem] font-bold tracking-[0.08em] uppercase transition-all duration-200 ease-out select-none";

  const widthClasses = fullWidth ? "w-full" : "w-auto";

  let variantClasses = "";
  if (isDisabled) {
    variantClasses = "bg-surface-container-high text-on-surface-variant cursor-not-allowed shadow-none opacity-100";
  } else if (variant === "primary") {
    variantClasses = "bg-primary-container text-on-primary shadow-[0_4px_20px_rgba(23,52,24,0.3)] hover:bg-[#1e4520] hover:shadow-[0_6px_24px_rgba(23,52,24,0.38)] active:scale-[0.98] cursor-pointer";
  } else {
    variantClasses = "bg-secondary-container text-on-secondary-container active:scale-[0.98] cursor-pointer";
  }

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={`${baseClasses} ${widthClasses} ${variantClasses}`}
    >
      {isLoading && (
        <svg
          className="animate-spin"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="32"
            strokeDashoffset="12"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
