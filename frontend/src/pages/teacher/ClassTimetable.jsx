import PortalPageHeader from "../../components/portal/PortalPageHeader";
import EmptyState from "../../components/portal/EmptyState";
import ClassTimetableEditor from "../../components/timetable/ClassTimetableEditor";
import { useMyTeacherProfile } from "../../hooks/useMyTeacherProfile";

export default function ClassTimetable() {
  const { classCode, loading: loadingProfile } = useMyTeacherProfile();

  if (!loadingProfile && !classCode) {
    return (
      <div>
        <PortalPageHeader title="Class Timetable" />
        <EmptyState
          icon="CalendarRange"
          title="You are not a Class Teacher"
          description="Only the assigned Class Teacher can edit a class timetable."
        />
      </div>
    );
  }

  return (
    <div>
      <PortalPageHeader title="Class Timetable" description={classCode ? `Class ${classCode}` : undefined} />
      {classCode && <ClassTimetableEditor key={classCode} classCode={classCode} />}
    </div>
  );
}
