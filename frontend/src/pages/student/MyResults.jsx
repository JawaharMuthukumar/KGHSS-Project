import { useEffect, useMemo, useRef, useState } from "react";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import Banner from "../../components/portal/Banner";
import { useApiResource } from "../../hooks/useApiResource";
import { api } from "../../lib/apiClient";
import { ALL_EXAM_TERMS, PASS_MARK } from "../../constants/academic";
import { ContentSkeleton } from "../../components/ui/Skeleton";
import Icon from "../../components/ui/Icon";
import ReportCard from "../../components/reports/ReportCard";
import { printElement } from "../../lib/printElement";

const componentAbbr = { sa: "SA", fa: "FA", theory: "Th", practical: "Pr", internal: "In" };

export default function MyResults() {
  const { data: profile } = useApiResource("/students/me/profile");
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [reportCard, setReportCard] = useState(null);
  const cardRef = useRef(null);

  useEffect(() => {
    if (!profile?.id) return;
    api
      .get(`/students/${profile.id}/results`)
      .then(setResults)
      .catch((err) => setError(err.message));
    api
      .get(`/students/${profile.id}/report-card`)
      .then(setReportCard)
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
        actions={
          reportCard && (
            <button
              type="button"
              // The browser print dialog offers "Save as PDF" for downloading.
              onClick={() => printElement(cardRef.current, { orientation: "portrait", title: `${reportCard.card.name} - Report Card` })}
              className="flex items-center gap-1.5 bg-gold text-navy-dark font-semibold text-sm px-4 py-2.5 rounded-full hover:bg-gold-light transition-colors"
            >
              <Icon name="Download" size={16} />
              Download Report Card
            </button>
          )
        }
      />

      {error && <Banner tone="error" className="mb-4">{error}</Banner>}
      {!results && !error && <ContentSkeleton rows={4} />}

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

      {reportCard && (
        <div className="mt-8">
          <h2 className="font-heading font-bold text-navy text-lg mb-3">Report Card</h2>
          <Card className="p-4 overflow-x-auto">
            <div className="min-w-[720px]">
              <ReportCard ref={cardRef} meta={reportCard} card={reportCard.card} />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
