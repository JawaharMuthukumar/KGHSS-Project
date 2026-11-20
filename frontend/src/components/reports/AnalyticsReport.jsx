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
export default function AnalyticsReport({ term, classCode, onSelectClass, onPickTerm }) {
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
        {onPickTerm && data.trend.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <span className="w-full text-xs">Exams with marks:</span>
            {data.trend.map((t) => (
              <button
                key={t.term}
                type="button"
                onClick={() => onPickTerm(t.term)}
                className="px-4 py-1.5 rounded-full border border-navy/15 text-navy font-semibold hover:border-gold"
              >
                {t.term}
              </button>
            ))}
          </div>
        )}
      </Card>
    );
  }
  const pickClass = onSelectClass ? (row) => onSelectClass(row.label) : undefined;
  const nameList = (people, right) => (
    <ul className="flex flex-col gap-2">
      {people.map((p, i) => (
        <li key={`${p.student_id}-${i}`} className="flex items-center gap-3 text-sm">
          <span className="font-medium text-navy truncate">{p.name}</span>
          {!classCode && <span className="text-xs text-navy/45">{p.class_code}</span>}
          <span className="ml-auto shrink-0 tabular-nums">{right(p)}</span>
        </li>
      ))}
    </ul>
  );

  const attentionPanel = (
    <Panel
      title={classCode ? "Students who did not pass" : "Needs attention"}
      subtitle={data.attention_total ? `${data.attention_total} student${data.attention_total === 1 ? "" : "s"} did not pass — most subjects missed first` : "Everyone who wrote passed"}
      className={classCode && data.attention_total ? "border-red-200" : ""}
    >
      {data.attention.length > 0 && (
        <ul className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
          {data.attention.map((a, i) => (
            <li key={`${a.student_id}-${i}`} className="flex items-start gap-3 text-sm">
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
  );

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

      {classCode && (
        <div className="grid lg:grid-cols-2 gap-5">
          {attentionPanel}
          <Panel title="Subjects students are failing" subtitle={data.subject_struggle.length ? "Where the class needs extra classes — tap a subject to see who" : "No subject has a failure"}>
            <div className="flex flex-col gap-2">
              {data.subject_struggle.map((x) => (
                <details key={x.subject} className="group rounded-xl border border-navy/10 px-3 py-2">
                  <summary className="flex items-center gap-3 cursor-pointer list-none text-sm">
                    <span className="font-semibold text-navy">{x.subject}</span>
                    <span className="text-xs text-navy/50">
                      {x.failed} failed{x.absent ? ` · ${x.absent} absent` : ""} of {x.written + x.absent}
                    </span>
                    <Icon name="ChevronDown" size={15} className="ml-auto text-navy/40 transition-transform group-open:rotate-180" />
                  </summary>
                  <ul className="mt-2 flex flex-col gap-1 text-sm">
                    {x.students.map((p) => (
                      <li key={`${x.subject}-${p.student_id}`} className="flex items-center gap-2">
                        <span className="text-navy/80 truncate">{p.name}</span>
                        <span className={`ml-auto text-xs font-semibold ${p.status === "absent" ? "text-navy/50" : "text-red-600"}`}>
                          {p.status === "absent" ? "Absent" : "Failed"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </Panel>
        </div>
      )}

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
            onRowClick={pickClass}
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

      {data.sections.length > 0 && (
        <Panel title="Section comparison" subtitle={classCode ? `${classCode} beside the other sections of Std ${data.sections[0].grade}` : "Sections of the same standard side by side"}>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-6">
            {data.sections.map((g) => (
              <div key={g.grade}>
                <p className="text-xs font-semibold uppercase tracking-wide text-navy/45 mb-1">Std {g.grade}</p>
                <HBars
                  series={PASS_AVG}
                  labelWidth="3.5rem"
                  onRowClick={pickClass}
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
              <li key={`${t.student_id}-${i}`} className="flex items-center gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-gold/15 text-gold-dark text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                <span className="font-medium text-navy truncate">{t.name}</span>
                {!classCode && <span className="text-xs text-navy/45">{t.class_code}</span>}
                <span className="ml-auto font-semibold text-navy tabular-nums">{t.percent}%</span>
              </li>
            ))}
          </ol>
        </Panel>

        {classCode ? (
          <Panel
            title="Improvement"
            subtitle={data.previous_term ? `Overall % change from ${data.previous_term} to ${term}` : "Shows once an earlier exam has marks"}
          >
            {data.previous_term && (
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-2">
                    <Icon name="TrendingUp" size={14} /> Most improved
                  </p>
                  {data.improved.length ? nameList(data.improved, (p) => <span className="font-semibold text-emerald-700">+{p.change}%</span>) : <p className="text-sm text-navy/45">No one improved.</p>}
                </div>
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-red-600 mb-2">
                    <Icon name="TrendingDown" size={14} /> Dropped most
                  </p>
                  {data.dropped.length ? nameList(data.dropped, (p) => <span className="font-semibold text-red-600">{p.change}%</span>) : <p className="text-sm text-navy/45">No one dropped.</p>}
                </div>
              </div>
            )}
          </Panel>
        ) : (
          attentionPanel
        )}
      </div>
    </div>
  );
}
