import { Link } from "react-router-dom";
import Card from "../ui/Card";
import Icon from "../ui/Icon";

/** A headline number. Pass `to` to make the whole card a link to the page behind the number. */
export default function StatCard({ label, value, icon, tone = "navy", to }) {
  const tones = {
    navy: "bg-navy/8 text-navy",
    gold: "bg-gold/12 text-gold-dark",
    teal: "bg-teal/10 text-teal",
    danger: "bg-red-50 text-red-600",
    success: "bg-emerald-50 text-emerald-600",
  };

  const card = (
    <Card className={`p-5 flex items-center gap-4 h-full ${to ? "transition-colors group-hover:border-gold/50 group-hover:bg-gold/[0.03]" : ""}`}>
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
      {to && <Icon name="ChevronRight" size={16} className="ml-auto text-navy/25 group-hover:text-gold-dark shrink-0" />}
    </Card>
  );

  if (!to) return card;
  return (
    <Link to={to} className="group block rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-gold">
      {card}
    </Link>
  );
}
