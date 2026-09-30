import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import Banner from "../../components/portal/Banner";
import { WEEKDAYS, PERIODS } from "../../components/portal/timetableConstants";
import { useApiResource } from "../../hooks/useApiResource";

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

      {!loading && classCode && (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="px-3 py-3 text-xs font-semibold uppercase text-navy/45 border-b border-navy/8 text-left">Period</th>
                  {WEEKDAYS.map((day) => (
                    <th key={day} className="px-3 py-3 text-xs font-semibold uppercase text-navy/45 border-b border-navy/8">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map((period) => (
                  <tr key={period} className="border-b border-navy/6 last:border-0">
                    <td className="px-3 py-3 font-semibold text-navy/60">{period}</td>
                    {WEEKDAYS.map((_, weekday) => {
                      const cell = grid[`${weekday}-${period}`];
                      return (
                        <td key={weekday} className="px-3 py-3 text-center">
                          {cell?.subject ? (
                            <div>
                              <p className="font-semibold text-navy text-xs">{cell.subject}</p>
                              {cell.teacher_name && <p className="text-navy/45 text-[11px]">{cell.teacher_name}</p>}
                            </div>
                          ) : (
                            <span className="text-navy/20">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
