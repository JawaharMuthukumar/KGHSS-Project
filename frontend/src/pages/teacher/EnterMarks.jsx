import { useEffect, useState } from "react";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import Banner from "../../components/portal/Banner";
import EmptyState from "../../components/portal/EmptyState";
import { inputClass } from "../../components/portal/FormField";
import { useMyTeacherProfile } from "../../hooks/useMyTeacherProfile";
import { api, ApiError } from "../../lib/apiClient";
import { EXAM_TERMS } from "../../constants/academic";

export default function EnterMarks() {
  const { classCode, loading: loadingProfile } = useMyTeacherProfile();
  const [term, setTerm] = useState(EXAM_TERMS[0]);
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [subjects, setSubjects] = useState(null);
  const [students, setStudents] = useState(null);
  const [marks, setMarks] = useState({}); // { [studentId]: { [subject]: { score, absent } } }
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!classCode) return;
    setError("");
    setSuccess("");
    Promise.all([
      api.get(`/classes/${classCode}/subjects`),
      api.get("/students"),
      api.get(`/classes/${classCode}/mark-report`, { query: { term } }),
      api.get("/classes"),
    ])
      .then(([subjectRes, studentRes, reportRes, classesRes]) => {
        setSubjects(subjectRes.subjects);
        setStudents(studentRes);
        const cls = classesRes.find((c) => c.code === classCode);
        if (cls) setAcademicYear(cls.academic_year);

        const prefill = {};
        reportRes.students.forEach((row) => {
          prefill[row.student_id] = {};
          row.marks.forEach((m) => {
            prefill[row.student_id][m.subject] = { score: m.score, absent: m.absent };
          });
        });
        setMarks(prefill);
      })
      .catch((err) => setError(err.message));
  }, [classCode, term]);

  const updateCell = (studentId, subject, field, value) => {
    setMarks((prev) => {
      const current = prev[studentId]?.[subject] || { score: 0, absent: false };
      return {
        ...prev,
        [studentId]: { ...prev[studentId], [subject]: { ...current, [field]: value } },
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        academic_year: academicYear,
        students: Object.fromEntries(
          (students || []).map((s) => [
            String(s.id),
            Object.fromEntries(
              subjects.map((subject) => {
                const cell = marks[s.id]?.[subject] || { score: 0, absent: false };
                return [subject, { score: cell.absent ? 0 : Number(cell.score) || 0, max: 100, absent: Boolean(cell.absent) }];
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

  if (!loadingProfile && !classCode) {
    return (
      <div>
        <PortalPageHeader title="Enter Marks" />
        <EmptyState
          icon="Pencil"
          title="You are not a Class Teacher"
          description="Marks entry here is scoped to your assigned class. Ask an admin to assign you as a Class Teacher first."
        />
      </div>
    );
  }

  return (
    <div>
      <PortalPageHeader
        title="Enter Marks"
        description={classCode ? `Class ${classCode}` : undefined}
        actions={
          <select value={term} onChange={(e) => setTerm(e.target.value)} className={inputClass + " max-w-[10rem]"}>
            {EXAM_TERMS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        }
      />

      {error && <Banner tone="error" className="mb-4">{error}</Banner>}
      {success && <Banner tone="success" className="mb-4">{success}</Banner>}

      {subjects && students && (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-navy/45 border-b border-navy/8">
                  <th className="px-4 py-3 sticky left-0 bg-white">Student</th>
                  {subjects.map((subject) => (
                    <th key={subject} className="px-3 py-3 text-center whitespace-nowrap">
                      {subject}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b border-navy/6 last:border-0">
                    <td className="px-4 py-2 sticky left-0 bg-white font-medium text-navy whitespace-nowrap">{s.full_name}</td>
                    {subjects.map((subject) => {
                      const cell = marks[s.id]?.[subject] || { score: 0, absent: false };
                      return (
                        <td key={subject} className="px-2 py-2">
                          <div className="flex items-center gap-1.5 justify-center">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              disabled={cell.absent}
                              value={cell.absent ? "" : cell.score}
                              onChange={(e) => updateCell(s.id, subject, "score", e.target.value)}
                              className="w-14 px-2 py-1.5 rounded-lg border border-navy/15 text-center text-sm disabled:bg-navy/5"
                            />
                            <label className="flex items-center gap-1 text-[10px] text-navy/50">
                              <input
                                type="checkbox"
                                checked={cell.absent}
                                onChange={(e) => updateCell(s.id, subject, "absent", e.target.checked)}
                                className="accent-red-500"
                              />
                              AB
                            </label>
                          </div>
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

      {subjects && students && (
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
