import { forwardRef } from "react";
import { SCHOOL_LOGO, SCHOOL_LOGO_ALT, TN_GOVT_LOGO, TN_GOVT_LOGO_ALT } from "../../constants/brand";

const TAMIL_SUBJECT = {
  Tamil: "தமிழ்",
  English: "ஆங்கிலம்",
  Maths: "கணிதம்",
  Science: "அறிவியல்",
  "Social Science": "சமூக அறிவியல்",
  Physics: "இயற்பியல்",
  Chemistry: "வேதியியல்",
  Biology: "உயிரியல்",
  "Computer Science": "கணினி அறிவியல்",
};

const TAMIL_TERM = {
  Quarterly: "காலாண்டுத் தேர்வு",
  "Half Yearly": "அரையாண்டுத் தேர்வு",
  "Annual Exam": "முழு ஆண்டுத் தேர்வு",
  "1st Mid Term": "முதல் இடைப்பருவத் தேர்வு",
  "2nd Mid Term": "இரண்டாம் இடைப்பருவத் தேர்வு",
  "3rd Mid Term": "மூன்றாம் இடைப்பருவத் தேர்வு",
  "Revision 1": "முதல் திருப்புதல் தேர்வு",
  "Revision 2": "இரண்டாம் திருப்புதல் தேர்வு",
  "Revision 3": "மூன்றாம் திருப்புதல் தேர்வு",
};

const PASS_MARK = 35;
// Split-mark parts shown under a subject's total (e.g. "T64 · P25")
const PART_SHORT = { theory: "T", practical: "P", internal: "I", sa: "SA", fa: "FA" };
// Paper-card order: the smaller assessed parts first, theory last (10 | 90, 10 | 20 | 70, 25 | 75)
const PART_ORDER = ["internal", "practical", "fa", "sa", "theory"];
const orderParts = (parts) => [...parts].sort((a, b) => PART_ORDER.indexOf(a.key) - PART_ORDER.indexOf(b.key));
const PART_NAMES = {
  theory: "கோட்பாடு / Theory",
  practical: "செய்முறை / Practical",
  internal: "அக மதிப்பீடு / Internal",
  sa: "SA",
  fa: "FA",
};
// Printed two per A4 portrait sheet: rows are a little tighter on paper so both cards always fit one page.
const cell = "border border-black px-1 py-1 print:py-0.5 text-center align-middle";
// Tamil words must never split mid-word: wrap only at spaces, and balance multi-word labels so no
// single word dangles on its own line.
const noSplit = "[word-break:keep-all] [overflow-wrap:normal] [text-wrap:balance]";
const head = `${cell} font-semibold leading-tight ${noSplit}`;
// Keep the red circles when printed.
const printExact = { WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" };

/** Tamil label with its English name underneath. */
function Bi({ ta, en, extra, nowrap = false }) {
  return (
    <span className="block">
      <span className={`block text-[10px] ${nowrap ? "whitespace-nowrap print:whitespace-normal" : ""}`}>{ta}</span>
      <span className="block text-[8.5px] font-normal text-black/70">{en}</span>
      {extra && <span className="block text-[9px] font-normal">{extra}</span>}
    </span>
  );
}

/** A failing mark is circled in red (and tinted) so it stands out on screen and on paper. */
function Score({ value, passMark = PASS_MARK }) {
  if (typeof value !== "number" || value >= passMark) return value ?? "";
  return (
    <span
      title="Below pass mark"
      style={printExact}
      className="inline-flex items-center justify-center min-w-[1.6rem] h-[1.6rem] px-0.5 rounded-full border-2 border-red-600 bg-red-50 text-red-700 font-bold"
    >
      {value}
    </span>
  );
}

/**
 * One student's progress card, laid out like the school's printed தேர்ச்சி அறிக்கை, in Tamil with
 * English alongside. Sized to fit half an A4 portrait page so two print per sheet.
 */
const ReportCard = forwardRef(function ReportCard({ meta, card }, ref) {
  // Each exam row carries its own pass mark (single marks); 11th–12th split exams pass on Theory alone (15/70, 25/90).
  // The note lists every pass mark the card uses.
  const passMarks = [
    ...new Set([
      ...card.rows.filter((r) => r.scores.some((_, i) => !r.splits?.[i])).map((r) => String(r.pass_mark ?? PASS_MARK)),
      ...card.rows.flatMap((r) => (r.splits || []).flatMap((s) => (s || []).filter((p) => p.pass_mark != null).map((p) => `Theory ${p.pass_mark}/${p.max}`))),
    ]),
  ].join(" / ");
  // Which split parts appear on this card (for the T / P / I key under the table)
  const usedParts = [...new Set(card.rows.flatMap((r) => (r.splits || []).flatMap((s) => (s || []).map((p) => p.key))))].filter((k) => PART_SHORT[k]);
  const hasSplits = usedParts.length > 0;
  // Like the school's paper card: a subject with split marks gets one box per part (Internal | Practical | Theory)
  // in the exams that split it; exams without a split use one box across the subject.
  const colsPer = meta.subjects.map((_, i) => Math.max(1, ...card.rows.map((r) => r.splits?.[i]?.length || 0)));
  const firstSplitRow = meta.subjects.map((_, i) => card.rows.findIndex((r) => r.splits?.[i]));
  return (
    <div ref={ref} className="report-card bg-white text-black border-2 border-black p-3 print:p-2 text-[11px]" style={{ breakInside: "avoid", ...printExact }}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <img src={SCHOOL_LOGO} alt={SCHOOL_LOGO_ALT} className="w-12 h-12 print:w-10 print:h-10 object-contain shrink-0" />
          <img src={TN_GOVT_LOGO} alt={TN_GOVT_LOGO_ALT} className="w-11 h-12 print:w-9 print:h-10 object-contain shrink-0" />
          <div className="min-w-0">
            <p className="font-bold text-base leading-tight">அரசு மேல்நிலைப்பள்ளி</p>
            <p className="font-semibold text-[11px] leading-tight">Government Higher Secondary School</p>
            <p className="text-[10px] leading-tight">காங்கயம்பாளையம், கோவை - 641401 · Kangayampalayam, Coimbatore</p>
            <p className="inline-block mt-1 border border-black rounded-full px-2.5 py-0.5 font-semibold text-[10px]">
              தேர்ச்சி அறிக்கை / Progress Report : {meta.academic_year}
            </p>
          </div>
        </div>
        <table className="text-[11px] shrink-0">
          <tbody>
            <InfoRow label="தேர்வு எண்" en="Reg. No" value={card.registration_no} />
            <InfoRow label="பெயர்" en="Name" value={card.name} />
            <InfoRow label="வகுப்பு" en="Class" value={meta.class_code} />
          </tbody>
        </table>
      </div>

      {/* Auto layout: the colgroup widths are targets, but a column grows to fit its longest
          (unbreakable) Tamil word instead of letting text spill over the cell border. */}
      <table className="w-full border-collapse table-auto">
        <colgroup>
          <col style={{ width: "18%" }} />
          {meta.subjects.flatMap((s, i) => Array.from({ length: colsPer[i] }, (_, k) => <col key={`${s}-${k}`} />))}
          <col style={{ width: "6%" }} />
          <col style={{ width: "7%" }} />
          <col style={{ width: "6.5%" }} />
          <col style={{ width: "8.5%" }} />
          <col style={{ width: "7%" }} />
          <col style={{ width: "8.5%" }} />
        </colgroup>
        <thead>
          <tr>
            <th className={head}>
              <Bi ta="தேர்வு" en="Exam" nowrap />
            </th>
            {meta.subjects.map((s, i) => (
              <th key={s} colSpan={colsPer[i]} className={head}>
                <Bi ta={TAMIL_SUBJECT[s] || s} en={s} extra="(100)" nowrap />
              </th>
            ))}
            <th className={head}>
              <Bi ta="மொத்தம்" en="Total" extra={`(${meta.max_total})`} nowrap />
            </th>
            <th className={head}>
              <Bi ta="தரம்" en="Rank" nowrap />
            </th>
            <th className={head}>
              <Bi ta="வருகை நாட்கள்" en="Attendance" />
            </th>
            <th className={head}>
              <Bi ta="வகுப்பு ஆசிரியர் கையொப்பம்" en="Class Teacher Sign" />
            </th>
            <th className={head}>
              <Bi ta="வகுப்பு முதல் மதிப்பெண்" en="Class Top" />
            </th>
            <th className={head}>
              <Bi ta="பெற்றோர் கையொப்பம்" en="Parent Sign" />
            </th>
          </tr>
        </thead>
        <tbody>
          {card.rows.map((r, rowIndex) => (
            <tr key={r.term} className="h-8">
              <td className={`${cell} text-left leading-tight font-semibold ${noSplit}`}>
                <span className="block text-[10px] whitespace-nowrap print:whitespace-normal">{TAMIL_TERM[r.term] || r.term}</span>
                <span className="block text-[8.5px] font-normal text-black/70">
                  {r.term}
                  {r.subject_max && r.subject_max !== 100 ? ` (/${r.subject_max})` : ""}
                </span>
              </td>
              {r.scores.flatMap((sc, i) => {
                const split = r.splits?.[i];
                if (!split) {
                  return [
                    <td key={i} colSpan={colsPer[i]} className={cell}>
                      <Score value={sc} passMark={r.pass_mark} />
                    </td>,
                  ];
                }
                // One box per part; the first split row also shows each box's max (e.g. I10 | T90), as on the paper card.
                // Only Theory has a pass mark (sent as pass_mark); Practical and Internal are never circled.
                const parts = orderParts(split);
                return parts.map((p, k) => (
                  <td
                    key={`${i}-${p.key}`}
                    colSpan={k === parts.length - 1 ? colsPer[i] - parts.length + 1 : 1}
                    title={`${p.label} ${p.value ?? "-"}/${p.max}`}
                    className={`${cell} !px-0.5`}
                  >
                    {firstSplitRow[i] === rowIndex && (
                      <span className="block -mt-0.5 mb-0.5 border-b border-black/60 text-[8px] font-semibold leading-tight text-black/70 whitespace-nowrap">
                        {PART_SHORT[p.key] || p.label[0]}
                        {p.max}
                      </span>
                    )}
                    {p.pass_mark != null && p.value != null && p.value < p.pass_mark ? (
                      // Theory below its pass mark: circled in red, like a failed single mark
                      <span
                        style={printExact}
                        className="inline-flex items-center justify-center min-w-[1.35rem] h-[1.35rem] px-0.5 rounded-full border-2 border-red-600 bg-red-50 text-red-700 font-bold text-[10px]"
                      >
                        {p.value}
                      </span>
                    ) : (
                      p.value ?? ""
                    )}
                  </td>
                ));
              })}
              <td className={`${cell} font-bold`}>{r.total ?? ""}</td>
              {/* Class rank in this exam (only students who passed every subject are ranked) */}
              <td className={`${cell} font-bold`}>{r.rank ?? ""}</td>
              <td className={cell}>{r.attendance ? `${r.attendance.present}/${r.attendance.working}` : ""}</td>
              {/* Class teacher's digital signature, once they have signed this exam's report cards */}
              <td className={`${cell} !p-0.5`}>
                {meta.signatures?.[r.term] && (
                  <img src={meta.signatures[r.term]} alt="Class teacher signature" className="block mx-auto max-h-7 max-w-full object-contain" />
                )}
              </td>
              <td className={cell}>{r.total != null ? r.class_top ?? "" : ""}</td>
              <td className={cell}></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-1.5 flex items-start gap-1.5 text-[10px] leading-snug">
        <div className="flex items-start gap-1.5 flex-1 min-w-0">
        <span
          style={printExact}
          className="inline-flex items-center justify-center w-4 h-4 mt-px rounded-full border-2 border-red-600 bg-red-50 shrink-0"
        />
        <p>
          குறிப்பு : வட்டமிட்ட மதிப்பெண்கள் தேர்ச்சி மதிப்பெண்ணுக்கு ({passMarks}) குறைவு, அந்தப் பாடங்களில் கவனம் தேவை.
          <br />
          Note: Circled marks are below the pass mark ({passMarks}); those subjects need attention.
          {hasSplits && (
            <>
              <br />
              {usedParts.map((k) => `${PART_SHORT[k]} = ${PART_NAMES[k]}`).join(" · ")}
            </>
          )}
        </p>
        </div>
        {/* Head Master's signature (green ink, no date); blank space to sign by hand when none is saved */}
        <div className="shrink-0 w-36 text-center">
          <div className="h-9 flex items-end justify-center">
            {meta.hm_signature && <img src={meta.hm_signature} alt="Head Master signature" className="max-h-9 max-w-full object-contain" style={printExact} />}
          </div>
          <p className="border-t border-black/60 pt-0.5 font-semibold leading-tight">
            தலைமையாசிரியர் <span className="block text-[8.5px] font-normal text-black/70">Head Master</span>
          </p>
        </div>
      </div>
    </div>
  );
});

export default ReportCard;

function InfoRow({ label, en, value }) {
  return (
    <tr>
      <td className="pr-1.5 py-0.5 whitespace-nowrap">
        {label} <span className="text-[9px] text-black/60">/ {en}</span>
      </td>
      <td className="pr-1.5 py-0.5">:</td>
      <td className="py-0.5 font-bold">{value}</td>
    </tr>
  );
}
