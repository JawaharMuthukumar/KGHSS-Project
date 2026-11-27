import { PERIODS, WEEKDAYS } from "../portal/timetableConstants";

/**
 * A teacher's week: Mon–Fri × periods 1–8, each cell showing the class (and subject) they take.
 * `compact` is the smaller version used when printing every teacher's timetable.
 */
export default function TeacherWeekGrid({ entries, compact = false }) {
  const at = {};
  entries.forEach((e) => {
    at[`${e.weekday}-${e.period}`] = e;
  });
  const cell = `border border-navy/15 text-center align-middle ${compact ? "px-0.5 py-1 text-[10px]" : "px-1 py-2 text-xs"}`;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse min-w-[560px]">
        <thead>
          <tr className="bg-navy/[0.04]">
            <th className={`${cell} font-semibold text-navy/60 w-14`}>Day</th>
            {PERIODS.map((p) => (
              <th key={p} className={`${cell} font-semibold text-navy/60`}>
                P{p}
              </th>
            ))}
            <th className={`${cell} font-semibold text-navy/60 w-12`}>Total</th>
          </tr>
        </thead>
        <tbody>
          {WEEKDAYS.map((day, d) => {
            const count = PERIODS.filter((p) => at[`${d}-${p}`]).length;
            return (
              <tr key={day}>
                <th className={`${cell} font-semibold text-navy`}>{day}</th>
                {PERIODS.map((p) => {
                  const e = at[`${d}-${p}`];
                  return (
                    <td key={p} className={`${cell} ${e ? "bg-gold/10" : ""}`}>
                      {e && (
                        <>
                          <span className="block font-semibold text-navy leading-tight">{e.class_code}</span>
                          {e.subject && <span className="block text-navy/55 leading-tight truncate">{e.subject}</span>}
                        </>
                      )}
                    </td>
                  );
                })}
                <td className={`${cell} font-bold text-navy`}>{count}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
