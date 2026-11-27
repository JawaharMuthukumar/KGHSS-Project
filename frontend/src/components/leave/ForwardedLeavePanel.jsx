import { useState } from "react";
import { Link } from "react-router-dom";
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

const waitingOnHm = (r) => r.status === "pending" && r.forward_state === "with_hm";

/**
 * HM: student leave the class teachers forwarded with their remarks. The HM reads them (the student's name opens
 * the student's full analysis page) and sends a remark back; the class teacher then approves or rejects.
 */
export default function ForwardedLeavePanel() {
  const { data: requests, loading, error, reload } = useApiResource("/leave-requests", { query: { scope: "forwarded" }, live: "leave" });
  const [filter, setFilter] = useState("pending");
  const [replies, setReplies] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");

  const rows = (requests || []).filter((r) => filter === "all" || waitingOnHm(r));
  const pendingCount = (requests || []).filter(waitingOnHm).length;

  const reply = async (id) => {
    setBusyId(id);
    setActionError("");
    try {
      await api.post(`/leave-requests/${id}/hm-reply`, { remark: (replies[id] || "").trim() });
      setReplies((x) => ({ ...x, [id]: "" }));
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not send. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const status = (r) => {
    if (r.status !== "pending") return <Badge tone={LEAVE_STATUS_TONE[r.status] || "navy"}>{r.status} by teacher</Badge>;
    return r.forward_state === "with_hm" ? <Badge tone="gold">Waiting for you</Badge> : <Badge tone="teal">Sent back to teacher</Badge>;
  };

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
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Class Teacher</th>
                <th className="px-4 py-3">Leave</th>
                <th className="px-4 py-3">Student's Reason</th>
                <th className="px-4 py-3">Teacher's Remarks</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Your Remarks</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="p-0">
                    <TableSkeleton rows={4} columns={6} />
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-navy/40">
                    {filter === "pending" ? "No student leave waiting for you." : "No student leave has been forwarded yet."}
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-navy/6 last:border-0 align-top">
                  <td className="tc-primary px-4 py-3">
                    {/* Opens the student's full page: marks, attendance, progress */}
                    <Link to={`/admin/students/${r.student_id}`} className="font-semibold text-navy hover:text-gold-dark underline decoration-navy/25 underline-offset-2 whitespace-nowrap">
                      {r.applicant_name}
                    </Link>
                    <p className="text-xs text-navy/45 whitespace-nowrap">
                      {r.class_code} · {r.applicant_username}
                    </p>
                  </td>
                  <td data-label="Class Teacher" className="px-4 py-3 text-navy/70 whitespace-nowrap">{r.class_teacher_name || "—"}</td>
                  <td data-label="Leave" className="px-4 py-3 text-navy/70 whitespace-nowrap">
                    {formatDate(r.from_date)}
                    {r.to_date !== r.from_date && <> – {formatDate(r.to_date)}</>}
                    <p className="text-xs text-navy/45">
                      {r.days} day{r.days === 1 ? "" : "s"} · {LEAVE_TYPE_LABELS[r.leave_type] || r.leave_type}
                    </p>
                  </td>
                  <td data-label="Student's Reason" className="px-4 py-3 text-navy/60 min-w-[10rem]">{r.reason}</td>
                  <td data-label="Teacher's Remarks" className="px-4 py-3 min-w-[12rem]">
                    <p className="text-navy/80">{r.teacher_remark}</p>
                    {r.forwarded_at && <p className="text-[11px] text-navy/40 mt-0.5">{formatDate(r.forwarded_at)}</p>}
                  </td>
                  <td className="tc-aside px-4 py-3">{status(r)}</td>
                  <td className="tc-full px-4 py-3 min-w-[14rem]">
                    {waitingOnHm(r) ? (
                      <div className="flex flex-col items-end gap-2">
                        <textarea
                          rows={2}
                          maxLength={1000}
                          placeholder="e.g. Give leave, I spoke to the student"
                          value={replies[r.id] || ""}
                          onChange={(e) => setReplies((x) => ({ ...x, [r.id]: e.target.value }))}
                          className={inputClass + " text-xs py-1.5"}
                        />
                        <button
                          type="button"
                          disabled={busyId === r.id || (replies[r.id] || "").trim().length < 2}
                          onClick={() => reply(r.id)}
                          className="flex items-center gap-1 text-xs font-semibold text-navy-dark bg-gold hover:bg-gold-light px-3 py-1.5 rounded-lg disabled:opacity-60"
                        >
                          <Icon name="Send" size={13} />
                          Send to teacher
                        </button>
                      </div>
                    ) : (
                      <p className="text-navy/70">{r.hm_remark || "—"}</p>
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
