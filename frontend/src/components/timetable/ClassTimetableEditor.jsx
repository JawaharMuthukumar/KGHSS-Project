import { useEffect, useMemo, useState } from "react";
import Card from "../ui/Card";
import Banner from "../portal/Banner";
import { inputClass } from "../portal/FormField";
import { WEEKDAYS, PERIODS, EXTRA_PERIODS } from "../portal/timetableConstants";
import { useApiResource } from "../../hooks/useApiResource";
import { TableSkeleton } from "../ui/Skeleton";
import { api, ApiError } from "../../lib/apiClient";
import { useToast } from "../ui/Toast";
import TimetableGrid from "./TimetableGrid";
import SubjectCombobox from "./SubjectCombobox";

const cellKey = (weekday, period) => `${weekday}-${period}`;
const compact = " text-xs px-2 py-1.5";

/** Edit one class's weekly timetable (Admin → Timetables, Teacher → Class Timetable). */
export default function ClassTimetableEditor({ classCode }) {
  const toast = useToast();
  const { data: entries, loading, error } = useApiResource(`/classes/${classCode}/timetable`, { deps: [classCode] });
  const { data: subjectData } = useApiResource(`/classes/${classCode}/subjects`, { deps: [classCode] });
  const { data: assignments } = useApiResource(`/classes/${classCode}/subject-teachers`, { deps: [classCode] });
  const { data: teachers } = useApiResource("/teachers");
  const [grid, setGrid] = useState({});
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const map = {};
    (entries || []).forEach((e) => {
      map[cellKey(e.weekday, e.period)] = { subject: e.subject || "", teacher_id: e.teacher_id || "" };
    });
    setGrid(map);
  }, [entries]);

  const subjectOptions = useMemo(() => [...new Set([...(subjectData?.subjects || []), ...EXTRA_PERIODS])], [subjectData]);
  const sortedTeachers = useMemo(
    () => [...(teachers || [])].sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [teachers]
  );
  const assignedTeacher = (subject) =>
    (assignments || []).find((a) => a.subject.toLowerCase() === (subject || "").trim().toLowerCase())?.teacher_id;

  const updateCell = (weekday, period, changes) => {
    const key = cellKey(weekday, period);
    setGrid((prev) => ({ ...prev, [key]: { subject: "", teacher_id: "", ...prev[key], ...changes } }));
  };

  // Picking a subject fills in that subject's assigned teacher for this class (still changeable).
  const setSubject = (weekday, period, subject) => {
    const teacherId = assignedTeacher(subject);
    updateCell(weekday, period, teacherId ? { subject, teacher_id: teacherId } : { subject });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const payload = [];
      WEEKDAYS.forEach((_, weekday) => {
        PERIODS.forEach((period) => {
          const cell = grid[cellKey(weekday, period)];
          if (cell?.subject?.trim()) {
            payload.push({
              weekday,
              period,
              subject: cell.subject.trim(),
              teacher_id: cell.teacher_id ? Number(cell.teacher_id) : undefined,
            });
          }
        });
      });
      await api.put(`/classes/${classCode}/timetable`, { academic_year: "2026-2027", entries: payload });
      toast.success(`Timetable saved for ${classCode}`);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  if (error) return <Banner tone="error" className="mb-4">{error.message}</Banner>;
  if (loading) return <Card className="p-0 overflow-hidden"><TableSkeleton rows={5} columns={6} /></Card>;

  return (
    <div>
      {saveError && <Banner tone="error" className="mb-4">{saveError}</Banner>}
      <Card className="p-0 overflow-hidden">
        <TimetableGrid
          cellClassName="min-w-[8.5rem]"
          renderCell={(weekday, period) => {
            const cell = grid[cellKey(weekday, period)] || { subject: "", teacher_id: "" };
            return (
              <div className="flex flex-col gap-1">
                <SubjectCombobox
                  value={cell.subject}
                  options={subjectOptions}
                  onChange={(subject) => setSubject(weekday, period, subject)}
                  className={inputClass + compact}
                />
                <select
                  value={cell.teacher_id}
                  onChange={(e) => updateCell(weekday, period, { teacher_id: e.target.value })}
                  aria-label="Teacher"
                  className={inputClass + compact}
                >
                  <option value="">Teacher…</option>
                  {sortedTeachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name}
                    </option>
                  ))}
                </select>
              </div>
            );
          }}
        />
      </Card>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="mt-5 bg-gold text-navy-dark font-semibold text-sm px-6 py-3 rounded-full hover:bg-gold-light transition-colors disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save Timetable"}
      </button>
    </div>
  );
}
