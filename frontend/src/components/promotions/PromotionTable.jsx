import Badge from "../ui/Badge";
import { inputClass } from "../portal/FormField";
import { DECISIONS, classOptionLabel } from "../../constants/promotion";

/** Count of each decision in a list of student rows. */
export function countDecisions(rows) {
  const counts = { promoted: 0, not_promoted: 0, left: 0, passed_out: 0 };
  rows.forEach((r) => (counts[r.decision] += 1));
  return counts;
}

export function DecisionCounts({ counts, className = "" }) {
  const shown = Object.entries(DECISIONS).filter(([key]) => counts[key]);
  if (!shown.length) return null;
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {shown.map(([key, d]) => (
        <Badge key={key} tone={d.tone}>
          {d.short} · {counts[key]}
        </Badge>
      ))}
    </div>
  );
}

/**
 * Students with their year-end decision and next class. Editable for the class teacher; read-only for the HM.
 * `onChange(studentId, patch)` receives `{ decision }` or `{ target_class_code }`.
 */
export default function PromotionTable({ students, options, allowedDecisions, editable = false, onChange }) {
  const optionByCode = Object.fromEntries(options.map((o) => [o.code, o]));
  return (
    <table className="table-cards w-full text-sm">
      <thead>
        <tr className="text-left text-xs font-semibold uppercase tracking-wide text-navy/45 border-b border-navy/8">
          <th className="px-4 py-3">#</th>
          <th className="px-4 py-3">Student</th>
          <th className="px-4 py-3">Decision</th>
          <th className="px-4 py-3">Next Class</th>
        </tr>
      </thead>
      <tbody>
        {students.map((s, i) => {
          const d = DECISIONS[s.decision];
          const target = optionByCode[s.target_class_code];
          return (
            <tr key={s.student_id} className="border-b border-navy/6 last:border-0">
              <td className="tc-hide px-4 py-3 text-navy/45">{i + 1}</td>
              <td className="tc-primary px-4 py-3">
                <p className="font-medium text-navy">{s.name}</p>
                <p className="text-xs text-navy/45">{s.registration_no}</p>
              </td>
              <td data-label="Decision" className="px-4 py-3">
                {editable ? (
                  <div className="flex flex-wrap justify-end md:justify-start gap-1.5" role="radiogroup" aria-label={`Decision for ${s.name}`}>
                    {allowedDecisions.map((key) => (
                      <button
                        key={key}
                        type="button"
                        role="radio"
                        aria-checked={s.decision === key}
                        onClick={() => onChange(s.student_id, { decision: key })}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                          s.decision === key ? "bg-navy text-white border-navy" : "border-navy/15 text-navy/60 hover:border-gold"
                        }`}
                      >
                        {DECISIONS[key].short}
                      </button>
                    ))}
                  </div>
                ) : (
                  <Badge tone={d.tone}>{d.short}</Badge>
                )}
              </td>
              <td data-label="Next Class" className="px-4 py-3">
                {s.decision === "promoted" ? (
                  editable ? (
                    <select
                      value={s.target_class_code || ""}
                      onChange={(e) => onChange(s.student_id, { target_class_code: e.target.value || null })}
                      aria-label={`Next class for ${s.name}`}
                      className={`${inputClass} py-1.5! max-w-[14rem] ${s.target_class_code ? "" : "border-amber-400"}`}
                    >
                      <option value="">Choose class…</option>
                      {options.map((o) => (
                        <option key={o.code} value={o.code}>
                          {classOptionLabel(o)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-semibold text-navy">{target ? classOptionLabel(target) : "—"}</span>
                  )
                ) : (
                  <span className="text-navy/45 text-xs">
                    {s.decision === "not_promoted" ? "Repeats this class" : "Login will be turned off"}
                  </span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
