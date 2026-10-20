import { useEffect, useMemo, useState } from "react";
import Card from "../ui/Card";
import Icon from "../ui/Icon";
import Banner from "../portal/Banner";
import Drawer from "../portal/Drawer";
import FormField, { inputClass } from "../portal/FormField";
import { WEEKDAYS, WEEKDAY_NAMES, PERIODS, EXTRA_PERIODS } from "../portal/timetableConstants";
import { useApiResource } from "../../hooks/useApiResource";
import { TableSkeleton } from "../ui/Skeleton";
import { api, ApiError } from "../../lib/apiClient";
import { useToast } from "../ui/Toast";
import TimetableGrid from "./TimetableGrid";
import SubjectCombobox from "./SubjectCombobox";

const cellKey = (weekday, period) => `${weekday}-${period}`;
const emptyCell = { subject: "", teacher_id: "" };

// A soft accent per subject so the week reads at a glance (cycled by subject position).
const ACCENTS = [
  "border-l-teal",
  "border-l-gold",
  "border-l-sky-500",
  "border-l-emerald-500",
  "border-l-violet-500",
  "border-l-rose-500",
  "border-l-amber-500",
  "border-l-indigo-500",
  "border-l-lime-600",
  "border-l-pink-500",
];

/** Edit one class's weekly timetable (Admin → Timetables, Teacher → Class Timetable). */
export default function ClassTimetableEditor({ classCode }) {
  const toast = useToast();
  const { data: entries, loading, error } = useApiResource(`/classes/${classCode}/timetable`, { deps: [classCode] });
  const { data: subjectData } = useApiResource(`/classes/${classCode}/subjects`, { deps: [classCode] });
  const { data: assignments } = useApiResource(`/classes/${classCode}/subject-teachers`, { deps: [classCode] });
  const [grid, setGrid] = useState({});
  const [dirty, setDirty] = useState(false);
  const [editing, setEditing] = useState(null); // { weekday, period, subject, teacher_id }
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const map = {};
    (entries || []).forEach((e) => {
      map[cellKey(e.weekday, e.period)] = { subject: e.subject || "", teacher_id: e.teacher_id || "" };
    });
    setGrid(map);
    setDirty(false);
  }, [entries]);

  const subjectOptions = useMemo(() => [...new Set([...(subjectData?.subjects || []), ...EXTRA_PERIODS])], [subjectData]);
  // Only the teachers the admin assigned to this class (Admin → Subject Teachers) can take its periods.
  // Names also come from saved entries, so an old slot still shows who it was given to.
  const names = useMemo(() => {
    const map = {};
    (entries || []).forEach((e) => e.teacher_id && e.teacher_name && (map[e.teacher_id] = e.teacher_name));
    (assignments || []).forEach((a) => (map[a.teacher_id] = a.teacher_name));
    return map;
  }, [entries, assignments]);
  const teacherName = (id) => names[id];
  const teachersFor = (subject) =>
    (assignments || [])
      .filter((a) => a.subject.toLowerCase() === (subject || "").trim().toLowerCase())
      .map((a) => ({ id: a.teacher_id, name: a.teacher_name }));  const accentFor = (subject) => {
    const i = subjectOptions.findIndex((s) => s.toLowerCase() === subject.trim().toLowerCase());
    return ACCENTS[(i < 0 ? subjectOptions.length : i) % ACCENTS.length];
  };

  const openSlot = (weekday, period) => setEditing({ weekday, period, ...emptyCell, ...grid[cellKey(weekday, period)] });

  const applySlot = (cell) => {
    const key = cellKey(editing.weekday, editing.period);
    setGrid((prev) => {
      const next = { ...prev };
      if (cell.subject.trim()) next[key] = { subject: cell.subject.trim(), teacher_id: cell.teacher_id };
      else delete next[key];
      return next;
    });
    setDirty(true);
    setEditing(null);
  };

  const filled = Object.keys(grid).length;

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const payload = [];
      WEEKDAYS.forEach((_, weekday) => {
        PERIODS.forEach((period) => {
          const cell = grid[cellKey(weekday, period)];
          if (cell?.subject) {
            payload.push({ weekday, period, subject: cell.subject, teacher_id: cell.teacher_id ? Number(cell.teacher_id) : undefined });
          }
        });
      });
      await api.put(`/classes/${classCode}/timetable`, { academic_year: "2026-2027", entries: payload });
      setDirty(false);
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

      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <p className="text-sm text-navy/55">
          {filled} of {WEEKDAYS.length * PERIODS.length} periods filled · click a period to set its subject and teacher
        </p>
        {dirty && <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">Unsaved changes</span>}
      </div>

      <Card className="p-0 overflow-hidden">
        <TimetableGrid
          cellClassName="min-w-[7.5rem]"
          renderCell={(weekday, period) => {
            const cell = grid[cellKey(weekday, period)];
            if (!cell) {
              return (
                <button
                  type="button"
                  onClick={() => openSlot(weekday, period)}
                  aria-label={`Add ${WEEKDAY_NAMES[weekday]} period ${period}`}
                  className="w-full h-14 flex items-center justify-center gap-1 rounded-xl border border-dashed border-navy/15 text-navy/30 text-xs hover:border-gold hover:text-gold-dark hover:bg-gold/5 transition-colors"
                >
                  <Icon name="Plus" size={14} />
                  Add
                </button>
              );
            }
            const name = teacherName(cell.teacher_id);
            return (
              <button
                type="button"
                onClick={() => openSlot(weekday, period)}
                className={`w-full h-14 px-2.5 flex flex-col justify-center text-left rounded-xl border border-navy/10 border-l-4 ${accentFor(cell.subject)} bg-white hover:border-gold hover:shadow-sm transition`}
              >
                <span className="block text-sm font-semibold text-navy truncate">{cell.subject}</span>
                <span className={`block text-[11px] truncate ${name ? "text-navy/55" : "text-amber-600"}`}>{name || "No teacher"}</span>
              </button>
            );
          }}
        />
      </Card>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          className="flex items-center gap-1.5 bg-gold text-navy-dark font-semibold text-sm px-5 py-2.5 rounded-full hover:bg-gold-light transition-colors disabled:opacity-50"
        >
          <Icon name="Save" size={15} />
          {saving ? "Saving…" : "Save Timetable"}
        </button>
      </div>

      <Drawer
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing ? `${WEEKDAY_NAMES[editing.weekday]} · Period ${editing.period}` : ""}
      >
        {editing && (
          <SlotEditor
            key={`${editing.weekday}-${editing.period}`}
            initial={editing}
            subjectOptions={subjectOptions}
            teachersFor={teachersFor}
            teacherName={teacherName}
            onApply={applySlot}
            onCancel={() => setEditing(null)}
          />
        )}
      </Drawer>
    </div>
  );
}

function SlotEditor({ initial, subjectOptions, teachersFor, teacherName, onApply, onCancel }) {
  const [cell, setCell] = useState({ subject: initial.subject, teacher_id: initial.teacher_id });
  const options = teachersFor(cell.subject);
  // Keep a previously saved teacher visible even if the assignment has since changed.
  const current = cell.teacher_id && !options.some((o) => String(o.id) === String(cell.teacher_id))
    ? [{ id: cell.teacher_id, name: `${teacherName(cell.teacher_id) || "Previous teacher"} (not assigned)` }]
    : [];

  // Picking a subject selects that subject's assigned teacher for this class (or none if unassigned).
  const setSubject = (subject) => {
    const assigned = teachersFor(subject)[0]?.id || "";
    setCell({ subject, teacher_id: assigned });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onApply(cell);
      }}
      className="flex flex-col gap-4"
    >
      <FormField label="Subject" htmlFor="slot-subject" hint="Type a letter to see matching subjects, or pick from the list.">
        <SubjectCombobox id="slot-subject" value={cell.subject} options={subjectOptions} onChange={setSubject} className={inputClass} />
      </FormField>

      <FormField
        label="Teacher"
        htmlFor="slot-teacher"
        hint={
          !cell.subject.trim()
            ? "Choose a subject first."
            : options.length
              ? "Subject teacher assigned to this class for this subject."
              : "No subject teacher assigned for this subject. Ask the admin to assign one (Admin → Subject Teachers)."
        }
      >
        <select
          id="slot-teacher"
          value={cell.teacher_id}
          disabled={!cell.subject.trim()}
          onChange={(e) => setCell((c) => ({ ...c, teacher_id: e.target.value }))}
          className={inputClass + " disabled:opacity-60"}
        >
          <option value="">— No teacher —</option>
          {[...options, ...current].map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </FormField>

      <div className="flex items-center gap-3 mt-2">
        <button
          type="submit"
          className="flex-1 bg-gold text-navy-dark font-semibold text-sm py-3 rounded-full hover:bg-gold-light transition-colors"
        >
          Done
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-3 rounded-full text-sm font-semibold text-navy/60 hover:text-navy hover:bg-navy/5 transition-colors"
        >
          Cancel
        </button>
      </div>

      {initial.subject && (
        <button
          type="button"
          onClick={() => onApply({ subject: "", teacher_id: "" })}
          className="flex items-center justify-center gap-1.5 border border-red-200 text-red-600 font-semibold text-sm py-2.5 rounded-full hover:bg-red-50 transition-colors"
        >
          <Icon name="Trash2" size={15} />
          Clear this period
        </button>
      )}

      <p className="text-xs text-navy/45">Changes apply to the grid right away; press “Save Timetable” to publish them.</p>
    </form>
  );
}
