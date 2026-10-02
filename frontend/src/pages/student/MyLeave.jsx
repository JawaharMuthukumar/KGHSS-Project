import PortalPageHeader from "../../components/portal/PortalPageHeader";
import MyLeavePanel from "../../components/leave/MyLeavePanel";
import { STUDENT_LEAVE_TYPES } from "../../components/leave/leaveConstants";

export default function MyLeave() {
  return (
    <div>
      <PortalPageHeader title="Leave Request" description="Apply for leave or OD. Your class teacher approves it." />
      <MyLeavePanel types={STUDENT_LEAVE_TYPES} approverLabel="your class teacher" />
    </div>
  );
}
