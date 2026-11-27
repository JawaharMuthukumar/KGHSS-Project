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
import { TableSkeleton } from "../ui/Skeleton";

const filters = [
  { id: "pending", label: "Pending" },
  { id: "all", label: "All" },
];

/**
 * Approve/reject list: class teacher sees their class's student requests, admin sees teacher requests.
 * `canForward` (class teacher): a student's request can also be forwarded to the HM with remarks; the HM's reply
 * comes back here and the class teacher still approves or rejects.
 */
export default function LeaveReviewPanel({ showClass = false, canForward = false, emptyText = "No leave requests." }) {
  const { data: requests, loading, error, reload } = useApiResource("/leave-requests", { query: { scope: "review" }, live: "leave" });
  const [filter, setFilter] = useState("pending");
  const [busyId, setBusyId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const [actionError, setActionError] = useState("");
  const [forwardingId, setForwardingId] = useState(null);
  const [remark, setRemark] = useState("");

  const forward = async (id) => {
    setBusyId(id);
    setActionError("");
    try {
      await api.post(`/leave-requests/${id}/forward`, { remark: remark.trim() });
      setForwardingId(null);
      setRemark("");
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not forward this request. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

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

  // HM replies waiting on the class teacher come first
  const rows = (requests || [])
    .filter((r) => filter === "all" || r.status === "pending")
    .sort((a, b) => (b.status === "pending" && b.forward_state === "hm_replied") - (a.status === "pending" && a.forward_state === "hm_replied"));
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
          <table className="table-cards w-full text-sm">
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
              {loading && <tr><td colSpan={7} className="p-0"><TableSkeleton rows={5} columns={6} /></td></tr>}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-navy/40">{emptyText}</td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-navy/6 last:border-0 align-top">
                  <td className="tc-primary px-4 py-3">
                    <p className="font-medium text-navy whitespace-nowrap">{r.applicant_name}</p>
                    <p className="text-xs text-navy/45 whitespace-nowrap">
                      {r.applicant_username}
                      {showClass && r.class_code && ` · ${r.class_code}`}
                    </p>
                  </td>
                  <td data-label="Type" className="px-4 py-3 text-navy/70 whitespace-nowrap">{LEAVE_TYPE_LABELS[r.leave_type] || r.leave_type}</td>
                  <td data-label="Dates" className="px-4 py-3 text-navy/70 whitespace-nowrap">
                    {formatDate(r.from_date)}
                    {r.to_date !== r.from_date && <> – {formatDate(r.to_date)}</>}
                  </td>
                  <td data-label="Days" className="px-4 py-3 text-center text-navy/70">{r.days}</td>
                  <td data-label="Reason" className="px-4 py-3 text-navy/60 min-w-[12rem]">
                    {r.reason}
                    {r.decision_note && <p className="text-xs italic text-navy/50 mt-0.5">Note: {r.decision_note}</p>}
                    {r.teacher_remark && <p className="text-xs text-navy/55 mt-1">Your remark to HM: {r.teacher_remark}</p>}
                    {r.hm_remark && (
                      <p className="text-xs mt-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 px-2 py-1">
                        <span className="font-semibold">HM:</span> {r.hm_remark}
                      </p>
                    )}
                  </td>
                  <td className="tc-aside px-4 py-3">
                    {r.status === "pending" && r.forward_state ? (
                      <Badge tone={r.forward_state === "with_hm" ? "gold" : "teal"}>{r.forward_state === "with_hm" ? "With HM" : "HM replied"}</Badge>
                    ) : (
                      <Badge tone={LEAVE_STATUS_TONE[r.status] || "navy"}>{r.status}</Badge>
                    )}
                  </td>
                  <td className="tc-full pt-1 px-4 py-3">
                    {forwardingId === r.id && (
                      <div className="flex flex-col items-end gap-2 min-w-[16rem]">
                        <textarea
                          autoFocus
                          rows={2}
                          maxLength={1000}
                          placeholder="Remarks for the HM (e.g. already took 8 days leave; marks are low)"
                          value={remark}
                          onChange={(e) => setRemark(e.target.value)}
                          className={inputClass + " text-xs py-1.5"}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setForwardingId(null)}
                            className="text-xs font-semibold text-navy/60 hover:bg-navy/6 px-2.5 py-1.5 rounded-lg"
                          >
                            Back
                          </button>
                          <button
                            type="button"
                            disabled={busyId === r.id || remark.trim().length < 2}
                            onClick={() => forward(r.id)}
                            className="flex items-center gap-1 text-xs font-semibold text-navy-dark bg-gold hover:bg-gold-light px-2.5 py-1.5 rounded-lg disabled:opacity-60"
                          >
                            <Icon name="Send" size={13} />
                            Send to HM
                          </button>
                        </div>
                      </div>
                    )}
                    {r.status === "pending" && rejectingId !== r.id && forwardingId !== r.id && (
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
                        {canForward && r.forward_state !== "with_hm" && (
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => {
                              setForwardingId(r.id);
                              setRejectingId(null);
                              setRemark("");
                            }}
                            className="flex items-center gap-1 text-xs font-semibold text-navy hover:bg-navy/6 px-2.5 py-1.5 rounded-lg whitespace-nowrap"
                          >
                            <Icon name="Send" size={14} />
                            {r.forward_state === "hm_replied" ? "Ask HM again" : "Forward to HM"}
                          </button>
                        )}
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
