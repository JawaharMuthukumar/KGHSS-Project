import { useEffect, useState } from "react";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import Banner from "../../components/portal/Banner";
import EmptyState from "../../components/portal/EmptyState";
import { inputClass } from "../../components/portal/FormField";
import { WEEKDAYS, PERIODS } from "../../components/portal/timetableConstants";
import { useMyTeacherProfile } from "../../hooks/useMyTeacherProfile";
import { useApiResource } from "../../hooks/useApiResource";
import { api, ApiError } from "../../lib/apiClient";

function cellKey(weekday, period) {
  return `${weekday}-${period}`;
}

export default function ClassTimetable() {
  const { classCode, loading: loadingProfile } = useMyTeacherProfile();
  const { data: entries, loading, error } = useApiResource(`/classes/${classCode}/timetable`, { enabled: Boolean(classCode) });
  const { data: teachers } = useApiResource("/teachers", { enabled: Boolean(classCode) });
  const [grid, setGrid] = useState({});
  const [saveError, setSaveError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!entries) return;
    const map = {};
    entries.forEach((e) => {
      map[cellKey(e.weekday, e.period)] = { subject: e.subject || "", teacher_id: e.teacher_id || "" };
    });
    setGrid(map);
  }, [entries]);

  const updateCell = (weekday, period, field, value) => {
    const key = cellKey(weekday, period);
    setGrid((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    setSuccess("");
    try {
      const entriesPayload = [];
      WEEKDAYS.forEach((_, weekday) => {
        PERIODS.forEach((period) => {
          const cell = grid[cellKey(weekday, period)];
          if (cell?.subject) {
            entriesPayload.push({
              weekday,
              period,
              subject: cell.subject,
              teacher_id: cell.teacher_id ? Number(cell.teacher_id) : undefined,
            });
          }
        });
      });
      await api.put(`/classes/${classCode}/timetable`, { academic_year: "2026-2027", entries: entriesPayload });
      setSuccess("Timetable saved.");
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  if (!loadingProfile && !classCode) {
    return (
      <div>
        <PortalPageHeader title="Class Timetable" />
        <EmptyState
          icon="CalendarRange"
          title="You are not a Class Teacher"
          description="Only the assigned Class Teacher can edit a class timetable."
        />
      </div>
    );
  }

  return (
    <div>
      <PortalPageHeader title="Class Timetable" description={classCode ? `Class ${classCode}` : undefined} />

      {error && <Banner tone="error" className="mb-4">{error.message}</Banner>}
      {saveError && <Banner tone="error" className="mb-4">{saveError}</Banner>}
      {success && <Banner tone="success" className="mb-4">{success}</Banner>}

      {!loading && (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="px-3 py-3 text-xs font-semibold uppercase text-navy/45 border-b border-navy/8 text-left">Period</th>
                  {WEEKDAYS.map((day) => (
                    <th key={day} className="px-3 py-3 text-xs font-semibold uppercase text-navy/45 border-b border-navy/8">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map((period) => (
                  <tr key={period} className="border-b border-navy/6 last:border-0">
                    <td className="px-3 py-2 font-semibold text-navy/60">{period}</td>
                    {WEEKDAYS.map((_, weekday) => {
                      const cell = grid[cellKey(weekday, period)] || { subject: "", teacher_id: "" };
                      return (
                        <td key={weekday} className="px-2 py-2 min-w-[9rem]">
                          <input
                            type="text"
                            placeholder="Subject"
                            value={cell.subject}
                            onChange={(e) => updateCell(weekday, period, "subject", e.target.value)}
                            className={inputClass + " mb-1 text-xs px-2 py-1.5"}
                          />
                          <select
                            value={cell.teacher_id}
                            onChange={(e) => updateCell(weekday, period, "teacher_id", e.target.value)}
                            className={inputClass + " text-xs px-2 py-1.5"}
                          >
                            <option value="">Teacher…</option>
                            {(teachers || []).map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.full_name}
                              </option>
                            ))}
                          </select>
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

      {!loading && (
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="mt-5 bg-gold text-navy-dark font-semibold text-sm px-6 py-3 rounded-full hover:bg-gold-light transition-colors disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Timetable"}
        </button>
      )}
    </div>
  );
}
