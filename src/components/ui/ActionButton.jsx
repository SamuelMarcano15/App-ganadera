export default function ActionButton({ icon: Icon, label, variant = "primary", onClick, type = "button" }) {
  const isDanger = variant === "danger";

  return (
    <button
      type={type}
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center gap-1.5 rounded-full py-3.5 transition-all duration-150 active:scale-[0.97] cursor-pointer
        ${isDanger 
          ? "bg-error text-on-error hover:bg-error/90 shadow-[0_4px_14px_rgba(186,26,26,0.3)]" 
          : "bg-primary text-on-primary hover:bg-primary/90 shadow-[0_4px_14px_rgba(23,52,24,0.3)]"
        }`}
    >
      <Icon size={22} strokeWidth={2.5} />
      <span className="font-sans text-[0.6875rem] font-extrabold uppercase tracking-widest">
        {label}
      </span>
    </button>
  );
}
