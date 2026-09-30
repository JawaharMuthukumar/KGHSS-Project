import PortalPageHeader from "../../components/portal/PortalPageHeader";
import EmptyState from "../../components/portal/EmptyState";
import AttendanceReportPanel from "../../components/reports/AttendanceReportPanel";
import { useMyTeacherProfile } from "../../hooks/useMyTeacherProfile";

export default function TeacherAttendanceReport() {
  const { classCode, loading } = useMyTeacherProfile();

  if (!loading && !classCode) {
    return (
      <div>
        <PortalPageHeader title="Attendance Report" />
        <EmptyState
          icon="BarChart3"
          title="You are not a Class Teacher"
          description="Attendance reporting here is scoped to your assigned class."
        />
      </div>
    );
  }

  return (
    <div>
      <PortalPageHeader title="Attendance Report" description={classCode ? `Class ${classCode}` : undefined} />
      {classCode && <AttendanceReportPanel classCode={classCode} canUnlock={false} />}
    </div>
  );
}
