import Card from "../ui/Card";
import Icon from "../ui/Icon";
import Banner from "../portal/Banner";
import { useApiResource } from "../../hooks/useApiResource";
import { PASS_MARK } from "../../constants/academic";

export default function ClassMarkReport({ classCode, term }) {
  const { data, loading, error } = useApiResource(`/classes/${classCode}/mark-report`, {
    query: { term },
    enabled: Boolean(classCode && term),
    deps: [classCode, term],
  });

  if (error) return <Banner tone="error">{error.message}</Banner>;
  if (loading) return <p className="text-sm text-navy/50">Loading…</p>;
  if (!data || data.students.length === 0) return <Card className="p-8 text-center text-navy/50">No marks recorded for {term}.</Card>;

  const subjects = data.students[0].marks.map((m) => m.subject);

  return (
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
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-navy/45 border-b border-navy/8">
                <th className="px-3 py-3">#</th>
                <th className="px-3 py-3">Reg No</th>
                <th className="px-3 py-3">Name</th>
                {subjects.map((s) => (
                  <th key={s} className="px-2 py-3 text-center whitespace-nowrap">{s}</th>
                ))}
                <th className="px-3 py-3 text-center">Total</th>
                <th className="px-3 py-3 text-center">%</th>
                <th className="px-3 py-3 text-center">Result</th>
              </tr>
            </thead>
            <tbody>
              {data.students.map((row, i) => {
                const failed = row.marks.some((m) => !m.absent && m.score < (m.max * PASS_MARK) / 100);
                return (
                  <tr key={row.student_id} className="border-b border-navy/6 last:border-0">
                    <td className="px-3 py-2.5 text-navy/50">{i + 1}</td>
                    <td className="px-3 py-2.5 text-navy/70 whitespace-nowrap">{row.registration_no}</td>
                    <td className="px-3 py-2.5 font-medium text-navy whitespace-nowrap">{row.name}</td>
                    {row.marks.map((m) => (
                      <td key={m.subject} className="px-2 py-2.5 text-center">
                        {m.absent ? "AB" : m.score}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-center font-semibold text-navy">{row.total}</td>
                    <td className="px-3 py-2.5 text-center font-semibold text-navy">
                      {row.percentage != null ? `${row.percentage}%` : "—"}
                    </td>
                    <td className={`px-3 py-2.5 text-center font-semibold ${failed ? "text-red-600" : "text-emerald-600"}`}>
                      {failed ? "Fail" : "Pass"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
