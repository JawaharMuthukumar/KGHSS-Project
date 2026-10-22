/** Year-end promotion: per-student decisions and the class list's review status. */
export const DECISIONS = {
  promoted: { label: "Promoted", short: "Promoted", tone: "success", icon: "TrendingUp" },
  not_promoted: { label: "Not promoted", short: "Not promoted", tone: "danger", icon: "RefreshCw" },
  left: { label: "TC / Left school", short: "TC / Left", tone: "sample", icon: "LogOut" },
  passed_out: { label: "Passed out", short: "Passed out", tone: "gold", icon: "GraduationCap" },
};

export const LIST_STATUS = {
  none: { label: "Not started", tone: "navy" },
  draft: { label: "Draft", tone: "navy" },
  submitted: { label: "Waiting for HM", tone: "sample" },
  returned: { label: "Sent back", tone: "danger" },
  approved: { label: "Approved", tone: "success" },
};

export const classOptionLabel = (o) => [o.code, o.group_name, o.medium].filter(Boolean).join(" · ");
