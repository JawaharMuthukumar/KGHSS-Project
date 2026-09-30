import { useEffect, useState } from "react";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Banner from "../../components/portal/Banner";
import { inputClass } from "../../components/portal/FormField";
import { useApiResource } from "../../hooks/useApiResource";
import { api } from "../../lib/apiClient";

export default function SubjectTeacherAssignment() {
  const { data: classes, loading: loadingClasses } = useApiResource("/classes");
  const { data: teachers } = useApiResource("/teachers");
  const [classCode, setClassCode] = useState("");
  const [subjects, setSubjects] = useState(null);
  const [assignments, setAssignments] = useState(null);
  const [savedSubject, setSavedSubject] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!classCode) return;
    setError("");
    Promise.all([api.get(`/classes/${classCode}/subjects`), api.get(`/classes/${classCode}/subject-teachers`)])
      .then(([subjectRes, assignRes]) => {
        setSubjects(subjectRes.subjects);
        setAssignments(assignRes);
      })
      .catch((err) => setError(err.message));
  }, [classCode]);

  const selectedClass = (classes || []).find((c) => c.code === classCode);
  const teacherFor = (subject) => assignments?.find((a) => a.subject === subject)?.teacher_id || "";

  const handleAssign = async (subject, teacherId) => {
    setSavedSubject(null);
    try {
      if (!teacherId) {
        await api.delete(`/classes/${classCode}/subject-teachers/${encodeURIComponent(subject)}`);
      } else {
        await api.put(`/classes/${classCode}/subject-teachers`, { teacher_id: Number(teacherId), subject });
      }
      const assignRes = await api.get(`/classes/${classCode}/subject-teachers`);
      setAssignments(assignRes);
      setSavedSubject(subject);
      setTimeout(() => setSavedSubject((s) => (s === subject ? null : s)), 1500);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <PortalPageHeader title="Subject Teachers" description="Assign a subject teacher for each subject in a class." />

      <Card className="p-5 mb-5">
        <label className="block text-xs font-semibold text-navy/70 mb-1.5" htmlFor="class-select">
          Choose a class
        </label>
        <select
          id="class-select"
          value={classCode}
          onChange={(e) => setClassCode(e.target.value)}
          className={inputClass + " max-w-xs"}
          disabled={loadingClasses}
        >
          <option value="">Select a class…</option>
          {(classes || []).map((c) => (
            <option key={c.code} value={c.code}>
              {c.code}
            </option>
          ))}
        </select>
      </Card>

      {error && <Banner tone="error" className="mb-4">{error}</Banner>}

      {selectedClass && (
        <Card className="p-5 mb-5 flex items-center gap-3">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-navy/8 text-navy shrink-0">
            <Icon name="UserCog" size={18} />
          </span>
          <div>
            <p className="text-xs text-navy/50">Class Teacher</p>
            <p className="text-sm font-semibold text-navy">
              {selectedClass.class_teacher_name || "Not assigned yet"}
            </p>
          </div>
        </Card>
      )}

      {classCode && subjects && (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-navy/45 border-b border-navy/8">
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Teacher</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject) => (
                <tr key={subject} className="border-b border-navy/6 last:border-0">
                  <td className="px-4 py-3 font-medium text-navy">{subject}</td>
                  <td className="px-4 py-3">
                    <select
                      value={teacherFor(subject)}
                      onChange={(e) => handleAssign(subject, e.target.value)}
                      className={inputClass + " max-w-xs"}
                    >
                      <option value="">— Unassigned —</option>
                      {(teachers || []).map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.full_name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-emerald-600">
                    {savedSubject === subject && <Icon name="Check" size={16} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
