import { useState } from "react";
import { Link } from "react-router-dom";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Banner from "../../components/portal/Banner";
import FormField, { inputClass } from "../../components/portal/FormField";
import { ContentSkeleton } from "../../components/ui/Skeleton";
import { useApiResource } from "../../hooks/useApiResource";
import { useToast } from "../../components/ui/Toast";
import { api, ApiError } from "../../lib/apiClient";

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;

function Step({ n, title, done, children }) {
  return (
    <div className="flex gap-3">
      <span
        className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${
          done ? "bg-emerald-50 text-emerald-700" : "bg-navy/[0.07] text-navy/70"
        }`}
      >
        {done ? <Icon name="Check" size={14} /> : n}
      </span>
      <div className="flex-1 min-w-0 pb-5">
        <p className="font-semibold text-navy text-sm">{title}</p>
        <div className="mt-1 text-sm text-navy/65">{children}</div>
      </div>
    </div>
  );
}

/** HM: the running academic year's dates, and closing it to start the next year. */
export default function AcademicYear() {
  const toast = useToast();
  const { data, loading, error, reload } = useApiResource("/academic-year/close-check");
  const [dates, setDates] = useState(null); // { start_month, end_month } while editing
  const [next, setNext] = useState(null);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [actionError, setActionError] = useState("");

  if (error) return <Banner tone="error">{error.message}</Banner>;
  if (loading || !data) return <ContentSkeleton rows={6} />;

  const y = data.year;
  const nextDates = next || { start: data.next_start_month, end: data.next_end_month };

  const saveDates = async () => {
    setBusy(true);
    setActionError("");
    try {
      await api.put("/academic-year", dates);
      toast.success("Academic year dates saved.");
      setDates(null);
      reload();
      window.dispatchEvent(new CustomEvent("kghss:academic-year-changed"));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not save the dates.");
    } finally {
      setBusy(false);
    }
  };

  const downloadBackup = async () => {
    setBusy(true);
    setActionError("");
    try {
      const blob = await api.get("/academic-year/notes-archive");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Notes of Presence ${y.label}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setDownloaded(true);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not download the backup.");
    } finally {
      setBusy(false);
    }
  };

  const startNext = async () => {
    setBusy(true);
    setActionError("");
    try {
      const res = await api.post("/academic-year/start-next", {
        confirm_label: confirm.trim(),
        next_start_month: nextDates.start,
        next_end_month: nextDates.end,
      });
      toast.success(
        `${res.year.label} started · ${res.promoted} promoted, ${res.not_promoted} repeating, ${res.left} TC, ${res.passed_out} passed out · ${res.notes_removed} Notes of Presence removed`
      );
      setConfirm("");
      setNext(null);
      setDownloaded(false);
      reload();
      window.dispatchEvent(new CustomEvent("kghss:academic-year-changed"));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not start the new year.");
    } finally {
      setBusy(false);
    }
  };

  const notes = data.notes;
  const backupDone = downloaded || notes.count === 0;

  return (
    <div>
      <PortalPageHeader title="Academic Year" description="Set this year's start and end month, and start the next academic year when this one is over." />
      {actionError && <Banner tone="error" className="mb-4">{actionError}</Banner>}

      <Card className="p-5 mb-5">
        <div className="flex flex-wrap items-start gap-4">
          <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gold/15 text-gold-dark shrink-0">
            <Icon name="CalendarRange" size={22} />
          </span>
          <div className="flex-1 min-w-[14rem]">
            <p className="text-xs font-semibold uppercase tracking-wide text-navy/45">Current academic year</p>
            <p className="font-heading font-bold text-navy text-2xl">{y.display}</p>
            <p className="text-sm text-navy/60">{y.range}</p>
            <p className="text-xs text-navy/45 mt-1">Shown to the HM, teachers and students. Notes of Presence weeks run within these months.</p>
          </div>
          {!dates && (
            <button
              type="button"
              onClick={() => setDates({ start_month: y.start_month, end_month: y.end_month })}
              className="flex items-center gap-1.5 text-sm font-semibold text-navy border border-navy/15 px-4 py-2 rounded-full hover:border-gold"
            >
              <Icon name="Pencil" size={14} />
              Edit months
            </button>
          )}
        </div>
        {dates && (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <FormField label="Starts" htmlFor="ay-start">
              <input id="ay-start" type="month" value={dates.start_month} onChange={(e) => setDates((d) => ({ ...d, start_month: e.target.value }))} className={`${inputClass} w-44`} />
            </FormField>
            <FormField label="Ends" htmlFor="ay-end">
              <input id="ay-end" type="month" value={dates.end_month} onChange={(e) => setDates((d) => ({ ...d, end_month: e.target.value }))} className={`${inputClass} w-44`} />
            </FormField>
            <button type="button" disabled={busy} onClick={saveDates} className="bg-gold text-navy-dark font-semibold text-sm px-5 py-2.5 rounded-full hover:bg-gold-light disabled:opacity-60">
              Save
            </button>
            <button type="button" onClick={() => setDates(null)} className="text-sm font-semibold text-navy/55 px-3 py-2.5">
              Cancel
            </button>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-heading font-bold text-navy">Close {y.display} and start {data.next_label.slice(0, 4)}–{data.next_label.slice(-2)}</h2>
        <p className="text-sm text-navy/60 mt-1 mb-5">Do this once, after the final exam and promotions. It cannot be undone.</p>

        <Step n={1} title="Promotion lists approved" done={data.promotions_ready}>
          {data.promotions_ready ? (
            "Every class's promotion list is approved."
          ) : (
            <>
              Waiting for: {data.promotion_blockers.join(", ")}.{" "}
              <Link to="/admin/promotions" className="font-semibold text-gold-dark hover:underline">
                Open Promotions
              </Link>
            </>
          )}
        </Step>

        <Step n={2} title="Back up this year's Notes of Presence" done={backupDone}>
          {notes.count === 0 ? (
            "No Notes of Presence uploaded this year — nothing to back up."
          ) : (
            <>
              <p>
                {notes.count} lesson plan PDF{notes.count === 1 ? "" : "s"} ({mb(notes.bytes)}) will be <strong>deleted</strong> when the new year starts.
                Download the ZIP (a folder for each week) and keep it safe first.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={downloadBackup}
                className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-navy border border-navy/15 px-4 py-2 rounded-full hover:border-gold disabled:opacity-60"
              >
                <Icon name="Download" size={14} />
                {downloaded ? "Downloaded — download again" : `Download ZIP backup (${mb(notes.bytes)})`}
              </button>
            </>
          )}
        </Step>

        <Step n={3} title={`Months of ${data.next_label}`} done={false}>
          <div className="flex flex-wrap gap-3 mt-1">
            <FormField label="Starts" htmlFor="ny-start">
              <input id="ny-start" type="month" value={nextDates.start} onChange={(e) => setNext({ ...nextDates, start: e.target.value })} className={`${inputClass} w-44`} />
            </FormField>
            <FormField label="Ends" htmlFor="ny-end">
              <input id="ny-end" type="month" value={nextDates.end} onChange={(e) => setNext({ ...nextDates, end: e.target.value })} className={`${inputClass} w-44`} />
            </FormField>
          </div>
        </Step>

        <Step n={4} title="Start the new year" done={false}>
          <p>
            Moves every class to {data.next_label} using the approved promotion lists, removes this year's Notes of Presence PDFs, unpublishes
            last year's class notices and makes {data.next_label} the current year. The new year starts with no class teachers, subject teachers or
            timetables — assign them afterwards.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={`Type ${y.label} to confirm`}
              aria-label={`Type ${y.label} to confirm`}
              className={`${inputClass} w-56`}
            />
            <button
              type="button"
              disabled={busy || !data.promotions_ready || !backupDone || confirm.trim() !== y.label}
              onClick={startNext}
              className="bg-red-600 text-white font-semibold text-sm px-5 py-2.5 rounded-full hover:bg-red-700 disabled:opacity-50"
            >
              {busy ? "Working…" : `Start ${data.next_label}`}
            </button>
          </div>
          {!backupDone && <p className="text-xs text-amber-700 mt-2">Download the Notes of Presence backup first.</p>}
        </Step>
      </Card>
    </div>
  );
}
