import { useState } from "react";
import { Link } from "react-router-dom";
import Card from "../ui/Card";
import Icon from "../ui/Icon";
import { WEEKDAYS, WEEKDAY_NAMES, PERIODS } from "../portal/timetableConstants";
import { useApiResource } from "../../hooks/useApiResource";
import { ContentSkeleton } from "../ui/Skeleton";

// JS getDay(): 0 = Sun … 6 = Sat. School days map to backend weekday 0 (Mon) … 4 (Fri).
const todayIndex = () => {
  const day = new Date().getDay();
  return day >= 1 && day <= 5 ? day - 1 : null;
};

/** HM dashboard: pick a day and period to see what every class has, with its subject teacher. */
export default function TodayTimetableCard() {
  const today = todayIndex();
  const [weekday, setWeekday] = useState(today ?? 0);
  const [period, setPeriod] = useState(1);
  const { data, loading } = useApiResource("/timetable/day", { query: { weekday }, deps: [weekday] });

  const entries = (data?.entries || []).filter((e) => e.period === period);
  const unset = data ? data.class_count - entries.length : 0;
  const isToday = weekday === today;

  return (
    <Card className="p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-heading font-bold text-navy">{isToday ? "Today's Timetable" : "Timetable"}</h2>
          <p className="text-xs text-navy/50">
            {WEEKDAY_NAMES[weekday]}
            {today === null && " · no school today"}
          </p>
        </div>
        <Link to="/admin/timetables" className="text-xs font-semibold text-gold-dark hover:text-gold">
          Edit
        </Link>
      </div>

      <div className="flex gap-1 mb-3" role="tablist" aria-label="Day">
        {WEEKDAYS.map((day, i) => (
          <button
            key={day}
            type="button"
            role="tab"
            aria-selected={weekday === i}
            onClick={() => setWeekday(i)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              weekday === i ? "bg-navy text-white" : i === today ? "bg-gold/15 text-navy" : "text-navy/50 hover:bg-navy/5"
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-1.5 mb-4" role="tablist" aria-label="Period">
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={period === p}
            onClick={() => setPeriod(p)}
            className={`py-2 rounded-xl text-xs font-semibold border transition-colors ${
              period === p ? "bg-gold border-gold text-navy-dark" : "border-navy/10 text-navy/70 hover:border-gold"
            }`}
          >
            P{p}
          </button>
        ))}
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-navy/45 mb-2">Period {period}</p>
      {loading && <ContentSkeleton rows={4} />}
      {!loading && entries.length === 0 && (
        <p className="text-sm text-navy/50 py-4 text-center">No timetable set for this period yet.</p>
      )}
      {!loading && entries.length > 0 && (
        <div className="flex flex-col divide-y divide-navy/6 max-h-80 overflow-y-auto -mx-1 px-1">
          {entries.map((e) => (
            <div key={e.class_code} className="flex items-center gap-3 py-2.5">
              <span className="flex items-center justify-center min-w-12 h-9 px-2 rounded-lg bg-navy/8 text-navy text-xs font-bold shrink-0">
                {e.class_code}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-navy truncate">{e.subject}</p>
                <p className={`text-xs truncate flex items-center gap-1 ${e.teacher_name ? "text-navy/55" : "text-amber-600"}`}>
                  <Icon name="UserRound" size={11} className="shrink-0" />
                  {e.teacher_name || "No teacher"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      {!loading && data && entries.length > 0 && unset > 0 && (
        <p className="text-[11px] text-navy/40 mt-2">{unset} class{unset === 1 ? "" : "es"} have nothing set for this period.</p>
      )}
    </Card>
  );
}
