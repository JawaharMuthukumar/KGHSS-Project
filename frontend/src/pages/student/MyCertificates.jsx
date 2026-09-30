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

const statusTone = { pending: "navy", approved: "success", rejected: "danger" };
const certTypes = [
  { value: "attendance", label: "Attendance Certificate" },
  { value: "bonafide", label: "Bonafide Certificate" },
  { value: "conduct", label: "Conduct Certificate" },
];

export default function MyCertificates() {
  const { data: requests, loading, error, reload } = useApiResource("/certificates/requests");
  const [form, setForm] = useState({ certificate_type: "bonafide", note: "" });
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

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

  const handleDownload = async (id) => {
    setDownloadingId(id);
    try {
      const blob = await api.get(`/certificates/requests/${id}/download`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificate-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Could not download the certificate.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div>
      <PortalPageHeader title="Certificates" description="Request and download certificates." />

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
          {!loading && (requests || []).length === 0 && <p className="text-sm text-navy/50">No requests yet.</p>}
          <div className="flex flex-col gap-3">
            {(requests || []).map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 pb-3 border-b border-navy/6 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy capitalize">{r.certificate_type}</p>
                  <p className="text-xs text-navy/45">{formatDate(r.created_at)}</p>
                  {r.note && <p className="text-xs text-navy/50 mt-0.5">{r.note}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge tone={statusTone[r.status] || "navy"}>{r.status}</Badge>
                  {r.status === "approved" && (
                    <button
                      type="button"
                      disabled={downloadingId === r.id}
                      onClick={() => handleDownload(r.id)}
                      className="flex items-center gap-1 text-xs font-semibold text-navy hover:bg-navy/6 px-2.5 py-1.5 rounded-lg"
                    >
                      <Icon name="Download" size={14} />
                      Download
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
