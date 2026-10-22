import { useState } from "react";
import { WEEKDAYS, WEEKDAY_NAMES, PERIODS } from "../portal/timetableConstants";

// JS getDay(): 0 = Sun … 6 = Sat → backend weekday 0 (Mon) … 4 (Fri); weekends show Monday.
const todayWeekday = () => {
  const day = new Date().getDay();
  return day >= 1 && day <= 5 ? day - 1 : 0;
};

/**
 * Weekly timetable used by every timetable view and editor. `renderCell(weekday, period)` draws one slot.
 * Tablet/desktop: days as rows, periods as columns. Phone: pick a day, then its periods as a list.
 */
export default function TimetableGrid({ renderCell, cellClassName = "min-w-[6.5rem]" }) {
  const [day, setDay] = useState(todayWeekday);

  return (
    <>
      {/* Phone */}
      <div className="md:hidden">
        <div className="flex gap-1 p-2 border-b border-navy/8" role="tablist" aria-label="Day">
          {WEEKDAYS.map((label, i) => (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={day === i}
              onClick={() => setDay(i)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${day === i ? "bg-navy text-white" : "text-navy/55"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-navy/45">{WEEKDAY_NAMES[day]}</p>
        <ul className="px-3 pb-3 flex flex-col gap-2">
          {PERIODS.map((period) => (
            <li key={period} className="flex items-center gap-3">
              <span className="flex flex-col items-center justify-center w-11 h-11 rounded-xl bg-navy/[0.06] text-navy shrink-0 leading-none">
                <span className="text-[9px] font-semibold uppercase text-navy/45">Period</span>
                <span className="text-sm font-bold">{period}</span>
              </span>
              <div className="flex-1 min-w-0 text-left [&_p]:text-left">{renderCell(day, period)}</div>
            </li>
          ))}
        </ul>
      </div>

      {/* Tablet / desktop */}
      <div className="hidden md:block overflow-x-auto">
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
            {WEEKDAYS.map((label, weekday) => (
              <tr key={label} className="border-b border-navy/6 last:border-0">
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
    </>
  );
}
