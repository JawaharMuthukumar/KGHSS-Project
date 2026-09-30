import Card from "../ui/Card";
import Banner from "../portal/Banner";
import { useApiResource } from "../../hooks/useApiResource";

const medalTone = ["bg-gold text-navy-dark", "bg-navy/15 text-navy", "bg-amber-700/20 text-amber-800"];

export default function ClassScorecard({ classCode, term }) {
  const { data, loading, error } = useApiResource(`/classes/${classCode}/scorecard`, {
    query: { term },
    enabled: Boolean(classCode && term),
    deps: [classCode, term],
  });

  if (error) return <Banner tone="error">{error.message}</Banner>;
  if (loading) return <p className="text-sm text-navy/50">Loading…</p>;
  if (!data || data.length === 0) return <Card className="p-8 text-center text-navy/50">No marks recorded for {term}.</Card>;

  const avg = Math.round(data.reduce((sum, r) => sum + r.percentage, 0) / data.length);
  const passCount = data.filter((r) => r.percentage >= 35).length;

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-5">
        <Card className="p-4 text-center">
          <p className="text-2xl font-heading font-bold text-navy">{avg}%</p>
          <p className="text-xs text-navy/50 mt-1">Class Average</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-heading font-bold text-navy">{Math.round((passCount * 100) / data.length)}%</p>
          <p className="text-xs text-navy/50 mt-1">Pass Rate</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-heading font-bold text-navy">{data.length}</p>
          <p className="text-xs text-navy/50 mt-1">Students with Marks</p>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-heading font-bold text-navy text-sm mb-4">Top Rank Holders</h3>
        <div className="flex flex-col gap-2">
          {data.slice(0, 5).map((row, i) => (
            <div key={row.student_id} className="flex items-center gap-3 py-2 border-b border-navy/6 last:border-0">
              <span className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${medalTone[i] || "bg-navy/6 text-navy/50"}`}>
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-navy truncate">{row.name}</p>
                <p className="text-xs text-navy/45">{row.registration_no}</p>
              </div>
              <p className="text-sm font-semibold text-navy shrink-0">{row.percentage}%</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
