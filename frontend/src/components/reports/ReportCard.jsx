import { forwardRef } from "react";

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
  "Term 1": "முதல் இடைப்பருவத் தேர்வு",
  Quarterly: "காலாண்டுத் தேர்வு",
  "Term 2": "இரண்டாம் இடைப்பருவத் தேர்வு",
  "Half Yearly": "அரையாண்டுத் தேர்வு",
  "Term 3": "மூன்றாம் இடைப்பருவத் தேர்வு",
  "Annual Exam": "முழு ஆண்டுத் தேர்வு",
  "1st Mid Term": "முதல் இடைப்பருவத் தேர்வு",
  "2nd Mid Term": "இரண்டாம் இடைப்பருவத் தேர்வு",
  "Revision 1": "முதல் திருப்புதல் தேர்வு",
  "Revision 2": "இரண்டாம் திருப்புதல் தேர்வு",
  "Revision 3": "மூன்றாம் திருப்புதல் தேர்வு",
};

const PASS_MARK = 35;
const cell = "border border-black px-1 py-1 text-center align-middle";
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
function Score({ value }) {
  if (typeof value !== "number" || value >= PASS_MARK) return value ?? "";
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
  return (
    <div ref={ref} className="report-card bg-white text-black border-2 border-black p-3 text-[11px]" style={{ breakInside: "avoid", ...printExact }}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex items-center justify-center w-11 h-11 rounded-full border-2 border-black font-bold text-[10px] leading-none text-center shrink-0">
            GHSS
            <br />
            KGP
          </span>
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

      <table className="w-full border-collapse table-fixed">
        <colgroup>
          <col style={{ width: "17%" }} />
          {meta.subjects.map((s) => (
            <col key={s} />
          ))}
          <col style={{ width: "6.5%" }} />
          <col style={{ width: "7.5%" }} />
          <col style={{ width: "6.5%" }} />
          <col style={{ width: "7.5%" }} />
          <col style={{ width: "7%" }} />
          <col style={{ width: "7%" }} />
        </colgroup>
        <thead>
          <tr>
            <th className={head}>
              <Bi ta="தேர்வு" en="Exam" nowrap />
            </th>
            {meta.subjects.map((s) => (
              <th key={s} className={head}>
                <Bi ta={TAMIL_SUBJECT[s] || s} en={s} extra="(100)" nowrap />
              </th>
            ))}
            <th className={head}>
              <Bi ta="மொத்தம்" en="Total" extra={`(${meta.max_total})`} nowrap />
            </th>
            <th className={head}>
              <Bi ta="தகுதி" en="Result" nowrap />
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
          {card.rows.map((r) => (
            <tr key={r.term} className="h-8">
              <td className={`${cell} text-left leading-tight font-semibold ${noSplit}`}>
                <span className="block text-[10px] whitespace-nowrap print:whitespace-normal">{TAMIL_TERM[r.term] || r.term}</span>
                <span className="block text-[8.5px] font-normal text-black/70">{r.term}</span>
              </td>
              {r.scores.map((sc, i) => (
                <td key={i} className={cell}>
                  <Score value={sc} />
                </td>
              ))}
              <td className={`${cell} font-bold`}>{r.total ?? ""}</td>
              <td className={`${cell} text-[10px] font-semibold leading-tight ${noSplit}`}>{r.remark ?? ""}</td>
              <td className={cell}>{r.attendance ? `${r.attendance.present}/${r.attendance.working}` : ""}</td>
              <td className={cell}></td>
              <td className={cell}>{r.total != null ? r.class_top ?? "" : ""}</td>
              <td className={cell}></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-1.5 flex items-start gap-1.5 text-[10px] leading-snug">
        <span
          style={printExact}
          className="inline-flex items-center justify-center w-4 h-4 mt-px rounded-full border-2 border-red-600 bg-red-50 shrink-0"
        />
        <p>
          குறிப்பு : வட்டமிட்ட மதிப்பெண்கள் தேர்ச்சி மதிப்பெண்ணுக்கு ({PASS_MARK}) குறைவு, அந்தப் பாடங்களில் கவனம் தேவை.
          <br />
          Note: Circled marks are below the pass mark ({PASS_MARK}); those subjects need attention.
        </p>
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
