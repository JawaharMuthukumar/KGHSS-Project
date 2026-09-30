import Icon from "../ui/Icon";

const tones = {
  error: { wrap: "bg-red-50 border-red-200 text-red-700", icon: "CircleAlert" },
  success: { wrap: "bg-emerald-50 border-emerald-200 text-emerald-700", icon: "CircleCheck" },
  info: { wrap: "bg-navy/5 border-navy/10 text-navy/80", icon: "Info" },
};

export default function Banner({ tone = "info", children, className = "" }) {
  if (!children) return null;
  const t = tones[tone] || tones.info;
  return (
    <div className={`flex items-start gap-2 text-sm border rounded-xl px-3.5 py-2.5 ${t.wrap} ${className}`}>
      <Icon name={t.icon} size={16} className="shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}
