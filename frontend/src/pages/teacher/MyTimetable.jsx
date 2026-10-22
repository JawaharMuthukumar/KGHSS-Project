import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import Banner from "../../components/portal/Banner";
import TimetableGrid from "../../components/timetable/TimetableGrid";
import { useApiResource } from "../../hooks/useApiResource";
import { TableSkeleton } from "../../components/ui/Skeleton";

export default function MyTimetable() {
  const { data: entries, loading, error } = useApiResource("/teachers/me/timetable");

  const grid = {};
  (entries || []).forEach((e) => {
    grid[`${e.weekday}-${e.period}`] = e;
  });

  return (
    <div>
      <PortalPageHeader title="My Timetable" description="Your personal weekly teaching schedule." />

      {error && <Banner tone="error" className="mb-4">{error.message}</Banner>}

      {loading && <Card className="p-0 overflow-hidden"><TableSkeleton rows={5} columns={6} /></Card>}

      {!loading && (
        <Card className="p-0 overflow-hidden">
          <TimetableGrid
            renderCell={(weekday, period) => {
              const cell = grid[`${weekday}-${period}`];
              return cell ? (
                <div className="py-1">
                  <p className="font-semibold text-navy text-xs">{cell.class_code}</p>
                  <p className="text-navy/55 text-xs">{cell.subject}</p>
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
