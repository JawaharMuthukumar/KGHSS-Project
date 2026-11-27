import { useEffect, useState } from "react";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Banner from "../../components/portal/Banner";
import { inputClass } from "../../components/portal/FormField";
import PlanTable from "../../components/notes/PlanTable";
import { ContentSkeleton } from "../../components/ui/Skeleton";
import { useApiResource } from "../../hooks/useApiResource";
import { useToast } from "../../components/ui/Toast";
import { api, ApiError } from "../../lib/apiClient";
import { openPdf } from "../../lib/pdf";

const TABS = [
  { id: "pending", label: "To approve" },
  { id: "weeks", label: "Week by week" },
  { id: "all", label: "All notes" },
];

/** Approve / return buttons for one plan; a return needs a short reason for the teacher. */
function Decide({ plan, onDone }) {
  const toast = useToast();
  const [returning, setReturning] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async (approve) => {
    setBusy(true);
    try {
      await api.patch(`/lesson-plans/${plan.id}/decision`, { approve, note: approve ? undefined : note });
      toast.success(approve ? `Approved and signed: ${plan.teacher_name} · ${plan.class_code} ${plan.subject}` : "Returned to the teacher");
      setReturning(false);
      onDone();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update.");
    } finally {
      setBusy(false);
    }
  };
  if (returning) {
    return (
      <div className="flex flex-wrap items-center gap-1.5 w-full justify-end">
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason (shown to the teacher)" maxLength={500} className={`${inputClass} !py-1.5 text-xs max-w-[14rem]`} autoFocus />
        <button type="button" disabled={busy || !note.trim()} onClick={() => send(false)} className="text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-2.5 py-1.5 rounded-lg disabled:opacity-50">
          Return
        </button>
        <button type="button" onClick={() => setReturning(false)} className="text-xs font-semibold text-navy/55 px-2 py-1.5">
          Cancel
        </button>
      </div>
    );
  }
  return (
    <>
      {plan.status !== "approved" && (
        <button type="button" disabled={busy} onClick={() => send(true)} className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 px-2.5 py-1.5 rounded-lg">
          <Icon name="Check" size={14} />
          Approve
        </button>
      )}
      {plan.status !== "returned" && (
        <button type="button" disabled={busy} onClick={() => setReturning(true)} className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg">
          <Icon name="X" size={14} />
          Return
        </button>
      )}
    </>
  );
}

/** Week-by-week: uploads vs expected (every subject teacher × class), approvals, and who hasn't uploaded. */
function WeekByWeek() {
  const { data, loading, error } = useApiResource("/lesson-plans/overview");
  const [open, setOpen] = useState(null);
  const [printError, setPrintError] = useState("");
  if (error) return <Banner tone="error">{error.message}</Banner>;
  if (loading || !data) return <ContentSkeleton rows={6} />;

  const printWeek = async (w, status) => {
    setPrintError("");
    try {
      const plans = await api.get("/lesson-plans", { query: { week_from: w.week_start, week_to: w.week_start, status } });
      if (!plans.length) return setPrintError(`No ${status || ""} notes for ${w.label}.`);
      await openPdf("/lesson-plans/merged", { ids: plans.map((p) => p.id).join(",") });
    } catch (err) {
      setPrintError(err instanceof ApiError ? err.message : "Could not open the PDF.");
    }
  };

  return (
    <div>
      {printError && <Banner tone="error" className="mb-3">{printError}</Banner>}
      <Card className="p-0 overflow-hidden">
        {data.weeks.map((w) => {
          const pct = w.expected ? Math.round((w.uploaded / w.expected) * 100) : 0;
          return (
            <div key={w.week_start} className="border-b border-navy/6 last:border-0">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <button type="button" onClick={() => setOpen(open === w.week_start ? null : w.week_start)} className="flex items-center gap-2 font-semibold text-navy text-sm min-w-[13rem] text-left">
                  <Icon name="ChevronDown" size={15} className={`text-navy/40 transition-transform ${open === w.week_start ? "rotate-180" : ""}`} />
                  {w.label}
                </button>
                <div className="flex items-center gap-2 min-w-[10rem] flex-1">
                  <div className="h-2 flex-1 rounded-full bg-navy/8 overflow-hidden" title={`${w.uploaded} of ${w.expected} uploaded`}>
                    <div className="h-full rounded-full bg-[var(--viz-series-1)]" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-navy/60 tabular-nums whitespace-nowrap">
                    {w.uploaded}/{w.expected} uploaded
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">{w.approved} approved</span>
                  {w.pending > 0 && <span className="px-2 py-0.5 rounded-full bg-gold/15 text-gold-dark">{w.pending} waiting</span>}
                  {w.returned > 0 && <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700">{w.returned} returned</span>}
                  {w.missing.length > 0 && <span className="px-2 py-0.5 rounded-full bg-navy/[0.06] text-navy/60">{w.missing.length} not uploaded</span>}
                </div>
                <button
                  type="button"
                  disabled={!w.approved}
                  onClick={() => printWeek(w, "approved")}
                  className="ml-auto flex items-center gap-1 text-xs font-semibold text-navy border border-navy/15 px-3 py-1.5 rounded-full hover:border-gold disabled:opacity-40"
                >
                  <Icon name="Printer" size={13} />
                  Print approved
                </button>
              </div>
              {open === w.week_start && (
                <div className="px-4 pb-4">
                  {w.missing.length ? (
                    <>
                      <p className="text-xs font-semibold uppercase tracking-wide text-navy/45 mb-2">Not uploaded ({w.missing.length})</p>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1 text-sm">
                        {w.missing.map((m, i) => (
                          <p key={i} className="text-navy/75 truncate">
                            <span className="font-medium text-navy">{m.teacher_name || "Not assigned"}</span> · {m.class_code} {m.subject}
                          </p>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-emerald-700">Every class's plan is uploaded for this week.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
}

/** HM: approve each week's lesson plans, follow the year week by week, and print any selection as one PDF. */
export default function AdminNotesOfPresence() {
  const [tab, setTab] = useState("pending");
  // Approving stamps the HM's signature on the PDF, so it must exist first
  const signature = useApiResource("/me/signature");
  useEffect(() => {
    window.addEventListener("kghss:signature-changed", signature.reload);
    return () => window.removeEventListener("kghss:signature-changed", signature.reload);
  }, [signature.reload]);
  const hasSignature = Boolean(signature.data?.image);
  const { data: setup } = useApiResource("/lesson-plans/setup");
  const { data: classes } = useApiResource("/classes");
  const [filters, setFilters] = useState({ teacher_id: "", class_code: "", week_from: "", week_to: "", status: "" });
  const pending = useApiResource("/lesson-plans", { query: { status: "pending" }, live: "notes" });
  const all = useApiResource("/lesson-plans", {
    query: Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
    deps: [JSON.stringify(filters)],
    enabled: tab === "all",
  });
  const refresh = () => {
    pending.reload();
    if (tab === "all") all.reload();
  };
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));
  const weeks = [...(setup?.weeks || [])].reverse();

  return (
    <div>
      <PortalPageHeader
        title="Notes of Lessons"
        description="Teachers' weekly lesson plans (Monday – Friday) per class. Approve each one, follow the year week by week, and print any weeks as one PDF for the report."
      />

      {signature.data && !hasSignature && (
        <Banner tone="warning" className="mb-4">
          <strong className="font-semibold">Add your signature to approve plans.</strong> When you approve, your signature, "APPROVED" and the
          date and time are stamped on the teacher's PDF.{" "}
          <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("kghss:open-signature"))} className="font-semibold underline">
            Open My Signature
          </button>
        </Banner>
      )}

      <div className="flex gap-1 mb-5 border-b border-navy/8">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${tab === t.id ? "border-gold text-navy" : "border-transparent text-navy/45 hover:text-navy"}`}
          >
            {t.label}
            {t.id === "pending" && pending.data?.length ? ` (${pending.data.length})` : ""}
          </button>
        ))}
      </div>

      {tab === "pending" &&
        (pending.loading && !pending.data ? (
          <ContentSkeleton rows={4} />
        ) : (
          <PlanTable plans={pending.data || []} showTeacher emptyText="Nothing waiting for approval." actions={(p) => <Decide plan={p} onDone={refresh} />} />
        ))}

      {tab === "weeks" && <WeekByWeek />}

      {tab === "all" && (
        <>
          <Card className="p-4 mb-4 grid grid-cols-2 lg:grid-cols-5 gap-3">
            <select value={filters.teacher_id} onChange={set("teacher_id")} className={inputClass} aria-label="Teacher">
              <option value="">All teachers</option>
              {(setup?.teachers || []).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <select value={filters.class_code} onChange={set("class_code")} className={inputClass} aria-label="Class">
              <option value="">All classes</option>
              {(classes || []).map((c) => (
                <option key={c.code} value={c.code}>{c.code}</option>
              ))}
            </select>
            <select value={filters.week_from} onChange={set("week_from")} className={inputClass} aria-label="From week">
              <option value="">From: first week</option>
              {weeks.map((w) => (
                <option key={w.week_start} value={w.week_start}>From {w.label}</option>
              ))}
            </select>
            <select value={filters.week_to} onChange={set("week_to")} className={inputClass} aria-label="To week">
              <option value="">To: latest week</option>
              {weeks.map((w) => (
                <option key={w.week_start} value={w.week_start}>To {w.label}</option>
              ))}
            </select>
            <select value={filters.status} onChange={set("status")} className={inputClass} aria-label="Status">
              <option value="">Any status</option>
              <option value="approved">Approved</option>
              <option value="pending">Waiting for HM</option>
              <option value="returned">Returned</option>
            </select>
          </Card>
          {all.error && <Banner tone="error" className="mb-3">{all.error.message}</Banner>}
          {all.loading && !all.data ? (
            <ContentSkeleton rows={4} />
          ) : (
            <PlanTable plans={all.data || []} showTeacher emptyText="No notes match these filters." actions={(p) => <Decide plan={p} onDone={refresh} />} />
          )}
        </>
      )}
    </div>
  );
}
