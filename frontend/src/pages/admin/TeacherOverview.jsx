import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Card from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Badge from "../../components/ui/Badge";
import Banner from "../../components/portal/Banner";
import StatCard from "../../components/portal/StatCard";
import TeacherWeekGrid from "../../components/timetable/TeacherWeekGrid";
import { HBars } from "../../components/charts/Charts";
import { inputClass } from "../../components/portal/FormField";
import { ContentSkeleton } from "../../components/ui/Skeleton";
import { useApiResource } from "../../hooks/useApiResource";
import { useToast } from "../../components/ui/Toast";
import { api, ApiError } from "../../lib/apiClient";
import { printElement } from "../../lib/printElement";

const PASS_AVG = [
  { key: "pass", label: "Pass %", color: "var(--viz-series-1)" },
  { key: "avg", label: "Average", color: "var(--viz-series-2)", unit: "" },
];

function Field({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-navy/45">{label}</p>
      <p className="text-sm font-medium text-navy truncate">{value || "—"}</p>
    </div>
  );
}

/**
 * HM's full page for one teacher: their classes and subjects, how each class did in their subject (weakest class
 * first, with the students who failed), exam-to-exam pass %, and their weekly timetable with the period count.
 */
export default function TeacherOverview() {
  const { teacherId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [term, setTerm] = useState("");
  const { data, loading, error, reload } = useApiResource(`/reports/teacher/${teacherId}`, {
    query: term ? { term } : undefined,
    deps: [teacherId, term],
  });
  const [busy, setBusy] = useState(false);
  const page = useRef(null);

  if (error) return <Banner tone="error">{error.message}</Banner>;
  if (loading && !data) return <ContentSkeleton rows={8} />;
  if (!data) return null;

  const t = data.teacher;
  const withMarks = data.slots.filter((s) => s.written != null);
  const weakestFirst = [...withMarks].sort((a, b) => (a.pass_percent ?? 101) - (b.pass_percent ?? 101));
  const failedTotal = withMarks.reduce((n, s) => n + (s.failed || 0) + (s.absent || 0), 0);
  const written = withMarks.reduce((n, s) => n + s.written, 0);
  const passed = withMarks.reduce((n, s) => n + s.passed, 0);
  const perClass = data.timetable.reduce((m, e) => ({ ...m, [e.class_code]: (m[e.class_code] || 0) + 1 }), {});
  const examCols = [...new Set(data.slots.flatMap((s) => s.trend.map((x) => x.term)))];

  const setActive = async (active) => {
    if (!active && !window.confirm(`Deactivate ${t.full_name}? They will no longer be able to sign in.`)) return;
    setBusy(true);
    try {
      if (active) await api.patch(`/teachers/${t.id}`, { is_active: true });
      else await api.delete(`/teachers/${t.id}`);
      toast.success(`${t.full_name} ${active ? "reactivated" : "deactivated"}`);
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Link to="/admin/teachers" className="flex items-center gap-1.5 text-sm font-semibold text-navy border border-navy/15 rounded-full px-4 py-2 hover:border-gold">
          <Icon name="ArrowLeft" size={15} />
          All teachers
        </Link>
        <div className="ml-auto flex flex-wrap gap-2">
          <button type="button" onClick={() => navigate(`/admin/teachers?edit=${t.id}`)} className="flex items-center gap-1.5 text-sm font-semibold text-navy border border-navy/15 rounded-full px-4 py-2 hover:border-gold">
            <Icon name="Pencil" size={14} />
            Edit
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setActive(!t.is_active)}
            className={`flex items-center gap-1.5 text-sm font-semibold rounded-full px-4 py-2 border ${t.is_active ? "text-red-600 border-red-200 hover:bg-red-50" : "text-emerald-700 border-emerald-200 hover:bg-emerald-50"}`}
          >
            <Icon name={t.is_active ? "Trash2" : "Check"} size={14} />
            {t.is_active ? "Deactivate" : "Reactivate"}
          </button>
          <button
            type="button"
            onClick={() => printElement(page.current, { orientation: "portrait", title: `${t.full_name} - Teacher Report` })}
            className="flex items-center gap-1.5 text-sm font-semibold bg-gold text-navy-dark rounded-full px-4 py-2 hover:bg-gold-light"
          >
            <Icon name="Printer" size={14} />
            Print
          </button>
        </div>
      </div>

      <div ref={page} className="flex flex-col gap-5">
        <Card className="p-5">
          <div className="flex flex-wrap items-start gap-4">
            <span className="flex items-center justify-center w-14 h-14 rounded-full bg-navy text-white text-xl font-bold shrink-0">{t.full_name.slice(0, 1)}</span>
            <div className="min-w-0 flex-1">
              <h1 className="font-heading font-bold text-navy text-2xl leading-tight">{t.full_name}</h1>
              <p className="text-sm text-navy/60">
                {t.employee_id} · {data.academic_year}
              </p>
            </div>
            <Badge tone={t.is_active ? "success" : "danger"}>{t.is_active ? "Active" : "Inactive"}</Badge>
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="Sign in with" value={`${t.full_name} (or ${t.username})`} />
            <Field label="Main subject" value={t.subject} />
            <Field label="Phone" value={t.phone} />
            <Field label="Class teacher of" value={t.class_teacher_of.join(", ")} />
          </div>
        </Card>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Classes · subjects" value={data.slots.length} icon="School" tone="navy" />
          <StatCard label="Periods per week" value={data.periods_per_week} icon="CalendarRange" tone="gold" />
          <StatCard label="Pass % (their subjects)" value={written ? `${Math.round((passed * 1000) / written) / 10}%` : null} icon="TrendingUp" tone="teal" />
          <StatCard label="Students failed / absent" value={withMarks.length ? failedTotal : null} icon="CircleAlert" tone={failedTotal ? "danger" : "success"} />
        </div>

        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h3 className="font-heading font-bold text-navy text-sm">Results in their subjects</h3>
            <select value={term} onChange={(e) => setTerm(e.target.value)} className={`${inputClass} !w-auto ml-auto print:hidden`} aria-label="Exam">
              <option value="">Latest exam of each class</option>
              {data.terms.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-navy/50 mb-4">Weakest class first — the class that needs the most attention is on top. Pass = 35% of the subject.</p>
          {weakestFirst.length ? (
            <HBars
              series={PASS_AVG}
              labelWidth="7.5rem"
              rows={weakestFirst.map((s) => ({
                label: `${s.class_code} · ${s.subject}`,
                sublabel: s.exam,
                values: { pass: s.pass_percent, avg: s.average_percent },
                extra: [{ label: "Failed", value: `${s.failed} of ${s.written}` }, ...(s.absent ? [{ label: "Absent", value: s.absent }] : [])],
              }))}
            />
          ) : (
            <p className="text-sm text-navy/45">No marks entered yet in this teacher's subjects.</p>
          )}
        </Card>

        {weakestFirst.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4">
            {weakestFirst.map((s, i) => (
              <Card key={`${s.class_code}-${s.subject}`} className={`p-4 ${i === 0 && s.failed ? "border-red-200" : ""}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-heading font-bold text-navy">
                    {s.class_code} · {s.subject}
                  </p>
                  {i === 0 && s.failed > 0 && <span className="text-[11px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">Needs most attention</span>}
                  <span className="ml-auto text-xs text-navy/45">{s.exam}</span>
                </div>
                <p className="text-sm text-navy/70 mt-1">
                  {s.passed} of {s.written} passed · <strong className="text-navy">{s.pass_percent ?? "—"}%</strong> · average {s.average_percent ?? "—"}
                  {s.absent ? ` · ${s.absent} absent` : ""}
                </p>
                {s.failing.length > 0 ? (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wide text-red-600 mt-3 mb-1.5">Give extra attention ({s.failing.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {s.failing.map((f, k) => (
                        <span key={k} className="text-xs bg-red-50 text-red-700 rounded-full px-2.5 py-1">
                          {f.name} · {f.absent ? "AB" : `${f.score}/${f.max}`}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-emerald-700 mt-3">Everyone passed.</p>
                )}
              </Card>
            ))}
          </div>
        )}

        {examCols.length > 0 && (
          <Card className="p-5">
            <h3 className="font-heading font-bold text-navy text-sm">Exam to exam (pass %)</h3>
            <p className="text-xs text-navy/50 mb-3">How each class did in this teacher's subject across the year's exams.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-navy/45 border-b border-navy/8">
                    <th className="px-3 py-2">Class · Subject</th>
                    {examCols.map((x) => (
                      <th key={x} className="px-3 py-2 text-center whitespace-nowrap">{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.slots.map((s) => {
                    const by = Object.fromEntries(s.trend.map((x) => [x.term, x.pass_percent]));
                    let prev = null;
                    return (
                      <tr key={`${s.class_code}-${s.subject}`} className="border-b border-navy/6 last:border-0">
                        <td className="px-3 py-2 font-medium text-navy whitespace-nowrap">{s.class_code} · {s.subject}</td>
                        {examCols.map((x) => {
                          const v = by[x];
                          const diff = v != null && prev != null ? v - prev : null;
                          if (v != null) prev = v;
                          return (
                            <td key={x} className="px-3 py-2 text-center tabular-nums">
                              {v == null ? (
                                <span className="text-navy/25">—</span>
                              ) : (
                                <>
                                  <span className="font-semibold text-navy">{v}%</span>
                                  {diff != null && diff !== 0 && (
                                    <span className={`ml-1 text-[11px] font-semibold ${diff > 0 ? "text-emerald-700" : "text-red-600"}`}>
                                      {diff > 0 ? "↑" : "↓"}
                                      {Math.abs(Math.round(diff * 10) / 10)}
                                    </span>
                                  )}
                                </>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <Card className="p-5 break-inside-avoid">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <h3 className="font-heading font-bold text-navy text-sm">Timetable</h3>
            <span className="text-xs font-semibold text-navy/60 bg-navy/[0.05] px-2.5 py-1 rounded-full">{data.periods_per_week} periods / week</span>
            <div className="flex flex-wrap gap-1.5 ml-auto">
              {Object.entries(perClass).map(([code, n]) => (
                <span key={code} className="text-[11px] font-semibold text-navy/70 bg-gold/10 px-2 py-0.5 rounded-full">
                  {code}: {n}
                </span>
              ))}
            </div>
          </div>
          {data.timetable.length ? <TeacherWeekGrid entries={data.timetable} /> : <p className="text-sm text-navy/45">No periods in the timetable yet.</p>}
        </Card>
      </div>
    </div>
  );
}
