import PortalPageHeader from "../../components/portal/PortalPageHeader";
import LeaveReviewPanel from "../../components/leave/LeaveReviewPanel";

export default function AdminLeaveRequests() {
  return (
    <div>
      <PortalPageHeader title="Leave Requests" description="Approve or reject teacher leave requests." />
      <LeaveReviewPanel emptyText="No teacher leave requests." />
    </div>
  );
}
