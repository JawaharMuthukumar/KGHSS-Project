import Card from "../ui/Card";
import Icon from "../ui/Icon";

export default function StatCard({ label, value, icon, tone = "navy" }) {
  const tones = {
    navy: "bg-navy/8 text-navy",
    gold: "bg-gold/12 text-gold-dark",
    teal: "bg-teal/10 text-teal",
    danger: "bg-red-50 text-red-600",
  };

  return (
    <Card className="p-5 flex items-center gap-4">
      {icon && (
        <span className={`flex items-center justify-center w-11 h-11 rounded-2xl shrink-0 ${tones[tone] || tones.navy}`}>
          <Icon name={icon} size={20} />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-2xl font-heading font-bold text-navy leading-tight">
          {value === undefined || value === null ? "—" : value}
        </p>
        <p className="text-xs text-navy/55 mt-0.5 truncate">{label}</p>
      </div>
    </Card>
  );
}
