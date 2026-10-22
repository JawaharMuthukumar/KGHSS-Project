import { useRef } from "react";
import Card from "../ui/Card";
import Banner from "../portal/Banner";
import { useApiResource } from "../../hooks/useApiResource";
import { PASS_MARK } from "../../constants/academic";
import { ContentSkeleton } from "../ui/Skeleton";
import { printElement } from "../../lib/printElement";
import { PrintButton } from "./MyClassReport";

export default function ClassMarkReport({ classCode, term }) {
  const sheet = useRef(null);
  const { data, loading, error } = useApiResource(`/classes/${classCode}/mark-report`, {
    query: { term },
    enabled: Boolean(classCode && term),
    deps: [classCode, term],
  });

  if (error) return <Banner tone="error">{error.message}</Banner>;
  if (loading) return <ContentSkeleton rows={4} />;
  if (!data || data.students.length === 0) return <Card className="p-8 text-center text-navy/50">No marks recorded for {term}.</Card>;

  // Columns follow the report card's subject order (from the API); each row is matched by subject name.
  const subjects = data.subjects?.length ? data.subjects : data.students[0].marks.map((m) => m.subject);

  return (
    <div>
      <PrintButton onClick={() => printElement(sheet.current, { title: `${data.class_code} ${term} - Class Mark Report` })} />
      <Card className="p-0 overflow-hidden">
        {/* Only this element is printed (light, landscape), without the portal header, tabs or menus. */}
        <div ref={sheet} className="overflow-x-auto print:overflow-visible">
          <div className="hidden print:block text-center text-navy mb-3">
            <p className="font-heading font-bold text-base">Government Higher Secondary School, Kangayampalayam</p>
            <p className="text-sm font-semibold">
              Class Mark Report — Class {data.class_code} — {term}
            </p>
          </div>
          <table className="w-full text-sm print:text-xs">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-navy/45 print:text-navy border-b border-navy/8 print:border-navy/40">
                <th className="px-3 py-3 print:py-1.5">#</th>
                <th className="px-3 py-3 print:py-1.5">Reg No</th>
                <th className="px-3 py-3 print:py-1.5">Name</th>
                {subjects.map((s) => (
                  <th key={s} className="px-2 py-3 print:py-1.5 text-center whitespace-nowrap">{s}</th>
                ))}
                <th className="px-3 py-3 print:py-1.5 text-center">Total</th>
                <th className="px-3 py-3 print:py-1.5 text-center">%</th>
                <th className="px-3 py-3 print:py-1.5 text-center">Result</th>
              </tr>
            </thead>
            <tbody>
              {data.students.map((row, i) => {
                const bySubject = Object.fromEntries(row.marks.map((m) => [m.subject, m]));
                const failed = row.marks.some((m) => !m.absent && m.score < (m.max * PASS_MARK) / 100);
                return (
                  <tr key={row.student_id} className="border-b border-navy/6 print:border-navy/20 last:border-0 break-inside-avoid">
                    <td className="px-3 py-2.5 print:py-1 text-navy/50">{i + 1}</td>
                    <td className="px-3 py-2.5 print:py-1 text-navy/70 whitespace-nowrap">{row.registration_no}</td>
                    <td className="px-3 py-2.5 print:py-1 font-medium text-navy whitespace-nowrap">{row.name}</td>
                    {subjects.map((s) => {
                      const m = bySubject[s];
                      return (
                        <td key={s} className="px-2 py-2.5 print:py-1 text-center">
                          {!m ? "—" : m.absent ? "AB" : m.score}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5 print:py-1 text-center font-semibold text-navy">{row.total}</td>
                    <td className="px-3 py-2.5 print:py-1 text-center font-semibold text-navy">
                      {row.percentage != null ? `${row.percentage}%` : "—"}
                    </td>
                    <td className={`px-3 py-2.5 print:py-1 text-center font-semibold ${failed ? "text-red-600" : "text-emerald-600"}`}>
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
