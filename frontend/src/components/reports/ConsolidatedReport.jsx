import Card from "../ui/Card";
import Icon from "../ui/Icon";
import Banner from "../portal/Banner";
import { useApiResource } from "../../hooks/useApiResource";

export default function ConsolidatedReport({ term }) {
  const { data, loading, error } = useApiResource("/reports/consolidated", {
    query: { term },
    enabled: Boolean(term),
    deps: [term],
  });

  if (error) return <Banner tone="error">{error.message}</Banner>;
  if (loading) return <p className="text-sm text-navy/50">Loading…</p>;
  if (!data || data.top_rank_holders.length === 0) {
    return <Card className="p-8 text-center text-navy/50">No marks recorded for {term} across the school yet.</Card>;
  }

  const maxBinCount = Math.max(...data.marks_distribution.map((b) => b.count), 1);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex justify-end mb-3 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 text-xs font-semibold text-navy border border-navy/15 px-3 py-2 rounded-full hover:bg-navy/5"
          >
            <Icon name="Printer" size={14} />
            Print
          </button>
        </div>
      </div>

      <Section title="Enrollment & Result Summary">
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-navy/45 border-b border-navy/8">
                <th className="px-4 py-3">Medium</th>
                <th className="px-4 py-3">Gender</th>
                <th className="px-4 py-3 text-center">Roll</th>
                <th className="px-4 py-3 text-center">Appeared</th>
                <th className="px-4 py-3 text-center">Passed</th>
                <th className="px-4 py-3 text-center">Pass %</th>
              </tr>
            </thead>
            <tbody>
              {data.enrollment_summary.map((row, i) => (
                <tr key={i} className="border-b border-navy/6 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-navy">{row.medium}</td>
                  <td className="px-4 py-2.5 text-navy/70">{row.gender}</td>
                  <td className="px-4 py-2.5 text-center text-navy/70">{row.roll}</td>
                  <td className="px-4 py-2.5 text-center text-navy/70">{row.appeared}</td>
                  <td className="px-4 py-2.5 text-center text-navy/70">{row.passed}</td>
                  <td className="px-4 py-2.5 text-center font-semibold text-navy">
                    {row.pass_percent != null ? `${row.pass_percent}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </Section>

      <Section title="Top Rank Holders">
        <div className="grid sm:grid-cols-3 gap-4">
          {data.top_rank_holders.map((r, i) => (
            <Card key={r.student_id} className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gold text-navy-dark text-xs font-bold shrink-0">
                  {i + 1}
                </span>
                <p className="text-sm font-semibold text-navy truncate">{r.name}</p>
              </div>
              <p className="text-xs text-navy/45 mb-2">{r.registration_no} · Class {r.class_code}</p>
              <p className="text-xl font-heading font-bold text-navy mb-2">{r.percentage}%</p>
              <div className="flex flex-wrap gap-1.5">
                {r.marks.map((m) => (
                  <span key={m.subject} className="text-[11px] bg-navy/6 text-navy/70 rounded-full px-2 py-0.5">
                    {m.subject}: {m.score}/{m.max}
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Subject-wise Statistics">
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-navy/45 border-b border-navy/8">
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3 text-center">Max</th>
                <th className="px-4 py-3 text-center">Min</th>
                <th className="px-4 py-3 text-center">Average</th>
                <th className="px-4 py-3 text-center">Pass %</th>
              </tr>
            </thead>
            <tbody>
              {data.subject_stats.map((s) => (
                <tr key={s.subject} className="border-b border-navy/6 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-navy">{s.subject}</td>
                  <td className="px-4 py-2.5 text-center text-navy/70">{s.max}</td>
                  <td className="px-4 py-2.5 text-center text-navy/70">{s.min}</td>
                  <td className="px-4 py-2.5 text-center text-navy/70">{s.average}</td>
                  <td className="px-4 py-2.5 text-center font-semibold text-navy">{s.pass_percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </Section>

      <div className="grid lg:grid-cols-2 gap-6">
        <Section title="Marks Range Distribution">
          <Card className="p-5">
            <div className="flex items-end gap-2 h-40">
              {data.marks_distribution.map((bin) => (
                <div key={bin.range} className="flex-1 flex flex-col items-center gap-1.5">
                  <div
                    className="w-full bg-gold rounded-t-md"
                    style={{ height: `${(bin.count / maxBinCount) * 100}%`, minHeight: bin.count ? "4px" : "0" }}
                  />
                  <span className="text-[9px] text-navy/45 rotate-0">{bin.range}</span>
                  <span className="text-[10px] font-semibold text-navy">{bin.count}</span>
                </div>
              ))}
            </div>
          </Card>
        </Section>

        <Section title="Subjects Failed (by Gender)">
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-navy/45 border-b border-navy/8">
                  <th className="px-4 py-3">Subjects Failed</th>
                  <th className="px-4 py-3 text-center">Male</th>
                  <th className="px-4 py-3 text-center">Female</th>
                  <th className="px-4 py-3 text-center">Other</th>
                </tr>
              </thead>
              <tbody>
                {data.subjects_failed_histogram.map((row) => (
                  <tr key={row.failed_count} className="border-b border-navy/6 last:border-0">
                    <td className="px-4 py-2.5 font-medium text-navy">{row.failed_count}</td>
                    <td className="px-4 py-2.5 text-center text-navy/70">{row.male}</td>
                    <td className="px-4 py-2.5 text-center text-navy/70">{row.female}</td>
                    <td className="px-4 py-2.5 text-center text-navy/70">{row.other}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </Section>
      </div>

      {data.section_comparison.length > 0 && (
        <Section title="Section Comparison">
          <div className="flex flex-col gap-3">
            {data.section_comparison.map((row) => (
              <Card key={row.grade} className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-navy/45 mb-2">Grade {row.grade}</p>
                <div className="flex flex-wrap gap-3">
                  {row.sections.map((sec) => (
                    <div
                      key={sec.class_code}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
                        sec.class_code === row.higher ? "bg-emerald-50 text-emerald-700" : "bg-navy/5 text-navy/70"
                      }`}
                    >
                      <span className="font-semibold text-sm">{sec.class_code}</span>
                      <span className="text-sm">{sec.average_percent}%</span>
                      {sec.class_code === row.higher && <Icon name="Crown" size={13} />}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="font-heading font-bold text-navy text-sm mb-3">{title}</h3>
      {children}
    </div>
  );
}
