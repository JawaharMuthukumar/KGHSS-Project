import { useState } from "react";
import Card from "../ui/Card";
import Icon from "../ui/Icon";
import Badge from "../ui/Badge";
import Banner from "../portal/Banner";
import { ApiError } from "../../lib/apiClient";
import { downloadPdf, openPdf } from "../../lib/pdf";
import { formatDate } from "../../utils/formatDate";
import { PLAN_STATUS } from "../../constants/notes";


const kb = (n) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/**
 * Notes of Lessons list with checkboxes: open one plan, or open / download any selection (e.g. three weeks,
 * or the whole year) merged into one PDF for printing or the government report. `actions(plan)` adds row buttons.
 */
export default function PlanTable({ plans, showTeacher = false, actions, emptyText = "No notes yet." }) {
  const [picked, setPicked] = useState(() => new Set());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const shownIds = plans.map((p) => p.id);
  const selected = shownIds.filter((id) => picked.has(id));
  const allPicked = shownIds.length > 0 && selected.length === shownIds.length;

  const toggle = (id) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () => setPicked(allPicked ? new Set() : new Set(shownIds));

  const run = async (fn) => {
    setError("");
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not open the PDF. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const merged = { ids: selected.join(",") };

  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-navy/8">
        <label className="flex items-center gap-2 text-sm text-navy/70 cursor-pointer">
          <input type="checkbox" checked={allPicked} onChange={toggleAll} className="w-4 h-4 accent-[var(--color-gold-dark)]" />
          Select all ({plans.length})
        </label>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!selected.length || busy}
            onClick={() => run(() => openPdf("/lesson-plans/merged", merged))}
            className="flex items-center gap-1.5 text-xs font-semibold bg-gold text-navy-dark px-3.5 py-2 rounded-full hover:bg-gold-light disabled:opacity-50"
          >
            <Icon name="Printer" size={14} />
            Open {selected.length || ""} as one PDF (print)
          </button>
          <button
            type="button"
            disabled={!selected.length || busy}
            onClick={() => run(() => downloadPdf("/lesson-plans/merged", merged, "Notes of Lessons.pdf"))}
            className="flex items-center gap-1.5 text-xs font-semibold border border-navy/15 text-navy px-3.5 py-2 rounded-full hover:border-gold disabled:opacity-50"
          >
            <Icon name="Download" size={14} />
            Download
          </button>
        </div>
      </div>
      {error && <Banner tone="error" className="m-3">{error}</Banner>}

      <table className="table-cards w-full text-sm">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-navy/45 border-b border-navy/8">
            <th className="px-4 py-3 w-10"></th>
            <th className="px-4 py-3">Week</th>
            {showTeacher && <th className="px-4 py-3">Teacher</th>}
            <th className="px-4 py-3">Class · Subject</th>
            <th className="px-4 py-3">Topic</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {!plans.length && (
            <tr>
              <td colSpan={showTeacher ? 7 : 6} className="px-4 py-8 text-center text-navy/40">{emptyText}</td>
            </tr>
          )}
          {plans.map((p) => (
            <tr key={p.id} className="border-b border-navy/6 last:border-0">
              <td className="tc-aside px-4 py-3">
                <input type="checkbox" checked={picked.has(p.id)} onChange={() => toggle(p.id)} aria-label={`Select ${p.week_label} ${p.class_code} ${p.subject}`} className="w-4 h-4 accent-[var(--color-gold-dark)]" />
              </td>
              <td className="tc-primary px-4 py-3">
                <p className="font-medium text-navy whitespace-nowrap">{p.week_label}</p>
                <p className="text-xs text-navy/45">Uploaded {formatDate(p.uploaded_at)}</p>
              </td>
              {showTeacher && <td data-label="Teacher" className="px-4 py-3 text-navy/80">{p.teacher_name}</td>}
              <td data-label="Class · Subject" className="px-4 py-3 text-navy/80 whitespace-nowrap">
                {p.class_code} · {p.subject}
              </td>
              <td data-label="Topic" className="px-4 py-3 text-navy/70">
                {p.topic}
                <p className="text-[11px] text-navy/40 truncate max-w-[16rem]">
                  {p.file_name} · {kb(p.file_size)}
                </p>
              </td>
              <td data-label="Status" className="px-4 py-3">
                <Badge tone={PLAN_STATUS[p.status]?.tone}>{PLAN_STATUS[p.status]?.label || p.status}</Badge>
                {p.decided_at && (
                  <p className="text-[11px] text-navy/45 mt-1">
                    {p.status === "approved" ? "Approved" : "Returned"} {formatDate(p.decided_at)}
                    {p.decided_by_name ? ` · ${p.decided_by_name}` : ""}
                  </p>
                )}
                {p.status === "returned" && p.note && <p className="text-[11px] text-red-600 italic mt-0.5">“{p.note}”</p>}
              </td>
              <td className="tc-full px-4 py-3">
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(() => openPdf(`/lesson-plans/${p.id}/file`))}
                    className="flex items-center gap-1 text-xs font-semibold text-navy hover:bg-navy/6 px-2.5 py-1.5 rounded-lg"
                  >
                    <Icon name="Eye" size={14} />
                    View
                  </button>
                  {actions?.(p)}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
