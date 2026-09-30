import { useState } from "react";
import PortalPageHeader from "../portal/PortalPageHeader";
import Card from "../ui/Card";
import Icon from "../ui/Icon";
import Badge from "../ui/Badge";
import Banner from "../portal/Banner";
import { useApiResource } from "../../hooks/useApiResource";
import { api, ApiError } from "../../lib/apiClient";
import { formatDate } from "../../utils/formatDate";

const statusTone = { pending: "navy", approved: "success", rejected: "danger" };

export default function CertificateRequestsPanel({ description }) {
  const { data: requests, loading, error, reload } = useApiResource("/certificates/requests");
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");

  const decide = async (id, approve) => {
    setBusyId(id);
    setActionError("");
    try {
      await api.patch(`/certificates/requests/${id}`, { approve });
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not update this request. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PortalPageHeader title="Certificate Requests" description={description} />

      {error && <Banner tone="error" className="mb-4">{error.message}</Banner>}
      {actionError && <Banner tone="error" className="mb-4">{actionError}</Banner>}

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-navy/45 border-b border-navy/8">
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Note</th>
              <th className="px-4 py-3">Requested</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && (requests || []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-navy/40">No certificate requests.</td>
              </tr>
            )}
            {(requests || []).map((r) => (
              <tr key={r.id} className="border-b border-navy/6 last:border-0">
                <td className="px-4 py-3 font-medium text-navy capitalize">{r.certificate_type}</td>
                <td className="px-4 py-3 text-navy/60">{r.note || "—"}</td>
                <td className="px-4 py-3 text-navy/60">{formatDate(r.created_at)}</td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone[r.status] || "navy"}>{r.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  {r.status === "pending" && (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => decide(r.id, true)}
                        className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 px-2.5 py-1.5 rounded-lg"
                      >
                        <Icon name="Check" size={14} />
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => decide(r.id, false)}
                        className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg"
                      >
                        <Icon name="X" size={14} />
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
