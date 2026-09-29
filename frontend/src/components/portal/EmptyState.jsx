import Card from "../ui/Card";
import Icon from "../ui/Icon";

export default function EmptyState({ icon = "Inbox", title, description }) {
  return (
    <Card className="p-10 flex flex-col items-center text-center gap-3">
      <span className="flex items-center justify-center w-14 h-14 rounded-full bg-navy/6 text-navy/40">
        <Icon name={icon} size={26} />
      </span>
      <h3 className="font-heading font-bold text-navy text-base">{title}</h3>
      {description && <p className="text-sm text-navy/55 max-w-md">{description}</p>}
    </Card>
  );
}
