import { useState } from "react";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import LeaveReviewPanel from "../../components/leave/LeaveReviewPanel";
import ForwardedLeavePanel from "../../components/leave/ForwardedLeavePanel";

const tabs = [
  { id: "students", label: "Student Leave (forwarded)" },
  { id: "teachers", label: "Teacher Leave" },
];

export default function AdminLeaveRequests() {
  const [tab, setTab] = useState("students");
  return (
    <div>
      <PortalPageHeader
        title="Leave Requests"
        description="Reply to student leave the class teachers forwarded to you, and approve or reject teacher leave."
      />
      <div className="flex gap-1 mb-5 border-b border-navy/8">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === t.id ? "border-gold text-navy" : "border-transparent text-navy/45 hover:text-navy"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "students" ? <ForwardedLeavePanel /> : <LeaveReviewPanel emptyText="No teacher leave requests." />}
    </div>
  );
}
