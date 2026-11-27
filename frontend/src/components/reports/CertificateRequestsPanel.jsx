import { useState } from "react";
import PortalPageHeader from "../portal/PortalPageHeader";
import Card from "../ui/Card";
import Icon from "../ui/Icon";
import Badge from "../ui/Badge";
import Banner from "../portal/Banner";
import { useApiResource } from "../../hooks/useApiResource";
import { api, ApiError } from "../../lib/apiClient";
import { formatDate } from "../../utils/formatDate";
import { TableSkeleton } from "../ui/Skeleton";
import { certStatus } from "../../constants/certificates";
import { openPdf } from "../../lib/pdf";

const decidedByLabel = (r) => {
  if (r.decided_by_role === "admin") return "HM";
  if (r.decided_by_role === "teacher") return r.decided_by_name === r.class_teacher_name ? "Class teacher" : "Teacher";
  return null;
};

const decisionDetails = (r) => (
  <>
    {r.status !== "pending" && r.decided_by_name && (
      <p className="text-[11px] text-navy/50 mt-1">
        {r.status === "rejected" ? "Rejected" : "Approved"} by {decidedByLabel(r)} · {r.decided_by_name}
        {r.decided_at && ` · ${formatDate(r.decided_at)}`}
      </p>
    )}
    {r.printed_at && r.status === "ready" && <p className="text-[11px] text-navy/50">Printed · {formatDate(r.printed_at)}</p>}
    {r.decision_note && <p className="text-[11px] text-navy/45 italic mt-0.5">“{r.decision_note}”</p>}
  </>
);

const actionBtn = "flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg disabled:opacity-60";

/**
 * Certificate requests for the class teacher (decides pending ones) and the HM (`canPrint`: prints what the
 * class teachers approved; printing marks it ready for the student to collect, and can be repeated).
 */
export default function CertificateRequestsPanel({ description, showClassTeacher = false, canPrint = false }) {
  const columns = showClassTeacher ? 7 : 6;
  const { data: requests, loading, error, reload } = useApiResource("/certificates/requests", { live: "certificates" });
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [filter, setFilter] = useState(canPrint ? "print" : "all");

  const toPrint = (requests || []).filter((r) => r.status === "approved");
  const shown = filter === "print" ? toPrint : requests || [];

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

  const print = async (r) => {
    // Computer: opens in a new tab to print; phone: downloads so the phone's PDF app (with Print/Share) opens it
    setBusyId(r.id);
    setActionError("");
    try {
      await openPdf(`/certificates/requests/${r.id}/download`, undefined, `${r.certificate_type} certificate - ${r.student_name || r.id}.pdf`);
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not open the certificate. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const actions = (r) => {
    const busy = busyId === r.id;
    const approve = (
      <button type="button" disabled={busy} onClick={() => decide(r.id, true)} className={`${actionBtn} text-emerald-600 hover:bg-emerald-50`}>
        <Icon name="Check" size={14} />
        {canPrint ? "Approve" : "Approve & send to HM"}
      </button>
    );
    const reject = (
      <button type="button" disabled={busy} onClick={() => decide(r.id, false)} className={`${actionBtn} text-red-600 hover:bg-red-50`}>
        <Icon name="X" size={14} />
        Reject
      </button>
    );
    const printBtn = (
      <button type="button" disabled={busy} onClick={() => print(r)} className={`${actionBtn} text-navy hover:bg-navy/6`}>
        <Icon name="Printer" size={14} />
        {r.status === "ready" ? "Print again" : "Print"}
      </button>
    );
    if (r.status === "pending") return <>{approve}{reject}</>;
    if (canPrint && r.status === "approved") return <>{printBtn}{reject}</>;
    if (canPrint && r.status === "ready") return printBtn;
    return null;
  };

  return (
    <div>
      <PortalPageHeader title="Certificate Requests" description={description} />

      {error && <Banner tone="error" className="mb-4">{error.message}</Banner>}
      {actionError && <Banner tone="error" className="mb-4">{actionError}</Banner>}

      {canPrint && (
        <div className="flex items-center gap-1 mb-4 bg-white border border-navy/8 rounded-full p-1 w-fit">
          {[
            { id: "print", label: `To print (${toPrint.length})` },
            { id: "all", label: "All requests" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-full transition-colors ${
                filter === f.id ? "bg-navy text-white" : "text-navy/60 hover:bg-navy/6"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      <Card className="p-0 overflow-hidden">
        <table className="table-cards w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-navy/45 border-b border-navy/8">
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Note</th>
              {showClassTeacher && <th className="px-4 py-3">Class Teacher</th>}
              <th className="px-4 py-3">Requested</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={columns} className="p-0"><TableSkeleton rows={4} columns={columns - 1} /></td></tr>}
            {!loading && shown.length === 0 && (
              <tr>
                <td colSpan={columns} className="px-4 py-8 text-center text-navy/40">
                  {filter === "print" ? "Nothing to print. Requests approved by class teachers will appear here." : "No certificate requests."}
                </td>
              </tr>
            )}
            {shown.map((r) => (
              <tr key={r.id} className="border-b border-navy/6 last:border-0">
                <td className="tc-primary px-4 py-3">
                  <p className="font-medium text-navy">{r.student_name || "—"}</p>
                  <p className="text-xs text-navy/45">
                    {[r.class_code, r.registration_no].filter(Boolean).join(" · ")}
                  </p>
                </td>
                <td data-label="Type" className="px-4 py-3 text-navy capitalize">{r.certificate_type}</td>
                <td data-label="Note" className="px-4 py-3 text-navy/60">{r.note || "—"}</td>
                {showClassTeacher && (
                  <td data-label="Class Teacher" className="px-4 py-3 text-navy/70">{r.class_teacher_name || "Not assigned"}</td>
                )}
                <td data-label="Requested" className="px-4 py-3 text-navy/60">{formatDate(r.created_at)}</td>
                <td className="tc-aside px-4 py-3">
                  <Badge tone={certStatus(r.status).tone}>{certStatus(r.status).label}</Badge>
                  <div className="hidden md:block">{decisionDetails(r)}</div>
                </td>
                <td className="tc-full pt-1 px-4 py-3">
                  <div className="flex items-center justify-end gap-2">{actions(r)}</div>
                </td>
                {/* Phones: the decision gets its own line in the stacked card instead of crowding the badge. */}
                {r.status !== "pending" && r.decided_by_name && (
                  <td data-label="Decided" className="md:hidden px-4 py-3 text-right">{decisionDetails(r)}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
