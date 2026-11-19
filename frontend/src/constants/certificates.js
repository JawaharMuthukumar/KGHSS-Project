// Certificate request flow: pending (class teacher) -> approved (moved to the HM) -> ready (HM printed it; collect
// from the HM's office). Either the class teacher or the HM can reject. Students never download certificates.
export const CERT_STATUS = {
  pending: { label: "With class teacher", tone: "navy" },
  approved: { label: "With Head Master", tone: "gold" },
  ready: { label: "Ready to collect", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
};

export const certStatus = (status) => CERT_STATUS[status] || { label: status, tone: "navy" };

/** The message a student sees under each request. */
export function studentCertMessage(r) {
  if (r.status === "pending") return "Waiting for your class teacher's approval.";
  if (r.status === "approved") return "Class teacher approved — moved to the Head Master for printing.";
  if (r.status === "ready") return "Printed by the Head Master — collect it from the Head Master's office.";
  if (r.status === "rejected") return `Rejected by ${r.decided_by_role === "admin" ? "the Head Master" : "your class teacher"}.`;
  return "";
}
