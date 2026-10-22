import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import Banner from "../../components/portal/Banner";
import TimetableGrid from "../../components/timetable/TimetableGrid";
import { useApiResource } from "../../hooks/useApiResource";
import { TableSkeleton } from "../../components/ui/Skeleton";

export default function StudentTimetable() {
  const { data: profile } = useApiResource("/students/me/profile");
  const classCode = profile?.class_code;
  const { data: entries, loading, error } = useApiResource(`/classes/${classCode}/timetable`, {
    enabled: Boolean(classCode),
  });

  const grid = {};
  (entries || []).forEach((e) => {
    grid[`${e.weekday}-${e.period}`] = e;
  });

  return (
    <div>
      <PortalPageHeader title="Timetable" description={classCode ? `Class ${classCode}` : undefined} />

      {error && <Banner tone="error" className="mb-4">{error.message}</Banner>}

      {loading && classCode && <Card className="p-0 overflow-hidden"><TableSkeleton rows={5} columns={6} /></Card>}

      {!loading && classCode && (
        <Card className="p-0 overflow-hidden">
          <TimetableGrid
            renderCell={(weekday, period) => {
              const cell = grid[`${weekday}-${period}`];
              return cell?.subject ? (
                <div className="py-1">
                  <p className="font-semibold text-navy text-xs">{cell.subject}</p>
                  {cell.teacher_name && <p className="text-navy/45 text-[11px]">{cell.teacher_name}</p>}
                </div>
              ) : (
                <span className="text-navy/20">—</span>
              );
            }}
          />
        </Card>
      )}
    </div>
  );
}
