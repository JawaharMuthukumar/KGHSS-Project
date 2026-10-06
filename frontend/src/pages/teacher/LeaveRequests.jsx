import { useState } from "react";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import EmptyState from "../../components/portal/EmptyState";
import LeaveReviewPanel from "../../components/leave/LeaveReviewPanel";
import MyLeavePanel from "../../components/leave/MyLeavePanel";
import { TEACHER_LEAVE_TYPES } from "../../components/leave/leaveConstants";
import { useMyTeacherProfile } from "../../hooks/useMyTeacherProfile";

const tabs = [
  { id: "students", label: "Student Requests" },
  { id: "mine", label: "My Leave" },
];

export default function LeaveRequests() {
  const { classCode, loading } = useMyTeacherProfile();
  const [tab, setTab] = useState("students");

  return (
    <div>
      <PortalPageHeader
        title="Leave Requests"
        description="Approve your class's student leave, and apply for your own leave to the HM."
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

      {tab === "students" &&
        (!loading && !classCode ? (
          <EmptyState
            icon="ClipboardList"
            title="You are not a Class Teacher"
            description="Student leave requests go to the class teacher of the student's class."
          />
        ) : (
          <LeaveReviewPanel emptyText="No student leave requests." />
        ))}
      {tab === "mine" && <MyLeavePanel types={TEACHER_LEAVE_TYPES} approverLabel="the HM" />}
    </div>
  );
}
