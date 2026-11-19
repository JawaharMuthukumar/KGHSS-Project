import { useState } from "react";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Badge from "../../components/ui/Badge";
import Banner from "../../components/portal/Banner";
import FormField, { inputClass } from "../../components/portal/FormField";
import { useApiResource } from "../../hooks/useApiResource";
import { api, ApiError } from "../../lib/apiClient";
import { formatDate } from "../../utils/formatDate";
import { ContentSkeleton } from "../../components/ui/Skeleton";
import { certStatus, studentCertMessage } from "../../constants/certificates";

const certTypes = [
  { value: "attendance", label: "Attendance Certificate" },
  { value: "bonafide", label: "Bonafide Certificate" },
  { value: "conduct", label: "Conduct Certificate" },
];

export default function MyCertificates() {
  const { data: requests, loading, error, reload } = useApiResource("/certificates/requests", { live: "certificates" });
  const [form, setForm] = useState({ certificate_type: "bonafide", note: "" });
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitting(true);
    try {
      await api.post("/certificates/requests", { certificate_type: form.certificate_type, note: form.note || undefined });
      setForm({ certificate_type: "bonafide", note: "" });
      reload();
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PortalPageHeader title="Certificates" description="Request a certificate. Your class teacher approves it, then the Head Master prints it — collect it from the Head Master's office." />

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="p-5 lg:col-span-1">
          <h2 className="font-heading font-bold text-navy text-sm mb-4">Request a Certificate</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <FormField label="Certificate Type" htmlFor="certificate_type" required>
              <select
                id="certificate_type"
                value={form.certificate_type}
                onChange={(e) => setForm((f) => ({ ...f, certificate_type: e.target.value }))}
                className={inputClass}
              >
                {certTypes.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Note" htmlFor="note" hint="Optional">
              <textarea
                id="note"
                rows={3}
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                className={inputClass}
              />
            </FormField>
            {submitError && <Banner tone="error">{submitError}</Banner>}
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
          <h2 className="font-heading font-bold text-navy text-sm mb-4">My Requests</h2>
          {error && <Banner tone="error">{error.message}</Banner>}
          {loading && <ContentSkeleton rows={3} />}
          {!loading && (requests || []).length === 0 && <p className="text-sm text-navy/50">No requests yet.</p>}
          {!loading && <div className="flex flex-col gap-3">
            {(requests || []).map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-3 pb-3 border-b border-navy/6 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy capitalize">{r.certificate_type}</p>
                  <p className="text-xs text-navy/45">Requested {formatDate(r.created_at)}</p>
                  {r.note && <p className="text-xs text-navy/50 mt-0.5">{r.note}</p>}
                  <p className={`flex items-start gap-1.5 text-xs font-medium mt-1.5 ${r.status === "rejected" ? "text-red-600" : r.status === "ready" ? "text-emerald-700" : "text-navy/70"}`}>
                    <Icon name={r.status === "ready" ? "Check" : r.status === "rejected" ? "X" : "Clock"} size={14} className="shrink-0 mt-px" />
                    {studentCertMessage(r)}
                  </p>
                  {r.status === "rejected" && r.decision_note && <p className="text-xs text-navy/50 italic mt-0.5">“{r.decision_note}”</p>}
                </div>
                <Badge tone={certStatus(r.status).tone} className="shrink-0">{certStatus(r.status).label}</Badge>
              </div>
            ))}
          </div>}
        </Card>
      </div>
    </div>
  );
}
