import { useRef } from "react";
import Card from "../ui/Card";
import Icon from "../ui/Icon";
import Banner from "../portal/Banner";
import { useApiResource } from "../../hooks/useApiResource";
import { printElement } from "../../lib/printElement";

const cell = "border border-black px-1.5 py-1 text-center";

/** Class teacher's term register: one row per student with marks, result, rank and attendance. */
export default function MyClassReport({ classCode, term }) {
  const sheet = useRef(null);
  const { data, loading, error } = useApiResource(`/classes/${classCode}/term-report`, {
    query: { term },
    enabled: Boolean(classCode && term),
    deps: [classCode, term],
  });

  if (error) return <Banner tone="error">{error.message}</Banner>;
  if (loading) return <p className="text-sm text-navy/50">Loading…</p>;
  if (!data || !data.students.some((s) => s.appeared)) return <Card className="p-8 text-center text-navy/50">No marks recorded for {term}.</Card>;

  const n = data.subjects.length;
  const totalCols = 6 + n + 8;

  return (
    <div>
      <PrintButton onClick={() => printElement(sheet.current, { title: `${data.class_code} ${term} - My Report` })} />
      <Card className="p-4 overflow-x-auto">
        <div ref={sheet} className="bg-white text-black">
          <table className="w-full border-collapse text-[11px] leading-tight">
            <thead>
              <tr>
                <th colSpan={totalCols} className={`${cell} text-sm font-bold`}>GHSS KANGAYAMPALAYAM</th>
              </tr>
              <tr>
                <th colSpan={totalCols} className={`${cell} font-bold`}>
                  {data.title} (BATCH {data.academic_year})
                </th>
              </tr>
              <tr className="font-bold">
                <td colSpan={6} className={cell}>MAX MARKS</td>
                {data.subjects.map((s) => (
                  <td key={s} className={cell}>{data.max_marks}</td>
                ))}
                <td className={cell}>{data.max_marks * n}</td>
                <td className={cell} colSpan={2}></td>
                <td className={cell}>{data.working_days ?? ""}</td>
                <td className={cell} colSpan={4}></td>
              </tr>
              <tr className="font-bold">
                <td colSpan={6} className={cell}>PASS MARKS</td>
                {data.subjects.map((s) => (
                  <td key={s} className={cell}>{data.pass_marks}</td>
                ))}
                <td className={cell}>{data.pass_marks * n}</td>
                <td className={cell} colSpan={7}></td>
              </tr>
              <tr className="font-bold">
                {["SNO", "REG NO", "NAME", "COM", "GEN", "MED", ...data.subjects, "TOT", "RES", "RANK", "TOT ATT", "% ATT", "NO SUBJS FAILED", "SUBJECTS FAILED", "NO SUBJS ABS"].map((h) => (
                  <th key={h} className={cell}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.students.map((r, i) => (
                <tr key={r.student_id}>
                  <td className={cell}>{i + 1}</td>
                  <td className={`${cell} whitespace-nowrap`}>{r.registration_no}</td>
                  <td className={`${cell} text-left whitespace-nowrap`}>{r.name}</td>
                  <td className={cell}>{r.community || ""}</td>
                  <td className={cell}>{r.gender === "O" ? "" : r.gender}</td>
                  <td className={cell}>{r.medium || ""}</td>
                  {r.scores.map((sc, j) => (
                    <td key={j} className={cell}>{sc ?? "-"}</td>
                  ))}
                  <td className={`${cell} font-bold`}>{r.total ?? ""}</td>
                  <td className={`${cell} font-bold`}>{r.appeared ? (r.passed ? "P" : "F") : "AB"}</td>
                  <td className={`${cell} font-bold`}>{r.rank ?? ""}</td>
                  <td className={cell}>{r.attended_days ?? ""}</td>
                  <td className={cell}>{r.attendance_percent != null ? `${r.attendance_percent.toFixed(2)}%` : ""}</td>
                  <td className={cell}>{r.failed_subjects.length}</td>
                  <td className={`${cell} whitespace-nowrap`}>{r.failed_subjects.join(" ")}</td>
                  <td className={cell}>{r.absent_subjects.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export function PrintButton({ onClick }) {
  return (
    <div className="flex justify-end mb-3">
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-1.5 text-xs font-semibold text-navy border border-navy/15 px-3 py-2 rounded-full hover:bg-navy/5"
      >
        <Icon name="Printer" size={14} />
        Print
      </button>
    </div>
  );
}
