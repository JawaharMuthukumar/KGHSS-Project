import { useEffect, useMemo, useState } from "react";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import Banner from "../../components/portal/Banner";
import { useApiResource } from "../../hooks/useApiResource";
import { api } from "../../lib/apiClient";
import { ALL_EXAM_TERMS, PASS_MARK } from "../../constants/academic";

const componentAbbr = { sa: "SA", fa: "FA", theory: "Th", practical: "Pr", internal: "In" };

export default function MyResults() {
  const { data: profile } = useApiResource("/students/me/profile");
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!profile?.id) return;
    api
      .get(`/students/${profile.id}/results`)
      .then(setResults)
      .catch((err) => setError(err.message));
  }, [profile?.id]);

  const { subjects, terms, matrix } = useMemo(() => {
    const rows = results?.results || [];
    const subjectSet = new Set(rows.map((r) => r.subject));
    const termSet = new Set(rows.map((r) => r.term));
    const orderedTerms = [...ALL_EXAM_TERMS.filter((t) => termSet.has(t)), ...[...termSet].filter((t) => !ALL_EXAM_TERMS.includes(t))];
    const map = {};
    rows.forEach((r) => {
      map[`${r.subject}__${r.term}`] = r;
    });
    return { subjects: [...subjectSet].sort(), terms: orderedTerms, matrix: map };
  }, [results]);

  return (
    <div>
      <PortalPageHeader
        title="Results / Marksheet"
        description={results ? `Overall Average: ${results.average_percent != null ? `${results.average_percent}%` : "—"}` : undefined}
      />

      {error && <Banner tone="error" className="mb-4">{error}</Banner>}
      {!results && !error && <p className="text-sm text-navy/50">Loading…</p>}

      {results && results.results.length === 0 && (
        <Card className="p-8 text-center text-navy/50">No marks recorded yet.</Card>
      )}

      {results && results.results.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-navy/45 border-b border-navy/8">
                  <th className="px-4 py-3 sticky left-0 bg-white">Subject</th>
                  {terms.map((term) => (
                    <th key={term} className="px-3 py-3 text-center whitespace-nowrap">
                      {term}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subjects.map((subject) => (
                  <tr key={subject} className="border-b border-navy/6 last:border-0">
                    <td className="px-4 py-2.5 sticky left-0 bg-white font-medium text-navy whitespace-nowrap">{subject}</td>
                    {terms.map((term) => {
                      const cell = matrix[`${subject}__${term}`];
                      if (!cell) return <td key={term} className="px-3 py-2.5 text-center text-navy/20">—</td>;
                      const fail = !cell.absent && cell.score < (cell.max * PASS_MARK) / 100;
                      return (
                        <td key={term} className={`px-3 py-2.5 text-center font-semibold ${cell.absent ? "text-navy/40" : fail ? "text-red-600" : "text-navy"}`}>
                          {cell.absent ? "AB" : `${cell.score}/${cell.max}`}
                          {!cell.absent && Object.keys(cell.components || {}).length > 1 && (
                            <span className="block text-[10px] font-normal text-navy/45 whitespace-nowrap">
                              {Object.entries(cell.components)
                                .map(([key, value]) => `${componentAbbr[key] || key} ${value}`)
                                .join(" · ")}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
