import Card from "../ui/Card";
import Icon from "../ui/Icon";
import { HBars, LineChart } from "../charts/Charts";

const meVsClass = (meLabel) => [
  { key: "me", label: meLabel, color: "var(--viz-series-1)" },
  { key: "cls", label: "Class average %", color: "var(--viz-series-2)" },
];
const BEFORE_AFTER = [
  { key: "before", label: "Previous exam", color: "var(--viz-series-2)" },
  { key: "after", label: "Latest exam", color: "var(--viz-series-1)" },
];

function Change({ value, size = "text-xs" }) {
  if (value == null) return null;
  const up = value > 0;
  const flat = value === 0;
  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${size} ${flat ? "text-navy/50" : up ? "text-emerald-700" : "text-red-600"}`}>
      {!flat && <Icon name={up ? "TrendingUp" : "TrendingDown"} size={14} />}
      {up ? "+" : ""}
      {value}%
    </span>
  );
}

function Panel({ title, subtitle, children }) {
  return (
    <Card className="p-5">
      <h3 className="font-heading font-bold text-navy text-sm">{title}</h3>
      {subtitle && <p className="text-xs text-navy/50 mt-0.5">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </Card>
  );
}

/**
 * One student's progress (data from /reports/my-progress or /reports/student/{id}): overall result with change,
 * class rank and target, exam-to-exam line, subject improvement, mid-term / main-exam comparisons and tips.
 */
export default function StudentProgressView({ data, meLabel = "My %" }) {
  const ME_VS_CLASS = meVsClass(meLabel);
  const o = data.overall;
  const mids = data.exams.filter((e) => e.group === "mid" && e.percent != null);
  const mains = data.exams.filter((e) => e.group === "main" && e.percent != null);
  const compareRows = (list) => list.map((e) => ({ label: e.term, values: { me: e.percent, cls: e.class_average } }));
  const tips = [...data.subjects].sort((a, b) => a.latest - b.latest); // weakest first

  return (
    <>
      {o && (
        <Card className="p-5 mb-5">
          <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
            <div>
              <p className="text-xs text-navy/50">{o.latest_term}</p>
              <p className="flex items-baseline gap-3">
                <span className="text-4xl font-heading font-bold text-navy">{o.latest}%</span>
                <Change value={o.change} size="text-sm" />
              </p>
              <p className="text-xs text-navy/50 mt-1">
                {o.previous_term ? `${o.previous}% in ${o.previous_term}` : "First exam this year"}
                {o.class_average != null && ` · class average ${o.class_average}%`}
                {o.rank && ` · rank ${o.rank} of ${o.ranked_of}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {o.strongest && (
                <span className="rounded-full bg-emerald-50 text-emerald-700 px-3 py-1.5 font-semibold">
                  Strongest: {o.strongest.subject} {o.strongest.percent}%
                </span>
              )}
              {o.weakest && (
                <span className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 font-semibold">
                  Needs work: {o.weakest.subject} {o.weakest.percent}%
                </span>
              )}
              <span className="rounded-full bg-gold/15 text-gold-dark px-3 py-1.5 font-semibold inline-flex items-center gap-1">
                <Icon name="Target" size={13} /> Next exam target: {o.target}%
              </span>
            </div>
          </div>
          <p className="mt-4 flex items-start gap-2 rounded-2xl bg-navy/[0.04] px-4 py-3 text-sm text-navy">
            <Icon name="Lightbulb" size={18} className="text-gold-dark shrink-0 mt-0.5" />
            {o.message}
          </p>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <Panel title="Exam to exam" subtitle="Your overall % and the class average across this year's exams">
          <LineChart series={ME_VS_CLASS} points={data.exams.map((e) => ({ label: e.term, values: { me: e.percent, cls: e.class_average } }))} />
        </Panel>
        <Panel title="Subject improvement" subtitle="Each subject: the exam before vs your latest exam">
          <HBars
            series={BEFORE_AFTER}
            labelWidth="7rem"
            rows={data.subjects.map((x) => ({
              label: x.subject,
              sublabel: x.change != null ? `${x.change > 0 ? "+" : ""}${x.change}%` : "one exam so far",
              values: { before: x.previous, after: x.latest },
              extra: [
                ...(x.previous_term ? [{ label: "Previous", value: x.previous_term }] : []),
                { label: "Latest", value: x.latest_term },
              ],
            }))}
          />
        </Panel>
      </div>

      {(mids.length > 0 || mains.length > 0) && (
        <div className="grid lg:grid-cols-2 gap-5 mb-5">
          {mids.length > 0 && (
            <Panel title="Mid-term exams compared" subtitle={mids.map((e) => e.term).join(" · ")}>
              <HBars series={ME_VS_CLASS} labelWidth="7rem" rows={compareRows(mids)} />
            </Panel>
          )}
          {mains.length > 0 && (
            <Panel title="Main exams compared" subtitle={mains.map((e) => e.term).join(" · ")}>
              <HBars series={ME_VS_CLASS} labelWidth="7rem" rows={compareRows(mains)} />
            </Panel>
          )}
        </div>
      )}

      <Panel title="Tips for the next exam" subtitle="Weakest subject first — put a little extra time where it counts most">
        <div className="grid md:grid-cols-2 gap-3">
          {tips.map((x) => (
            <div key={x.subject} className={`rounded-2xl border px-4 py-3 ${x.latest < 35 ? "border-red-200 bg-red-50/50" : "border-navy/10"}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-navy">{x.subject}</span>
                <span className="text-sm font-semibold text-navy tabular-nums">{x.latest}%</span>
                <Change value={x.change} />
                <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-gold-dark">
                  <Icon name="Target" size={13} /> Target {x.target}%
                </span>
              </div>
              <p className="text-xs text-navy/65 mt-1.5 leading-relaxed">{x.tip}</p>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
