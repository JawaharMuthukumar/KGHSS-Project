import { Fragment, useState } from "react";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Badge from "../../components/ui/Badge";
import Banner from "../../components/portal/Banner";
import { inputClass } from "../../components/portal/FormField";
import { TableSkeleton } from "../../components/ui/Skeleton";
import { useApiResource } from "../../hooks/useApiResource";
import { addDays, dayLabel, isoDay } from "../../constants/homework";

const STATUS = {
  given: { label: "Given", tone: "success" },
  missing: { label: "Not given", tone: "danger" },
  extra: { label: "Given (no period)", tone: "teal" },
};

/**
 * HM: is homework being given? "Day check" lists every class + subject with a period that day (from the timetable)
 * and whether its teacher gave homework; "Teacher-wise" totals it per teacher over a date range.
 */
export default function Homework() {
  const [tab, setTab] = useState("day");
  return (
    <div>
      <PortalPageHeader
        title="Homework"
        description="Check whether teachers are giving homework. A subject is expected to get homework on the days it has a period in the class timetable (PET, Drawing, Craft, Library and Value Education are not counted)."
      />
      <div className="flex items-center gap-1 mb-4 bg-white border border-navy/8 rounded-full p-1 w-fit">
        {[
          { id: "day", label: "Day check" },
          { id: "teachers", label: "Teacher-wise" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`text-xs font-semibold px-3.5 py-1.5 rounded-full transition-colors ${tab === t.id ? "bg-navy text-white" : "text-navy/60 hover:bg-navy/6"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "day" ? <DayCheck /> : <TeacherWise />}
    </div>
  );
}

function DayCheck() {
  const [day, setDay] = useState("");
  const [show, setShow] = useState("missing");
  const [cls, setCls] = useState("all");
  const { data, loading, error } = useApiResource("/homework/check", { query: day ? { day } : undefined, deps: [day], live: "homework" });
  const current = day || data?.day || "";
  const today = data?.today;
  const rows = (data?.rows || []).filter((r) => (show === "all" || (show === "given" ? r.status !== "missing" : r.status === "missing")) && (cls === "all" || r.class_code === cls));
  const classes = [...new Set((data?.rows || []).map((r) => r.class_code))];
  const weekend = data && data.expected === 0 && ["Saturday", "Sunday"].includes(data.weekday);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button type="button" onClick={() => current && setDay(addDays(current, -1))} aria-label="Previous day" className="p-2 rounded-full bg-white border border-navy/10 text-navy hover:border-gold">
          <Icon name="ChevronLeft" size={16} />
        </button>
        <input type="date" value={current} max={today} onChange={(e) => e.target.value && setDay(e.target.value)} className={`${inputClass} !w-auto !py-2`} />
        <button
          type="button"
          disabled={!current || !today || current >= today}
          onClick={() => setDay(addDays(current, 1))}
          aria-label="Next day"
          className="p-2 rounded-full bg-white border border-navy/10 text-navy hover:border-gold disabled:opacity-40"
        >
          <Icon name="ChevronRight" size={16} />
        </button>
        {today && current !== today && (
          <button type="button" onClick={() => setDay(today)} className="text-xs font-semibold px-3 py-1.5 rounded-full text-navy hover:bg-navy/6">
            Today
          </button>
        )}
        {data && <span className="text-sm font-semibold text-navy ml-1">{data.weekday}</span>}
      </div>

      {error && <Banner tone="error" className="mb-4">{error.message}</Banner>}

      {data && !weekend && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Stat label="Periods with homework expected" value={data.expected} />
          <Stat label="Given" value={data.given} tone="text-emerald-600" />
          <Stat label="Not given" value={data.missing} tone={data.missing ? "text-red-600" : "text-navy"} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex items-center gap-1 bg-white border border-navy/8 rounded-full p-1">
          {[
            { id: "missing", label: "Not given" },
            { id: "given", label: "Given" },
            { id: "all", label: "All" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setShow(f.id)}
              className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${show === f.id ? "bg-navy text-white" : "text-navy/60 hover:bg-navy/6"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select value={cls} onChange={(e) => setCls(e.target.value)} className={`${inputClass} !w-auto !py-1.5 text-xs`}>
          <option value="all">All classes</option>
          {classes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="table-cards w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-navy/45 border-b border-navy/8">
              <th className="px-4 py-3">Class · Subject</th>
              <th className="px-4 py-3">Teacher</th>
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Homework</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="p-0">
                  <TableSkeleton rows={6} columns={4} />
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-navy/40">
                  {weekend
                    ? "No school periods on this day."
                    : show === "missing"
                      ? "Every class got its homework for this day."
                      : "Nothing to show."}
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((r) => (
                <tr key={`${r.class_code}-${r.subject}`} className="border-b border-navy/6 last:border-0 align-top">
                  <td className="tc-primary px-4 py-3 font-medium text-navy whitespace-nowrap">
                    {r.class_code} · {r.subject}
                  </td>
                  <td data-label="Teacher" className="px-4 py-3 text-navy/70">{r.teacher_name || "Not assigned"}</td>
                  <td data-label="Period" className="px-4 py-3 text-navy/60">{r.periods.length ? r.periods.join(", ") : "—"}</td>
                  <td className="tc-aside px-4 py-3">
                    <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
                  </td>
                  <td data-label="Homework" className="px-4 py-3 text-navy/70">
                    {r.homework.length
                      ? r.homework.map((h) => (
                          <p key={h.id} className="whitespace-pre-line">
                            {h.details} <span className="text-xs text-navy/40">· submit by {dayLabel(h.due_on)}</span>
                          </p>
                        ))
                      : "—"}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

const startOfWeek = (day) => {
  const d = new Date(`${day}T00:00:00`);
  return addDays(day, -((d.getDay() + 6) % 7));
};

function TeacherWise() {
  const todayStr = isoDay(new Date());
  const presets = {
    week: { label: "This week", from: startOfWeek(todayStr), to: todayStr },
    last: { label: "Last week", from: addDays(startOfWeek(todayStr), -7), to: addDays(startOfWeek(todayStr), -1) },
    month: { label: "This month", from: `${todayStr.slice(0, 8)}01`, to: todayStr },
  };
  const [range, setRange] = useState(presets.week);
  const [open, setOpen] = useState(null);
  const { data, loading, error } = useApiResource("/homework/teachers", {
    query: { date_from: range.from, date_to: range.to },
    deps: [range.from, range.to],
    live: "homework",
  });

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {Object.entries(presets).map(([id, p]) => (
          <button
            key={id}
            type="button"
            onClick={() => setRange(p)}
            className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-colors ${
              range.from === p.from && range.to === p.to ? "bg-navy text-white border-navy" : "bg-white text-navy border-navy/15 hover:border-gold"
            }`}
          >
            {p.label}
          </button>
        ))}
        <span className="flex items-center gap-1.5 text-xs text-navy/60">
          <input type="date" value={range.from} max={range.to} onChange={(e) => e.target.value && setRange((r) => ({ ...r, from: e.target.value }))} className={`${inputClass} !w-auto !py-1.5 text-xs`} />
          to
          <input type="date" value={range.to} min={range.from} max={todayStr} onChange={(e) => e.target.value && setRange((r) => ({ ...r, to: e.target.value }))} className={`${inputClass} !w-auto !py-1.5 text-xs`} />
        </span>
      </div>

      {error && <Banner tone="error" className="mb-4">{error.message}</Banner>}

      <Card className="p-0 overflow-hidden">
        <table className="table-cards w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-navy/45 border-b border-navy/8">
              <th className="px-4 py-3">Teacher</th>
              <th className="px-4 py-3 text-center">Periods</th>
              <th className="px-4 py-3 text-center">Given</th>
              <th className="px-4 py-3 text-center">Not given</th>
              <th className="px-4 py-3 text-center">Given %</th>
              <th className="px-4 py-3">Last given</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="p-0">
                  <TableSkeleton rows={6} columns={5} />
                </td>
              </tr>
            )}
            {!loading && (data?.rows || []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-navy/40">No timetable periods in this range.</td>
              </tr>
            )}
            {!loading &&
              (data?.rows || []).map((r) => (
                <Fragment key={r.teacher_id}>
                  <tr
                    onClick={() => setOpen(open === r.teacher_id ? null : r.teacher_id)}
                    className="border-b border-navy/6 last:border-0 cursor-pointer hover:bg-navy/[0.02]"
                  >
                    <td className="tc-primary px-4 py-3 font-medium text-navy">
                      <span className="inline-flex items-center gap-1.5">
                        <Icon name={open === r.teacher_id ? "ChevronUp" : "ChevronDown"} size={14} className="text-navy/40" />
                        {r.teacher_name}
                      </span>
                    </td>
                    <td data-label="Periods" className="px-4 py-3 text-center text-navy/70">{r.expected}</td>
                    <td data-label="Given" className="px-4 py-3 text-center text-emerald-600 font-semibold">{r.given}</td>
                    <td data-label="Not given" className={`px-4 py-3 text-center font-semibold ${r.missing ? "text-red-600" : "text-navy/40"}`}>{r.missing}</td>
                    <td data-label="Given %" className="px-4 py-3 text-center">
                      {r.given_percent == null ? (
                        "—"
                      ) : (
                        <Badge tone={r.given_percent >= 80 ? "success" : r.given_percent >= 50 ? "gold" : "danger"}>{r.given_percent}%</Badge>
                      )}
                    </td>
                    <td data-label="Last given" className="px-4 py-3 text-navy/60">{r.last_given ? dayLabel(r.last_given) : "Never"}</td>
                  </tr>
                  {open === r.teacher_id && (
                    <tr className="border-b border-navy/6 bg-navy/[0.02]">
                      <td colSpan={6} className="px-4 py-3">
                        {r.missed.length === 0 ? (
                          <p className="text-sm text-emerald-600">Homework given for every period in this range.</p>
                        ) : (
                          <>
                            <p className="text-xs font-semibold text-navy/60 mb-2">Not given{r.missing > r.missed.length ? ` (latest ${r.missed.length})` : ""}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {r.missed.map((m) => (
                                <span key={`${m.day}-${m.class_code}-${m.subject}`} className="text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-700">
                                  {dayLabel(m.day)} · {m.class_code} {m.subject}
                                </span>
                              ))}
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

function Stat({ label, value, tone = "text-navy" }) {
  return (
    <Card className="p-4">
      <p className={`text-2xl font-heading font-bold ${tone}`}>{value}</p>
      <p className="text-xs text-navy/50 mt-0.5">{label}</p>
    </Card>
  );
}
