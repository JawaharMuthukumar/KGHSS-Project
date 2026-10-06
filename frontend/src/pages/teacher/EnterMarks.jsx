import PortalPageHeader from "../../components/portal/PortalPageHeader";
import EmptyState from "../../components/portal/EmptyState";
import MarksEntryPanel from "../../components/marks/MarksEntryPanel";
import { useMyTeacherProfile } from "../../hooks/useMyTeacherProfile";
import { useApiResource } from "../../hooks/useApiResource";

export default function EnterMarks() {
  const { classCode, loading: loadingProfile } = useMyTeacherProfile();
  const { data: classes } = useApiResource("/classes");
  const academicYear = (classes || []).find((c) => c.code === classCode)?.academic_year || "2026-2027";

  if (!loadingProfile && !classCode) {
    return (
      <div>
        <PortalPageHeader title="Enter Marks" />
        <EmptyState
          icon="Pencil"
          title="You are not a Class Teacher"
          description="Marks entry here is scoped to your assigned class. Ask an admin to assign you as a Class Teacher first."
        />
      </div>
    );
  }

  return (
    <div>
      <PortalPageHeader title="Enter Marks" description={classCode ? `Class ${classCode}` : undefined} />
      {classCode && <MarksEntryPanel classCode={classCode} academicYear={academicYear} />}
    </div>
  );
}
