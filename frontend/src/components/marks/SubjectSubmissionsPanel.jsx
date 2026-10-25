import { useRef, useState } from "react";
import Card from "../ui/Card";
import Icon from "../ui/Icon";
import Badge from "../ui/Badge";
import Banner from "../portal/Banner";
import Drawer from "../portal/Drawer";
import ConfirmDialog from "../portal/ConfirmDialog";
import { inputClass } from "../portal/FormField";
import { ContentSkeleton } from "../ui/Skeleton";
import { useApiResource } from "../../hooks/useApiResource";
import { useToast } from "../ui/Toast";
import { api, ApiError } from "../../lib/apiClient";
import { formatDate } from "../../utils/formatDate";

const markText = (m) => (!m ? "—" : m.absent ? "AB" : m.score);

/** Old → new marks, so the class teacher sees exactly what will change. */
function PreviewTable({ preview }) {
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        <Badge tone="navy">{preview.subject}</Badge>
        <Badge tone="navy">{preview.term}</Badge>
        <Badge tone="success">Marks · {preview.entered}</Badge>
        <Badge tone="sample">Changes · {preview.changed}</Badge>
        {preview.blank > 0 && <Badge tone="navy">Not in list · {preview.blank}</Badge>}
      </div>
      <div className="rounded-2xl border border-navy/8 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-navy/45 border-b border-navy/8">
              <th className="px-4 py-2.5">Student</th>
              <th className="px-3 py-2.5 text-center">Now</th>
              <th className="px-3 py-2.5 text-center">New</th>
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((r) => (
              <tr key={r.student_id} className={`border-b border-navy/6 last:border-0 ${r.changed ? "bg-gold/[0.07]" : ""}`}>
                <td className="px-4 py-2">
                  <p className="font-medium text-navy">{r.name}</p>
                  <p className="text-[11px] text-navy/40">{r.registration_no}</p>
                </td>
                <td className="px-3 py-2 text-center text-navy/55">{markText(r.old)}</td>
                <td className={`px-3 py-2 text-center font-semibold ${r.changed ? "text-navy" : "text-navy/40"}`}>
                  {r.new ? markText(r.new) : "unchanged"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-navy/45 mt-2">Only {preview.subject} changes. Other subjects are not touched.</p>
    </div>
  );
}

/** Class teacher: subject teachers' marks sent in the app, plus uploading a subject teacher's CSV file. */
export default function SubjectSubmissionsPanel({ classCode, onApplied }) {
  const toast = useToast();
  const { data: pending, loading, error, reload } = useApiResource(`/classes/${classCode}/mark-submissions`, { deps: [classCode] });
  const [review, setReview] = useState(null); // { id } | { file }
  const [details, setDetails] = useState(null);
  const [detailsError, setDetailsError] = useState("");
  const [confirm, setConfirm] = useState(null); // "accept" | "return"
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInput = useRef(null);

  const close = () => {
    setReview(null);
    setDetails(null);
    setDetailsError("");
    setConfirm(null);
    setNote("");
  };

  const openSubmission = async (id) => {
    setReview({ id });
    try {
      const res = await api.get(`/mark-submissions/${id}`);
      setDetails({ title: `${res.subject} · from ${res.teacher_name}`, preview: res.preview });
    } catch (err) {
      setDetailsError(err.message);
    }
  };

  const uploadFile = async (file) => {
    if (!file) return;
    setReview({ file });
    const form = new FormData();
    form.append("file", file);
    form.append("confirm", "false");
    try {
      const res = await api.postForm(`/classes/${classCode}/marks/import-csv`, form);
      setDetails({ title: `${res.subject} · file from ${res.teacher_name}`, preview: res.preview });
    } catch (err) {
      setDetailsError(err instanceof ApiError ? err.message : "Could not read this file.");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const act = async () => {
    setBusy(true);
    try {
      if (review.file) {
        const form = new FormData();
        form.append("file", review.file);
        form.append("confirm", "true");
        const res = await api.postForm(`/classes/${classCode}/marks/import-csv`, form);
        toast.success(`${res.subject} marks saved for ${res.saved_marks} students`);
      } else if (confirm === "accept") {
        const res = await api.post(`/mark-submissions/${review.id}/accept`);
        toast.success(`${res.subject} marks accepted for ${res.saved_marks} students`);
      } else {
        await api.post(`/mark-submissions/${review.id}/return`, { note: note.trim() });
        toast.success("Sent back to the subject teacher");
      }
      close();
      reload();
      onApplied?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update the marks.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5 mb-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="font-heading font-bold text-navy text-sm">Subject teacher marks</h2>
          <p className="text-xs text-navy/50 mt-0.5">Marks sent by subject teachers, or a CSV file they shared with you. Only that subject is updated.</p>
        </div>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="flex items-center gap-1.5 text-sm font-semibold text-navy border border-navy/15 px-4 py-2.5 rounded-full hover:bg-navy/5"
        >
          <Icon name="Upload" size={15} /> Upload CSV
        </button>
        <input ref={fileInput} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => uploadFile(e.target.files?.[0])} />
      </div>

      {error && <Banner tone="error">{error.message}</Banner>}
      {loading && <ContentSkeleton rows={2} />}
      {!loading && (pending || []).length === 0 && <p className="text-sm text-navy/45">Nothing waiting right now.</p>}
      <div className="flex flex-col divide-y divide-navy/6">
        {(pending || []).map((s) => (
          <div key={s.id} className="flex flex-wrap items-center gap-3 py-3">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-gold/15 text-gold-dark shrink-0">
              <Icon name="FileText" size={17} />
            </span>
            <div className="flex-1 min-w-[10rem]">
              <p className="text-sm font-semibold text-navy">
                {s.subject} · {s.term}
              </p>
              <p className="text-xs text-navy/50">
                {s.teacher_name} · {s.entered} students · {formatDate(s.created_at)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => openSubmission(s.id)}
              className="bg-gold text-navy-dark font-semibold text-xs px-4 py-2 rounded-full hover:bg-gold-light transition-colors"
            >
              Review
            </button>
          </div>
        ))}
      </div>

      <Drawer open={Boolean(review)} onClose={close} title={details?.title || "Checking…"} width="max-w-2xl">
        {detailsError && <Banner tone="error">{detailsError}</Banner>}
        {!details && !detailsError && <ContentSkeleton rows={4} />}
        {details && (
          <>
            <PreviewTable preview={details.preview} />
            <div className="flex flex-wrap gap-3 mt-5">
              {!review?.file && (
                <button
                  type="button"
                  onClick={() => setConfirm("return")}
                  className="flex-1 min-w-[9rem] py-3 rounded-full border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  Send back
                </button>
              )}
              <button
                type="button"
                onClick={() => setConfirm("accept")}
                className="flex-1 min-w-[9rem] bg-gold text-navy-dark font-semibold text-sm py-3 rounded-full hover:bg-gold-light transition-colors"
              >
                {review?.file ? "Save these marks" : "Accept"}
              </button>
            </div>
          </>
        )}
      </Drawer>

      <ConfirmDialog
        open={confirm === "accept"}
        title={`Save ${details?.preview.subject} marks?`}
        message={`${details?.preview.changed} student(s) will get new ${details?.preview.subject} marks for ${details?.preview.term}. Other subjects are not changed.`}
        confirmLabel="Yes, save"
        busy={busy}
        onConfirm={act}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "return"}
        danger
        title="Send back to the subject teacher?"
        message="They will see your note and can send the marks again."
        confirmLabel="Yes, send back"
        busy={busy}
        confirmDisabled={note.trim().length < 2}
        onConfirm={act}
        onCancel={() => setConfirm(null)}
      >
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="What should they fix?" aria-label="Note" className={inputClass} />
      </ConfirmDialog>
    </Card>
  );
}
