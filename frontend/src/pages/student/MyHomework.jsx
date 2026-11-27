import { useState } from "react";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Banner from "../../components/portal/Banner";
import EmptyState from "../../components/portal/EmptyState";
import { ContentSkeleton } from "../../components/ui/Skeleton";
import { useApiResource } from "../../hooks/useApiResource";
import { dayLabel } from "../../constants/homework";

/** Student: their class's homework — still to submit first, then the last two weeks' homework. */
export default function MyHomework() {
  const { data, loading, error } = useApiResource("/homework/mine", { live: "homework" });
  const [subject, setSubject] = useState("all");

  if (loading) return <ContentSkeleton rows={5} />;
  const header = <PortalPageHeader title="My Homework" description="Homework your subject teachers have given your class." />;
  if (error) return <div>{header}<Banner tone="error">{error.message}</Banner></div>;

  const items = data.items || [];
  const subjects = [...new Set(items.map((h) => h.subject))].sort();
  const shown = items.filter((h) => subject === "all" || h.subject === subject);
  const pending = shown.filter((h) => h.due_on >= data.today).sort((a, b) => a.due_on.localeCompare(b.due_on));
  const earlier = shown.filter((h) => h.due_on < data.today);

  if (!items.length) {
    return (
      <div>
        {header}
        <EmptyState icon="ClipboardList" title="No homework" description="No homework in the last two weeks. New homework from your teachers will appear here." />
      </div>
    );
  }

  return (
    <div>
      {header}
      <div className="flex flex-wrap gap-2 mb-4">
        {["all", ...subjects].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSubject(s)}
            className={`px-3.5 py-1.5 rounded-full text-sm border transition-colors ${
              subject === s ? "bg-navy text-white border-navy" : "bg-white text-navy border-navy/15 hover:border-gold"
            }`}
          >
            {s === "all" ? "All subjects" : s}
          </button>
        ))}
      </div>

      <Section title="To submit" items={pending} today={data.today} empty="Nothing due. Well done!" />
      <Section title="Earlier" items={earlier} today={data.today} empty="No earlier homework." />
    </div>
  );
}

function Section({ title, items, today, empty }) {
  return (
    <Card className="p-5 mb-5">
      <h2 className="font-heading font-bold text-navy text-sm mb-3">
        {title} <span className="text-navy/40 font-normal">({items.length})</span>
      </h2>
      {items.length === 0 && <p className="text-sm text-navy/50">{empty}</p>}
      <div className="flex flex-col">
        {items.map((h) => (
          <div key={h.id} className="py-3 border-b border-navy/6 last:border-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-sm font-semibold text-navy">{h.subject}</span>
              <span className="text-xs text-navy/50">{h.teacher_name}</span>
              <span className="ml-auto">
                {h.due_on === today ? (
                  <Badge tone="danger">Submit today</Badge>
                ) : (
                  <Badge tone={h.due_on > today ? "gold" : "navy"}>Submit by {dayLabel(h.due_on)}</Badge>
                )}
              </span>
            </div>
            <p className="text-sm text-navy/75 mt-1 whitespace-pre-line">{h.details}</p>
            <p className="text-xs text-navy/40 mt-1">Given {dayLabel(h.given_on)}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
