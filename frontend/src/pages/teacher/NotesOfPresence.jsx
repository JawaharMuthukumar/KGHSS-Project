import { useEffect, useMemo, useRef, useState } from "react";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Banner from "../../components/portal/Banner";
import EmptyState from "../../components/portal/EmptyState";
import FormField, { inputClass } from "../../components/portal/FormField";
import PlanTable from "../../components/notes/PlanTable";
import { PLAN_STATUS } from "../../constants/notes";
import { ContentSkeleton } from "../../components/ui/Skeleton";
import { useApiResource } from "../../hooks/useApiResource";
import { useToast } from "../../components/ui/Toast";
import { api, ApiError } from "../../lib/apiClient";

const MAX_MB = 3;
const slotKey = (s) => `${s.class_code}|${s.subject}`;

/** Teacher: upload each week's lesson plan PDF per class + subject for the HM to approve; see and print past weeks. */
export default function NotesOfPresence() {
  const toast = useToast();
  const { data: setup, loading: loadingSetup, error: setupError } = useApiResource("/lesson-plans/setup");
  const { data: plans, loading, reload } = useApiResource("/lesson-plans", { live: "notes" });
  const [week, setWeek] = useState("");
  const [picked, setPicked] = useState(null); // slot keys ticked for this upload (null = the default one)
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const browse = useRef(null);

  // Saturday / Sunday: the server makes the coming week the default (teachers prepare it at the weekend)
  const weekend = [0, 6].includes(new Date().getDay());
  const weeks = useMemo(() => [...(setup?.weeks || [])].reverse(), [setup]); // newest first
  const weekValue = week || setup?.current_week || "";
  // This week's plan per class + subject, for the chip status and to block approved ones
  const planFor = (key) => (plans || []).find((p) => p.week_start === weekValue && slotKey(p) === key);
  // Default: the first class not yet uploaded for the chosen week; the teacher ticks any others (e.g. the other medium)
  const defaultSlot = (setup?.slots || []).find((s) => !planFor(slotKey(s))) || setup?.slots?.[0];
  const chosen = (picked ?? (defaultSlot ? [slotKey(defaultSlot)] : [])).filter((k) => planFor(k)?.status !== "approved");
  const replacing = chosen.filter((k) => planFor(k));
  const toggleSlot = (key) => setPicked(chosen.includes(key) ? chosen.filter((k) => k !== key) : [...chosen, key]);

  const takeFile = (f) => {
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) return setError("Choose a PDF file.");
    if (f.size > MAX_MB * 1024 * 1024) return setError(`The PDF must be ${MAX_MB} MB or smaller.`);
    setError("");
    setFile(f);
  };

  // Ctrl+V a copied PDF file anywhere on the page
  useEffect(() => {
    const onPaste = (e) => {
      const f = [...(e.clipboardData?.files || [])][0];
      if (f) {
        e.preventDefault();
        takeFile(f);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return setError("Add the lesson plan PDF (browse, drag & drop, or paste).");
    if (topic.trim().length < 2) return setError("Enter the topic / unit for the week.");
    if (!chosen.length) return setError("Tick at least one class.");
    const form = new FormData();
    form.append("slots", chosen.join(","));
    form.append("week_start", weekValue);
    form.append("topic", topic.trim());
    form.append("file", file);
    setSaving(true);
    setError("");
    try {
      await api.postForm("/lesson-plans", form);
      toast.success(`Plan uploaded for ${chosen.map((k) => k.replace("|", " ")).join(", ")}. The HM will review it.`);
      setFile(null);
      setTopic("");
      setPicked(null);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p) => {
    try {
      await api.delete(`/lesson-plans/${p.id}`);
      reload();
    } catch (err) {
      toast.error?.(err instanceof ApiError ? err.message : "Could not delete.");
    }
  };

  if (loadingSetup) return <ContentSkeleton rows={5} />;
  if (setupError) return <Banner tone="error">{setupError.message}</Banner>;

  const header = (
    <PortalPageHeader
      title="Notes of Lessons"
      description="Upload your weekly lesson plan (Monday – Friday) for each class you teach. The Headmaster approves it, then you complete that portion with your students."
    />
  );
  if (!setup.slots?.length) {
    return (
      <div>
        {header}
        <EmptyState icon="BookOpen" title="No subjects assigned" description="You have no subject–class assignments this year. Ask the Headmaster to assign your subjects first." />
      </div>
    );
  }

  const thisWeek = setup.slots.map((s) => ({ ...s, plan: (plans || []).find((p) => p.week_start === setup.current_week && slotKey(p) === slotKey(s)) }));

  return (
    <div>
      {header}

      <div className="grid lg:grid-cols-5 gap-5 mb-5">
        <Card className="p-5 lg:col-span-3">
          <h2 className="font-heading font-bold text-navy text-sm mb-4">Upload a week's lesson plan</h2>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <FormField label="Week" htmlFor="np-week" required>
              <select id="np-week" value={weekValue} onChange={(e) => setWeek(e.target.value)} className={inputClass}>
                {weeks.map((w) => (
                  <option key={w.week_start} value={w.week_start}>
                    {w.label}
                    {w.week_start === setup.current_week ? (weekend ? " (next week)" : " (this week)") : ""}
                  </option>
                ))}
              </select>
            </FormField>
            {/* Tick every class this plan is for (e.g. both mediums of the same subject) — one upload goes to all of them */}
            <FormField label="Classes · tick every class this plan is for" htmlFor="np-slots" required>
              <div id="np-slots" className="flex flex-wrap gap-2">
                {setup.slots.map((s) => {
                  const key = slotKey(s);
                  const plan = planFor(key);
                  const approved = plan?.status === "approved";
                  const on = chosen.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={approved}
                      onClick={() => toggleSlot(key)}
                      title={approved ? "Already approved by the HM for this week" : plan ? `${PLAN_STATUS[plan.status].label} — uploading replaces it` : "Not uploaded yet"}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors disabled:cursor-not-allowed ${
                        on ? "bg-navy text-white border-navy" : approved ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-white text-navy border-navy/15 hover:border-gold"
                      }`}
                    >
                      <Icon name={on ? "CircleCheck" : approved ? "Check" : "Circle"} size={14} />
                      {s.class_code} · {s.subject}
                      {plan && !approved && <span className={`text-[10px] font-semibold ${on ? "text-gold-light" : "text-gold-dark"}`}>{PLAN_STATUS[plan.status].label}</span>}
                    </button>
                  );
                })}
              </div>
            </FormField>
            <FormField label="Topic / Unit" htmlFor="np-topic" required>
              <input id="np-topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Unit 21: Nutrition and Health" maxLength={200} className={inputClass} />
            </FormField>

            <div
              role="button"
              tabIndex={0}
              onClick={() => browse.current?.click()}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && browse.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                takeFile(e.dataTransfer.files?.[0]);
              }}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center cursor-pointer transition-colors ${
                dragging ? "border-gold bg-gold/10" : "border-navy/20 hover:border-gold"
              }`}
            >
              <Icon name="Upload" size={22} className="text-navy/45" />
              {file ? (
                <p className="text-sm font-semibold text-navy">
                  {file.name} <span className="font-normal text-navy/50">· {Math.max(1, Math.round(file.size / 1024))} KB</span>
                </p>
              ) : (
                <p className="text-sm font-semibold text-navy">Drop the PDF here, click to browse, or press Ctrl+V to paste it</p>
              )}
              <p className="text-xs text-navy/50">PDF only, up to {MAX_MB} MB</p>
              <input ref={browse} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => { takeFile(e.target.files?.[0]); e.target.value = ""; }} />
            </div>

            {replacing.length > 0 && (
              <Banner tone="info">
                Already uploaded for this week: {replacing.map((k) => k.replace("|", " ")).join(", ")}. Uploading again replaces it.
              </Banner>
            )}
            {error && <Banner tone="error">{error}</Banner>}
            <button
              type="submit"
              disabled={saving || !chosen.length}
              className="bg-gold text-navy-dark font-semibold text-sm py-3 rounded-full hover:bg-gold-light transition-colors disabled:opacity-60"
            >
              {saving ? "Uploading…" : chosen.length > 1 ? `Upload to ${chosen.length} classes and send to HM` : "Upload and send to HM"}
            </button>
          </form>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h2 className="font-heading font-bold text-navy text-sm">{weekend ? "Next week" : "This week"}</h2>
          <p className="text-xs text-navy/50 mb-3">{weeks.find((w) => w.week_start === setup.current_week)?.label}</p>
          <ul className="flex flex-col gap-2">
            {thisWeek.map((s) => (
              <li key={slotKey(s)} className="flex items-center gap-2 text-sm">
                <span className="font-medium text-navy">{s.class_code} · {s.subject}</span>
                <span
                  className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full ${
                    !s.plan ? "bg-red-50 text-red-700" : s.plan.status === "approved" ? "bg-emerald-50 text-emerald-700" : s.plan.status === "returned" ? "bg-red-50 text-red-700" : "bg-gold/15 text-gold-dark"
                  }`}
                >
                  {s.plan ? PLAN_STATUS[s.plan.status].label : "Not uploaded"}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <h2 className="font-heading font-bold text-navy text-sm mb-2">My Notes of Lessons · {setup.academic_year}</h2>
      {loading && !plans ? (
        <ContentSkeleton rows={3} />
      ) : (
        <PlanTable
          plans={plans || []}
          emptyText="Nothing uploaded yet this year."
          actions={(p) =>
            p.status !== "approved" && (
              <button type="button" onClick={() => remove(p)} className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg">
                <Icon name="Trash2" size={14} />
                Delete
              </button>
            )
          }
        />
      )}
    </div>
  );
}
