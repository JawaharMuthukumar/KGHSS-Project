import { useEffect, useState } from "react";
import Card from "../ui/Card";
import Banner from "../portal/Banner";
import { inputClass } from "../portal/FormField";
import { api, ApiError } from "../../lib/apiClient";

const COMPONENT_SHORT = { sa: "SA", fa: "FA", theory: "Th", practical: "Pr", internal: "In", total: "Mark" };

// Grid for entering one class's marks for one exam. Columns come from the class's
// mark scheme (SA/FA, Theory/Practical/Internal, …) so each grade gets its own pattern.
export default function MarksEntryPanel({ classCode, academicYear }) {
  const [scheme, setScheme] = useState(null);
  const [term, setTerm] = useState("");
  const [students, setStudents] = useState(null);
  const [marks, setMarks] = useState({}); // { [studentId]: { [subject]: { absent, components: { [key]: value } } } }
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setScheme(null);
    setStudents(null);
    setError("");
    Promise.all([api.get(`/classes/${classCode}/mark-scheme`), api.get("/students", { query: { class_code: classCode } })])
      .then(([schemeRes, studentRes]) => {
        setScheme(schemeRes);
        setStudents(studentRes);
        setTerm((t) => (schemeRes.terms.includes(t) ? t : schemeRes.terms[0]));
      })
      .catch((err) => setError(err.message));
  }, [classCode]);

  useEffect(() => {
    if (!scheme || !term) return;
    setSuccess("");
    api
      .get(`/classes/${classCode}/mark-report`, { query: { term } })
      .then((reportRes) => {
        const componentsBySubject = Object.fromEntries(scheme.subjects.map((s) => [s.subject, s.components]));
        const prefill = {};
        reportRes.students.forEach((row) => {
          prefill[row.student_id] = {};
          row.marks.forEach((m) => {
            const parts = componentsBySubject[m.subject] || [];
            let components = m.components || {};
            // Marks saved before component entry existed only have a total; keep it when there's a single component.
            if (!Object.keys(components).length && parts.length === 1 && !m.absent) components = { [parts[0].key]: m.score };
            prefill[row.student_id][m.subject] = { absent: m.absent, components };
          });
        });
        setMarks(prefill);
      })
      .catch((err) => setError(err.message));
  }, [classCode, scheme, term]);

  const grandMax = (scheme?.subjects || []).reduce((sum, s) => sum + s.components.reduce((t, c) => t + c.max, 0), 0);

  const cellOf = (studentId, subject) => marks[studentId]?.[subject] || { absent: false, components: {} };

  const updateCell = (studentId, subject, patch) => {
    setMarks((prev) => {
      const current = prev[studentId]?.[subject] || { absent: false, components: {} };
      const next = { ...current, ...patch, components: { ...current.components, ...patch.components } };
      return { ...prev, [studentId]: { ...prev[studentId], [subject]: next } };
    });
  };

  const isOverMax = (value, max) => value !== "" && value != null && (Number(value) < 0 || Number(value) > max);

  const handleSave = async () => {
    setError("");
    setSuccess("");
    for (const s of students) {
      for (const { subject, components } of scheme.subjects) {
        const cell = cellOf(s.id, subject);
        if (cell.absent) continue;
        const bad = components.find((c) => isOverMax(cell.components[c.key], c.max));
        if (bad) {
          setError(`${s.full_name}: ${subject} ${bad.label} must be between 0 and ${bad.max}.`);
          return;
        }
      }
    }
    setSaving(true);
    try {
      const payload = {
        academic_year: academicYear,
        students: Object.fromEntries(
          students.map((s) => [
            String(s.id),
            Object.fromEntries(
              scheme.subjects.map(({ subject, components }) => {
                const cell = cellOf(s.id, subject);
                return [
                  subject,
                  {
                    absent: Boolean(cell.absent),
                    components: Object.fromEntries(components.map((c) => [c.key, Number(cell.components[c.key]) || 0])),
                  },
                ];
              })
            ),
          ])
        ),
      };
      const res = await api.put(`/classes/${classCode}/marks/${encodeURIComponent(term)}`, payload);
      setSuccess(`Saved ${res.saved_marks} mark entries for ${term}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {scheme && (
        <Card className="p-4 mb-5 flex flex-wrap items-center gap-4">
          <select value={term} onChange={(e) => setTerm(e.target.value)} className={inputClass + " max-w-[12rem]"}>
            {scheme.terms.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <p className="text-xs text-navy/50">
            Std {scheme.grade} pattern:{" "}
            {[...new Set(scheme.subjects.map((s) => s.components.map((c) => `${c.label} ${c.max}`).join(" + ")))].join(" · ")}
          </p>
        </Card>
      )}

      {error && <Banner tone="error" className="mb-4">{error}</Banner>}
      {success && <Banner tone="success" className="mb-4">{success}</Banner>}

      {scheme && students && (
        <Card className="p-0 overflow-hidden">
          {/* Fixed layout: columns share the card width so the whole sheet fits without sideways scrolling. */}
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-36" />
              {scheme.subjects.flatMap(({ subject, components }) => [
                ...components.map((c) => <col key={`${subject}-${c.key}`} />),
                <col key={`${subject}-total`} />,
                <col key={`${subject}-ab`} />,
              ])}
              <col className="w-16" />
              <col className="w-14" />
            </colgroup>
            <thead>
              <tr className="text-[11px] font-semibold uppercase tracking-wide text-navy/50 border-b border-navy/8">
                <th rowSpan={2} className="px-3 py-2 text-left">Student</th>
                {scheme.subjects.map(({ subject, components }) => (
                  <th key={subject} colSpan={components.length + 2} className="px-1 pt-2.5 pb-1 text-center leading-tight border-l border-navy/8">
                    {subject}
                  </th>
                ))}
                <th rowSpan={2} className="px-1 py-2 text-center leading-tight border-l-2 border-navy/15 bg-navy/[0.03]">
                  Grand
                  <span className="block text-[10px] text-navy/40">/{grandMax}</span>
                </th>
                <th rowSpan={2} className="px-1 py-2 text-center bg-navy/[0.03]">%</th>
              </tr>
              <tr className="text-[10px] font-semibold text-navy/40 border-b border-navy/8">
                {scheme.subjects.map(({ subject, components }) => [
                  ...components.map((c, i) => (
                    <th key={`${subject}-${c.key}`} className={`px-0.5 pb-1.5 text-center leading-tight ${i === 0 ? "border-l border-navy/8" : ""}`}>
                      {COMPONENT_SHORT[c.key] || c.label}
                      <span className="block font-normal">/{c.max}</span>
                    </th>
                  )),
                  <th key={`${subject}-total`} className="px-0.5 pb-1.5 text-center align-top">Tot</th>,
                  <th key={`${subject}-ab`} className="px-0.5 pb-1.5 text-center align-top">AB</th>,
                ])}
              </tr>
            </thead>
              <tbody>
                {students.map((s) => {
                  const grandTotal = scheme.subjects.reduce((sum, { subject, components }) => {
                    const cell = cellOf(s.id, subject);
                    return cell.absent ? sum : sum + components.reduce((t, c) => t + (Number(cell.components[c.key]) || 0), 0);
                  }, 0);
                  return (
                  <tr key={s.id} className="border-b border-navy/6 last:border-0">
                    <td className="px-3 py-2 font-medium text-navy truncate" title={s.full_name}>{s.full_name}</td>
                    {scheme.subjects.map(({ subject, components }) => {
                      const cell = cellOf(s.id, subject);
                      const total = components.reduce((sum, c) => sum + (Number(cell.components[c.key]) || 0), 0);
                      return [
                        ...components.map((c, i) => {
                          const value = cell.components[c.key] ?? "";
                          return (
                            <td key={`${subject}-${c.key}`} className={`px-0.5 py-2 ${i === 0 ? "border-l border-navy/8" : ""}`}>
                              <input
                                type="text"
                                inputMode="numeric"
                                maxLength={String(c.max).length}
                                aria-label={`${s.full_name} ${subject} ${c.label}`}
                                disabled={cell.absent}
                                value={cell.absent ? "" : value}
                                onKeyDown={(e) => {
                                  if (["-", "+", "e", "E", "."].includes(e.key)) e.preventDefault();
                                }}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  // Whole numbers only, never above this component's max — the keystroke is simply ignored.
                                  if (raw !== "" && (!/^\d+$/.test(raw) || Number(raw) > c.max)) return;
                                  updateCell(s.id, subject, { components: { [c.key]: raw === "" ? "" : String(Number(raw)) } });
                                }}
                                className={`w-full min-w-0 px-0 py-1.5 rounded-md border text-center text-sm disabled:bg-navy/5 ${
                                  isOverMax(value, c.max) ? "border-red-500 bg-red-50" : "border-navy/15"
                                }`}
                              />
                            </td>
                          );
                        }),
                        <td key={`${subject}-total`} className={`px-0.5 py-2 text-center font-semibold ${cell.absent ? "text-red-600" : "text-navy"}`}>
                          {cell.absent ? "AB" : total}
                        </td>,
                        <td key={`${subject}-ab`} className="px-0.5 py-2 text-center">
                          <button
                            type="button"
                            aria-pressed={cell.absent}
                            title={cell.absent ? "Marked absent — click to undo" : "Mark absent"}
                            onClick={() => updateCell(s.id, subject, { absent: !cell.absent })}
                            className={`w-full max-w-[2.5rem] py-1.5 rounded-md text-[11px] font-bold border transition-colors ${
                              cell.absent
                                ? "bg-red-600 border-red-600 text-white hover:bg-red-700"
                                : "border-navy/15 text-navy/40 hover:border-red-400 hover:text-red-600"
                            }`}
                          >
                            AB
                          </button>
                        </td>,
                      ];
                    })}
                    <td className="px-1 py-2 text-center font-bold text-navy border-l-2 border-navy/15 bg-navy/[0.03]">{grandTotal}</td>
                    <td className="px-1 py-2 text-center text-xs font-semibold text-navy bg-navy/[0.03]">
                      {grandMax ? `${Math.round((grandTotal * 1000) / grandMax) / 10}%` : "—"}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
          </table>
        </Card>
      )}

      {scheme && students && (
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="mt-5 bg-gold text-navy-dark font-semibold text-sm px-6 py-3 rounded-full hover:bg-gold-light transition-colors disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save All Marks"}
        </button>
      )}
    </div>
  );
}
