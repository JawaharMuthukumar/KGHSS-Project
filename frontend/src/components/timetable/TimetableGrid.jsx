import { WEEKDAYS, WEEKDAY_NAMES, PERIODS } from "../portal/timetableConstants";

/**
 * Weekly timetable laid out with days as rows and periods as columns — used by every
 * timetable view and editor. `renderCell(weekday, period)` draws one slot.
 */
export default function TimetableGrid({ renderCell, cellClassName = "min-w-[6.5rem]" }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white px-3 py-3 text-xs font-semibold uppercase text-navy/45 border-b border-navy/8 text-left">
              Day
            </th>
            {PERIODS.map((period) => (
              <th key={period} className="px-2 py-3 text-xs font-semibold uppercase text-navy/45 border-b border-navy/8 text-center">
                Period {period}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {WEEKDAYS.map((day, weekday) => (
            <tr key={day} className="border-b border-navy/6 last:border-0">
              <th scope="row" className="sticky left-0 z-10 bg-white px-3 py-2 text-left font-semibold text-navy/70 whitespace-nowrap">
                {WEEKDAY_NAMES[weekday]}
              </th>
              {PERIODS.map((period) => (
                <td key={period} className={`px-1.5 py-2 align-top text-center ${cellClassName}`}>
                  {renderCell(weekday, period)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
