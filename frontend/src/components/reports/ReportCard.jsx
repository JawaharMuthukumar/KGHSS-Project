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
const head = `${cell} font-semibold text-[10px] leading-tight`;

/**
 * One student's progress card, laid out like the school's printed தேர்ச்சி அறிக்கை.
 * Sized to fit half an A4 portrait page so two print per sheet.
 */
const ReportCard = forwardRef(function ReportCard({ meta, card }, ref) {
  return (
    <div ref={ref} className="report-card bg-white text-black border-2 border-black p-3 text-[11px]" style={{ breakInside: "avoid" }}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-11 h-11 rounded-full border-2 border-black font-bold text-[10px] leading-none text-center shrink-0">
            GHSS
            <br />
            KGP
          </span>
          <div>
            <p className="font-bold text-base leading-tight">அரசு மேல்நிலைப்பள்ளி</p>
            <p className="text-[10px]">காங்கயம்பாளையம், கோவை - 641401.</p>
            <p className="inline-block mt-1 border border-black rounded-full px-2.5 py-0.5 font-semibold text-[10px]">
              தேர்ச்சி அறிக்கை : {meta.academic_year}
            </p>
          </div>
        </div>
        <table className="text-[11px] shrink-0">
          <tbody>
            <InfoRow label="தேர்வு எண்" value={card.registration_no} />
            <InfoRow label="பெயர்" value={card.name} />
            <InfoRow label="வகுப்பு" value={meta.class_code} />
          </tbody>
        </table>
      </div>

      <table className="w-full border-collapse table-fixed">
        <colgroup>
          <col style={{ width: "17%" }} />
          {meta.subjects.map((s) => (
            <col key={s} />
          ))}
          <col />
          <col style={{ width: "11%" }} />
          <col />
          <col />
          <col />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th className={head}>தேர்வு</th>
            {meta.subjects.map((s) => (
              <th key={s} className={head}>
                {TAMIL_SUBJECT[s] || s}
                <br />
                (100)
              </th>
            ))}
            <th className={head}>
              மொத்தம்
              <br />({meta.max_total})
            </th>
            <th className={head}>தகுதி</th>
            <th className={head}>வருகை நாட்கள்</th>
            <th className={head}>வகுப்பு ஆசிரியர் கையொப்பம்</th>
            <th className={head}>வகுப்பு முதல் மதிப்பெண்</th>
            <th className={head}>பெற்றோர் கையொப்பம்</th>
          </tr>
        </thead>
        <tbody>
          {card.rows.map((r) => (
            <tr key={r.term} className="h-7">
              <td className={`${cell} text-left text-[10px] leading-tight font-semibold`}>{TAMIL_TERM[r.term] || r.term}</td>
              {r.scores.map((sc, i) => (
                <td
                  key={i}
                  className={`${cell} ${typeof sc === "number" && sc < PASS_MARK ? "text-red-600 underline decoration-2 font-bold" : ""}`}
                >
                  {sc ?? ""}
                </td>
              ))}
              <td className={`${cell} font-bold`}>{r.total ?? ""}</td>
              <td className={`${cell} text-[10px] font-semibold leading-tight`}>{r.remark ?? ""}</td>
              <td className={cell}>{r.attendance ? `${r.attendance.present}/${r.attendance.working}` : ""}</td>
              <td className={cell}></td>
              <td className={cell}>{r.total != null ? r.class_top ?? "" : ""}</td>
              <td className={cell}></td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-1.5 text-[10px]">குறிப்பு : சிவப்புக் கோடிட்ட பாடங்களில் தேர்ச்சி குறைவு, அவற்றில் கவனம் தேவை.</p>
    </div>
  );
});

export default ReportCard;

function InfoRow({ label, value }) {
  return (
    <tr>
      <td className="pr-1.5 py-0.5 whitespace-nowrap">{label}</td>
      <td className="pr-1.5 py-0.5">:</td>
      <td className="py-0.5 font-bold">{value}</td>
    </tr>
  );
}
