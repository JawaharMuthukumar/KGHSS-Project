import { useRef } from "react";
import Card from "../ui/Card";
import Banner from "../portal/Banner";
import { useApiResource } from "../../hooks/useApiResource";
import { printElement } from "../../lib/printElement";
import { PrintButton } from "./MyClassReport";
import { ContentSkeleton } from "../ui/Skeleton";

const cell = "border border-black px-1.5 py-1 text-center";
const title = `${cell} font-bold tracking-[0.2em]`;
const pct = (v) => (v == null ? "" : `${v}%`);
const num = (v) => (v == null ? "" : v);

/** HM's one-page result summary for a single class (only that class's medium). */
export default function HmClassReport({ classCode, term }) {
  const sheet = useRef(null);
  const { data, loading, error } = useApiResource(`/classes/${classCode}/term-report`, {
    query: { term },
    enabled: Boolean(classCode && term),
    deps: [classCode, term],
  });

  if (error) return <Banner tone="error">{error.message}</Banner>;
  if (loading) return <ContentSkeleton rows={4} />;
  if (!data || !data.students.some((s) => s.appeared)) return <Card className="p-8 text-center text-navy/50">No marks recorded for {term}.</Card>;

  const hm = data.hm;
  const failedKeys = Object.keys(hm.failed_counts);

  return (
    <div>
      <PrintButton onClick={() => printElement(sheet.current, { title: `${data.class_code} ${term} - HM Report` })} />
      <Card className="p-4 overflow-x-auto">
        <div ref={sheet} className="bg-white text-black text-[11px] leading-tight">
          <p className="text-center font-bold text-sm mb-3">
            GHSS KANGAYAMPALAYAM — {data.title} (BATCH {data.academic_year}) — {data.term}
          </p>
          {/* minmax(0,1fr): each half keeps its width, so a wide table (11th–12th have 6 subjects + TOT) wraps
              inside its half instead of spilling over the other one */}
          <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-4 items-start min-w-[900px]">
            <div className="flex flex-col gap-4 min-w-0">
              {/* Roll / appeared / passed by gender for this class's medium */}
              <table className="w-full border-collapse">
                <thead>
                  <tr className="font-bold">
                    <th className={cell} rowSpan={2}></th>
                    {["ROLL", "APPD", "PASSD", "% OF PASS"].map((h) => (
                      <th key={h} colSpan={3} className={cell}>{h}</th>
                    ))}
                  </tr>
                  <tr className="font-bold">
                    {[0, 1, 2, 3].flatMap((g) => ["M", "F", "TOT"].map((k) => <th key={`${g}${k}`} className={cell}>{k}</th>))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={`${cell} font-bold`}>{hm.medium}</td>
                    {["roll", "appeared", "passed"].flatMap((key) =>
                      ["M", "F", "TOT"].map((k) => <td key={`${key}${k}`} className={cell}>{hm[key][k]}</td>)
                    )}
                    {["M", "F", "TOT"].map((k) => (
                      <td key={`p${k}`} className={`${cell} font-bold`}>{pct(hm.pass_percent[k])}</td>
                    ))}
                  </tr>
                </tbody>
              </table>

              {/* Toppers */}
              <table className="w-full border-collapse table-fixed">
                <colgroup>
                  <col className="w-9" />
                  {hm.toppers.map((t) => <col key={t.subject} />)}
                </colgroup>
                <tbody>
                  <tr><td colSpan={hm.toppers.length + 1} className={title}>CLASS TOPPERS</td></tr>
                  <tr className="font-bold">
                    <td className={cell}>SUB</td>
                    {hm.toppers.map((t) => <td key={t.subject} className={cell}>{t.subject}</td>)}
                  </tr>
                  <tr>
                    <td className={cell}></td>
                    {hm.toppers.map((t) => <td key={t.subject} className={`${cell} font-bold`}>{num(t.mark)}</td>)}
                  </tr>
                  <tr>
                    <td className={cell}></td>
                    {hm.toppers.map((t) => (
                      // One name per line; a word only breaks if a single name is wider than its column
                      <td key={t.subject} className={`${cell} !px-0.5 text-[9px] tracking-tight break-words align-top`}>
                        {t.names.map((n) => (
                          <span key={n} className="block">{n}</span>
                        ))}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>

              {/* Students by number of subjects failed */}
              <table className="w-full border-collapse">
                <tbody>
                  <tr>
                    <td colSpan={failedKeys.length} className={title}>NO SUBJS FAILED</td>
                    {["NO PASSD", "TOT NO FAILD", "NO ABS", "NO ROLL"].map((h) => (
                      <td key={h} rowSpan={2} className={`${cell} font-bold text-[10px]`}>{h}</td>
                    ))}
                  </tr>
                  <tr className="font-bold">
                    {failedKeys.map((k) => <td key={k} className={cell}>{k}</td>)}
                  </tr>
                  <tr>
                    {failedKeys.map((k) => <td key={k} className={cell}>{hm.failed_counts[k]}</td>)}
                    <td className={`${cell} font-bold`}>{hm.passed.TOT}</td>
                    <td className={`${cell} font-bold`}>{hm.total_failed}</td>
                    <td className={`${cell} font-bold`}>{hm.absent}</td>
                    <td className={`${cell} font-bold`}>{hm.roll.TOT}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-4 min-w-0">
              {/* Subject-wise result */}
              <table className="w-full border-collapse">
                <tbody>
                  <tr><td colSpan={hm.subject_result.length + 1} className={title}>SCHOOL RESULT</td></tr>
                  <tr className="font-bold">
                    <td className={cell}>SUB</td>
                    {hm.subject_result.map((s) => <td key={s.subject} className={cell}>{s.subject}</td>)}
                  </tr>
                  {[
                    ["MAX", (s) => num(s.max)],
                    ["MIN", (s) => num(s.min)],
                    ["AVG MARKS", (s) => (s.average == null ? "" : s.average.toFixed(2))],
                    ["APPD", (s) => s.appeared],
                    ["PASSD", (s) => s.passed],
                    ["% OF PASS", (s) => pct(s.pass_percent)],
                  ].map(([label, fn]) => (
                    <tr key={label}>
                      <td className={`${cell} font-bold whitespace-nowrap`}>{label}</td>
                      {hm.subject_result.map((s) => <td key={s.subject} className={cell}>{fn(s)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Marks range on the grand total */}
              <table className="w-full border-collapse">
                <tbody>
                  <tr><td colSpan={3} className={title}>MARKS RANGE</td></tr>
                  <tr className="font-bold">
                    <td className={cell}>BINS</td>
                    <td className={cell}></td>
                    <td className={cell}></td>
                  </tr>
                  {hm.ranges.map((r) => (
                    <tr key={r.label}>
                      <td className={`${cell} font-bold`}>{r.bin}</td>
                      <td className={cell}>{r.label}</td>
                      <td className={cell}>{r.count}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className={cell}></td>
                    <td className={`${cell} font-bold`}>NO. ABSENT</td>
                    <td className={cell}>{hm.absent}</td>
                  </tr>
                  <tr>
                    <td className={cell}></td>
                    <td className={`${cell} font-bold`}>TOTAL</td>
                    <td className={`${cell} font-bold`}>{hm.roll.TOT}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
