import { useState } from "react";
import Card from "../ui/Card";
import Icon from "../ui/Icon";
import Badge from "../ui/Badge";
import Banner from "../portal/Banner";
import FormField, { inputClass } from "../portal/FormField";
import { useApiResource } from "../../hooks/useApiResource";
import { api, ApiError } from "../../lib/apiClient";
import { formatDate } from "../../utils/formatDate";
import { LEAVE_STATUS_TONE, LEAVE_TYPE_LABELS, countWorkingDays } from "./leaveConstants";

// Apply-for-leave form plus the applicant's own request history. Used by students and teachers.
export default function MyLeavePanel({ types, approverLabel }) {
  const { data: requests, loading, error, reload } = useApiResource("/leave-requests", { query: { scope: "mine" } });
  const emptyForm = { leave_type: types[0].value, from_date: "", to_date: "", reason: "" };
  const [form, setForm] = useState(emptyForm);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const days = countWorkingDays(form.from_date, form.to_date);
  const selectedType = types.find((t) => t.value === form.leave_type);
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitted("");
    setSubmitting(true);
    try {
      await api.post("/leave-requests", form);
      setForm(emptyForm);
      setSubmitted(`Leave request sent to ${approverLabel}.`);
      reload();
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id) => {
    setCancellingId(id);
    setSubmitError("");
    try {
      await api.delete(`/leave-requests/${id}`);
      reload();
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Could not cancel this request.");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-5">
      <Card className="p-5 lg:col-span-1">
        <h2 className="font-heading font-bold text-navy text-sm mb-4">Apply for Leave</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField label="Leave Type" htmlFor="leave_type" required hint={selectedType?.hint}>
            <select id="leave_type" value={form.leave_type} onChange={set("leave_type")} className={inputClass}>
              {types.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="From" htmlFor="from_date" required>
              <input id="from_date" type="date" required value={form.from_date} onChange={set("from_date")} className={inputClass} />
            </FormField>
            <FormField label="To" htmlFor="to_date" required>
              <input
                id="to_date"
                type="date"
                required
                min={form.from_date || undefined}
                value={form.to_date}
                onChange={set("to_date")}
                className={inputClass}
              />
            </FormField>
          </div>
          {form.from_date && form.to_date && (
            <p className="text-xs text-navy/55 -mt-2">
              {days} working day{days === 1 ? "" : "s"} (Saturdays and Sundays are not counted)
            </p>
          )}
          <FormField label="Reason" htmlFor="reason" required>
            <textarea id="reason" rows={3} required minLength={3} value={form.reason} onChange={set("reason")} className={inputClass} />
          </FormField>
          {submitError && <Banner tone="error">{submitError}</Banner>}
          {submitted && <Banner tone="success">{submitted}</Banner>}
          <button
            type="submit"
            disabled={submitting}
            className="bg-gold text-navy-dark font-semibold text-sm py-2.5 rounded-full hover:bg-gold-light transition-colors disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit Request"}
          </button>
        </form>
      </Card>

      <Card className="p-5 lg:col-span-2">
        <h2 className="font-heading font-bold text-navy text-sm mb-4">My Leave Requests</h2>
        {error && <Banner tone="error">{error.message}</Banner>}
        {!loading && (requests || []).length === 0 && <p className="text-sm text-navy/50">No leave requests yet.</p>}
        <div className="flex flex-col gap-3">
          {(requests || []).map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-3 pb-3 border-b border-navy/6 last:border-0">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-navy">
                  {LEAVE_TYPE_LABELS[r.leave_type] || r.leave_type}
                  <span className="font-normal text-navy/50"> · {r.days} day{r.days === 1 ? "" : "s"}</span>
                </p>
                <p className="text-xs text-navy/55">
                  {formatDate(r.from_date)}
                  {r.to_date !== r.from_date && ` – ${formatDate(r.to_date)}`}
                </p>
                <p className="text-xs text-navy/50 mt-0.5">{r.reason}</p>
                {r.decision_note && <p className="text-xs text-navy/60 mt-0.5 italic">Note: {r.decision_note}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge tone={LEAVE_STATUS_TONE[r.status] || "navy"}>{r.status}</Badge>
                {r.status === "pending" && (
                  <button
                    type="button"
                    disabled={cancellingId === r.id}
                    onClick={() => handleCancel(r.id)}
                    className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg"
                  >
                    <Icon name="X" size={14} />
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
