import { useRef, useState } from "react";
import Card from "../ui/Card";
import Icon from "../ui/Icon";
import Banner from "../portal/Banner";
import { inputClass } from "../portal/FormField";
import ReportCard from "./ReportCard";
import { useApiResource } from "../../hooks/useApiResource";
import { printElement } from "../../lib/printElement";
import { ContentSkeleton } from "../ui/Skeleton";

/** Every student's progress card for a class, printed two per A4 portrait sheet. */
export default function ClassReportCards({ classCode }) {
  const sheet = useRef(null);
  const [search, setSearch] = useState("");
  const { data, loading, error } = useApiResource(`/classes/${classCode}/report-cards`, {
    enabled: Boolean(classCode),
    deps: [classCode],
  });

  if (error) return <Banner tone="error">{error.message}</Banner>;
  if (loading) return <ContentSkeleton rows={4} />;
  if (!data || data.cards.length === 0) return <Card className="p-8 text-center text-navy/50">No students in Class {classCode}.</Card>;

  const q = search.trim().toLowerCase();
  const cards = q ? data.cards.filter((c) => c.name.toLowerCase().includes(q) || c.registration_no.toLowerCase().includes(q)) : data.cards;
  const pairs = [];
  for (let i = 0; i < cards.length; i += 2) pairs.push(cards.slice(i, i + 2));

  const printOne = (studentId, name) => {
    const el = sheet.current?.querySelector(`[data-student="${studentId}"] .report-card`);
    printElement(el, { orientation: "portrait", title: `${name} - Report Card` });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="relative w-full max-w-xs">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/35" />
          <input
            type="text"
            placeholder="Search student…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputClass} pl-9`}
          />
        </div>
        <button
          type="button"
          onClick={() => printElement(sheet.current, { orientation: "portrait", title: `${classCode} Report Cards` })}
          className="flex items-center gap-1.5 bg-gold text-navy-dark font-semibold text-sm px-4 py-2.5 rounded-full hover:bg-gold-light transition-colors"
        >
          <Icon name="Printer" size={15} />
          Print {q ? `${cards.length} shown` : "All"} (2 per A4)
        </button>
      </div>

      <Card className="p-4 overflow-x-auto">
        <div ref={sheet} className="bg-white min-w-[720px]">
          {pairs.map((pair, i) => (
            // Each pair fills one A4 sheet; the dashed line marks where to cut.
            <div key={i} className="flex flex-col gap-4 pb-4" style={{ breakAfter: i < pairs.length - 1 ? "page" : "auto" }}>
              {pair.map((card, j) => (
                <div key={card.student_id} data-student={card.student_id} className="relative group">
                  {j === 1 && <div className="border-t border-dashed border-black/40 mb-4" />}
                  <ReportCard meta={data} card={card} />
                  <button
                    type="button"
                    onClick={() => printOne(card.student_id, card.name)}
                    className="print:hidden absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs font-semibold text-navy bg-white border border-navy/15 px-2.5 py-1.5 rounded-full shadow-sm hover:bg-navy/5 transition-opacity"
                  >
                    <Icon name="Printer" size={12} />
                    Print
                  </button>
                </div>
              ))}
            </div>
          ))}
          {cards.length === 0 && <p className="p-6 text-center text-sm text-navy/50">No students match “{search}”.</p>}
        </div>
      </Card>
    </div>
  );
}
