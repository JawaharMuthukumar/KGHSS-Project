const tones = {
  gold: "bg-gold/12 text-gold-dark",
  navy: "bg-navy/8 text-navy",
  teal: "bg-teal/10 text-teal",
  white: "bg-white/15 text-white",
  sample: "bg-amber-50 text-amber-700 border border-amber-200",
  danger: "bg-red-50 text-red-600",
  success: "bg-emerald-50 text-emerald-600",
};

export default function Badge({ children, tone = "navy", className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
