import { useState } from "react";
import Card from "../ui/Card";
import Icon from "../ui/Icon";
import Badge from "../ui/Badge";
import Banner from "../portal/Banner";
import { inputClass } from "../portal/FormField";
import { useApiResource } from "../../hooks/useApiResource";
import { api, ApiError } from "../../lib/apiClient";
import { formatDate } from "../../utils/formatDate";
import { LEAVE_STATUS_TONE, LEAVE_TYPE_LABELS } from "./leaveConstants";

const filters = [
  { id: "pending", label: "Pending" },
  { id: "all", label: "All" },
];

// Approve/reject list: class teacher sees their class's student requests, admin sees teacher requests.
export default function LeaveReviewPanel({ showClass = false, emptyText = "No leave requests." }) {
  const { data: requests, loading, error, reload } = useApiResource("/leave-requests", { query: { scope: "review" } });
  const [filter, setFilter] = useState("pending");
  const [busyId, setBusyId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const [actionError, setActionError] = useState("");

  const decide = async (id, approve, note) => {
    setBusyId(id);
    setActionError("");
    try {
      await api.patch(`/leave-requests/${id}`, { approve, note: note || undefined });
      setRejectingId(null);
      setRejectNote("");
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not update this request. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const rows = (requests || []).filter((r) => filter === "all" || r.status === "pending");
  const pendingCount = (requests || []).filter((r) => r.status === "pending").length;

  return (
    <div>
      <div className="flex gap-1 mb-4">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              filter === f.id ? "bg-navy text-white" : "text-navy/60 hover:bg-navy/6"
            }`}
          >
            {f.label}
            {f.id === "pending" && pendingCount > 0 && ` (${pendingCount})`}
          </button>
        ))}
      </div>

      {error && <Banner tone="error" className="mb-4">{error.message}</Banner>}
      {actionError && <Banner tone="error" className="mb-4">{actionError}</Banner>}

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-navy/45 border-b border-navy/8">
                <th className="px-4 py-3">Applicant</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3 text-center">Days</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-navy/40">{emptyText}</td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-navy/6 last:border-0 align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium text-navy whitespace-nowrap">{r.applicant_name}</p>
                    <p className="text-xs text-navy/45 whitespace-nowrap">
                      {r.applicant_username}
                      {showClass && r.class_code && ` · ${r.class_code}`}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-navy/70 whitespace-nowrap">{LEAVE_TYPE_LABELS[r.leave_type] || r.leave_type}</td>
                  <td className="px-4 py-3 text-navy/70 whitespace-nowrap">
                    {formatDate(r.from_date)}
                    {r.to_date !== r.from_date && <> – {formatDate(r.to_date)}</>}
                  </td>
                  <td className="px-4 py-3 text-center text-navy/70">{r.days}</td>
                  <td className="px-4 py-3 text-navy/60 min-w-[12rem]">
                    {r.reason}
                    {r.decision_note && <p className="text-xs italic text-navy/50 mt-0.5">Note: {r.decision_note}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={LEAVE_STATUS_TONE[r.status] || "navy"}>{r.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {r.status === "pending" && rejectingId !== r.id && (
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
                          onClick={() => {
                            setRejectingId(r.id);
                            setRejectNote("");
                          }}
                          className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg"
                        >
                          <Icon name="X" size={14} />
                          Reject
                        </button>
                      </div>
                    )}
                    {rejectingId === r.id && (
                      <div className="flex flex-col items-end gap-2 min-w-[14rem]">
                        <input
                          autoFocus
                          placeholder="Reason (optional)"
                          value={rejectNote}
                          onChange={(e) => setRejectNote(e.target.value)}
                          className={inputClass + " text-xs py-1.5"}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setRejectingId(null)}
                            className="text-xs font-semibold text-navy/60 hover:bg-navy/6 px-2.5 py-1.5 rounded-lg"
                          >
                            Back
                          </button>
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => decide(r.id, false, rejectNote)}
                            className="text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-2.5 py-1.5 rounded-lg disabled:opacity-60"
                          >
                            Confirm Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
