export default function ProductTypeCard({ icon: Icon, label, isSelected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-2 py-5 px-3 rounded-xl transition-all duration-200 cursor-pointer shadow-sm
        ${isSelected 
          ? "bg-primary-fixed border-2 border-primary text-primary" 
          : "bg-surface-container-lowest border-2 border-transparent text-on-surface-variant hover:bg-surface-container-low"
        }`}
    >
      <Icon size={28} strokeWidth={isSelected ? 2.5 : 2} />
      <span className={`font-sans text-sm ${isSelected ? "font-extrabold" : "font-bold"}`}>
        {label}
      </span>
    </button>
  );
}
