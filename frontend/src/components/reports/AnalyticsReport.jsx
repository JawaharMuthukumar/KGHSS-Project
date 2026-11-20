import Card from "../ui/Card";
import Icon from "../ui/Icon";
import Banner from "../portal/Banner";
import StatCard from "../portal/StatCard";
import { ContentSkeleton } from "../ui/Skeleton";
import { useApiResource } from "../../hooks/useApiResource";
import { Columns, Donut, HBars, LineChart } from "../charts/Charts";

const PASS_AVG = [
  { key: "pass", label: "Pass %", color: "var(--viz-series-1)" },
  { key: "avg", label: "Average %", color: "var(--viz-series-2)" },
];
// Marks ranges, low → high on the one-hue ramp (darker = higher marks).
const BAND_COLORS = { "Below 35": "var(--viz-band-1)", "35–59": "var(--viz-band-2)", "60–74": "var(--viz-band-3)", "75–89": "var(--viz-band-4)", "90–100": "var(--viz-band-5)" };

function Panel({ title, subtitle, children, className = "" }) {
  return (
    <Card className={`p-5 ${className}`}>
      <h3 className="font-heading font-bold text-navy text-sm">{title}</h3>
      {subtitle && <p className="text-xs text-navy/50 mt-0.5 mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </Card>
  );
}

/**
 * HM analytics for one exam: the whole school (classCode empty) or one class — result split, boys vs girls,
 * marks ranges, the year's exam-to-exam flow, subject-wise results, class-wise and section comparison.
 */
export default function AnalyticsReport({ term, classCode, onSelectClass }) {
  const { data, loading, error } = useApiResource("/reports/analytics", {
    query: { term, class_code: classCode || undefined },
    deps: [term, classCode],
  });

  if (error) return <Banner tone="error">{error.message}</Banner>;
  if (loading || !data) return <ContentSkeleton rows={6} />;

  const s = data.summary;
  const scope = classCode ? `Class ${classCode}` : "Whole school";
  if (!s.appeared) {
    return (
      <Card className="p-8 text-center text-sm text-navy/50">
        No marks entered for <strong className="text-navy">{term}</strong> in {classCode ? `class ${classCode}` : "any class"} yet.
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-heading font-bold text-navy text-base">
          {scope} · {term}
        </h2>
        <p className="text-sm text-navy/50">
          Pass = at least 35% in every subject and absent in none. Academic year {data.academic_year}.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={`Appeared (of ${s.roll})`} value={s.appeared} icon="Users" tone="navy" />
        <StatCard label="Passed" value={s.passed} icon="Check" tone="success" />
        <StatCard label="Pass %" value={s.pass_percent != null ? `${s.pass_percent}%` : null} icon="TrendingUp" tone="gold" />
        <StatCard label="Average %" value={s.average_percent != null ? `${s.average_percent}%` : null} icon="BarChart3" tone="teal" />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title="Result" subtitle={`${s.appeared} of ${s.roll} students wrote ${term}`}>
          <Donut
            centerValue={s.pass_percent != null ? `${Math.round(s.pass_percent)}%` : "—"}
            centerLabel="passed"
            segments={[
              { label: "Passed", value: s.passed, color: "var(--viz-good)" },
              { label: "Failed", value: s.failed, color: "var(--viz-critical)" },
              { label: "Did not write", value: s.not_appeared, color: "var(--viz-empty)" },
            ]}
          />
        </Panel>

        <Panel title="Boys vs Girls" subtitle="Pass % and average % of the students who wrote the exam">
          <HBars
            series={PASS_AVG}
            rows={[
              { label: "Boys", sublabel: `${s.boys.appeared} wrote`, values: { pass: s.boys.pass_percent, avg: s.boys.average_percent },
                extra: [{ label: "Passed", value: `${s.boys.passed} of ${s.boys.appeared}` }] },
              { label: "Girls", sublabel: `${s.girls.appeared} wrote`, values: { pass: s.girls.pass_percent, avg: s.girls.average_percent },
                extra: [{ label: "Passed", value: `${s.girls.passed} of ${s.girls.appeared}` }] },
            ]}
          />
        </Panel>

        <Panel title="Marks ranges" subtitle="Students by overall percentage">
          <Columns items={data.bands.map((b) => ({ label: b.band, value: b.count, color: BAND_COLORS[b.band] }))} unitLabel=" students" />
        </Panel>

        <Panel title="Exam to exam" subtitle={data.trend.length > 1 ? "How results moved across this year's exams" : "Appears once two or more exams have marks"}>
          {data.trend.length ? (
            <LineChart
              series={PASS_AVG}
              points={data.trend.map((t) => ({
                label: t.term,
                values: { pass: t.pass_percent, avg: t.average_percent },
                extra: [{ label: "Wrote", value: t.appeared }],
              }))}
            />
          ) : (
            <p className="text-sm text-navy/45">No exams with marks yet.</p>
          )}
        </Panel>
      </div>

      <Panel title="Subject-wise" subtitle="Average % and pass % per subject">
        <HBars
          series={PASS_AVG}
          labelWidth="7.5rem"
          rows={data.subjects.map((x) => ({
            label: x.subject,
            values: { pass: x.pass_percent, avg: x.average_percent },
            extra: [{ label: "Wrote", value: x.written }],
          }))}
        />
      </Panel>

      {!classCode && data.classes.length > 0 && (
        <Panel title="Class-wise" subtitle="Click a class to see its own analytics">
          <HBars
            series={PASS_AVG}
            onRowClick={(row) => onSelectClass?.(row.label)}
            rows={data.classes
              .filter((c) => c.appeared)
              .map((c) => ({
                label: c.class_code,
                sublabel: c.medium ? `${c.medium} medium` : undefined,
                values: { pass: c.pass_percent, avg: c.average_percent },
                extra: [{ label: "Passed", value: `${c.passed} of ${c.appeared}` }],
              }))}
          />
          {data.classes.some((c) => !c.appeared) && (
            <p className="text-xs text-navy/45 mt-3">
              No marks yet: {data.classes.filter((c) => !c.appeared).map((c) => c.class_code).join(", ")}
            </p>
          )}
        </Panel>
      )}

      {!classCode && data.sections.length > 0 && (
        <Panel title="Section comparison" subtitle="Sections of the same standard side by side">
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-6">
            {data.sections.map((g) => (
              <div key={g.grade}>
                <p className="text-xs font-semibold uppercase tracking-wide text-navy/45 mb-1">Std {g.grade}</p>
                <HBars
                  series={PASS_AVG}
                  labelWidth="3.5rem"
                  onRowClick={(row) => onSelectClass?.(row.label)}
                  rows={g.classes.map((c) => ({
                    label: c.class_code,
                    values: { pass: c.pass_percent, avg: c.average_percent },
                    extra: [{ label: "Passed", value: `${c.passed} of ${c.appeared}` }],
                  }))}
                />
              </div>
            ))}
          </div>
        </Panel>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title="Top 5" subtitle="Highest overall percentage">
          <ol className="flex flex-col gap-2">
            {data.top_students.map((t, i) => (
              <li key={`${t.name}-${i}`} className="flex items-center gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-gold/15 text-gold-dark text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                <span className="font-medium text-navy truncate">{t.name}</span>
                {!classCode && <span className="text-xs text-navy/45">{t.class_code}</span>}
                <span className="ml-auto font-semibold text-navy tabular-nums">{t.percent}%</span>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel
          title="Needs attention"
          subtitle={data.attention_total ? `${data.attention_total} student${data.attention_total === 1 ? "" : "s"} did not pass — most subjects missed first` : "Everyone who wrote passed"}
        >
          {data.attention.length > 0 && (
            <ul className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
              {data.attention.map((a, i) => (
                <li key={`${a.name}-${i}`} className="flex items-start gap-3 text-sm">
                  <Icon name="CircleAlert" size={16} className="text-red-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-medium text-navy truncate">
                      {a.name} {!classCode && <span className="text-xs font-normal text-navy/45">· {a.class_code}</span>}
                    </p>
                    <p className="text-xs text-navy/55">
                      {[a.failed_subjects.length && `Failed: ${a.failed_subjects.join(", ")}`, a.absent_subjects.length && `Absent: ${a.absent_subjects.join(", ")}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <span className="ml-auto font-semibold text-navy tabular-nums">{a.percent}%</span>
                </li>
              ))}
            </ul>
          )}
          {data.attention_total > data.attention.length && (
            <p className="text-xs text-navy/45 mt-3">Showing {data.attention.length} of {data.attention_total}. Open a class for its full list.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
