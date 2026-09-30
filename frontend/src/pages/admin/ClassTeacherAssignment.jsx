import { useMemo, useState } from "react";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Icon from "../../components/ui/Icon";
import Banner from "../../components/portal/Banner";
import Drawer from "../../components/portal/Drawer";
import { inputClass } from "../../components/portal/FormField";
import { useApiResource } from "../../hooks/useApiResource";
import { api, ApiError } from "../../lib/apiClient";

export default function ClassTeacherAssignment() {
  const { data: classes, loading, error, reload } = useApiResource("/classes");
  const { data: teachers } = useApiResource("/teachers");
  const [activeClass, setActiveClass] = useState(null);

  const secondary = (classes || []).filter((c) => c.grade < 11);
  const higher = (classes || []).filter((c) => c.grade >= 11);

  return (
    <div>
      <PortalPageHeader title="Class Teacher Assignment" description="Assign one class teacher per class section." />

      {error && <Banner tone="error" className="mb-4">Could not load classes. {error.message}</Banner>}
      {loading && <p className="text-sm text-navy/50">Loading classes…</p>}

      {secondary.length > 0 && (
        <ClassGroup title="Classes 6 – 10" classes={secondary} onSelect={setActiveClass} />
      )}
      {higher.length > 0 && (
        <ClassGroup title="Classes 11 & 12" classes={higher} onSelect={setActiveClass} />
      )}

      <Drawer open={Boolean(activeClass)} onClose={() => setActiveClass(null)} title={`Class ${activeClass?.code || ""}`}>
        {activeClass && (
          <AssignPanel
            cls={activeClass}
            teachers={teachers || []}
            onDone={() => {
              reload();
              setActiveClass(null);
            }}
          />
        )}
      </Drawer>
    </div>
  );
}

function ClassGroup({ title, classes, onSelect }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-navy/45 mb-3">{title}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {classes.map((cls) => (
          <button
            key={cls.code}
            type="button"
            onClick={() => onSelect(cls)}
            className={`text-left p-4 rounded-2xl border-2 transition-colors ${
              cls.class_teacher_id
                ? "border-emerald-300 bg-emerald-50/50 hover:border-emerald-400"
                : "border-dashed border-navy/20 hover:border-gold/50 hover:bg-gold/5"
            }`}
          >
            <p className="font-heading font-bold text-navy text-base mb-1">{cls.code}</p>
            <p className="text-xs text-navy/50 mb-2">{cls.student_count} students</p>
            {cls.class_teacher_name ? (
              <p className="text-xs font-semibold text-emerald-700 truncate">{cls.class_teacher_name}</p>
            ) : (
              <p className="text-xs font-semibold text-navy/40">Unassigned</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function AssignPanel({ cls, teachers, onDone }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(cls.class_teacher_id || null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((t) => t.full_name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q));
  }, [teachers, search]);

  const handleAssign = async () => {
    if (!selected) return;
    setError("");
    setSubmitting(true);
    try {
      await api.put(`/classes/${cls.code}/class-teacher`, { teacher_id: selected });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async () => {
    setSubmitting(true);
    try {
      await api.delete(`/classes/${cls.code}/class-teacher`);
      onDone();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/35" />
        <input
          type="text"
          placeholder="Search teachers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputClass} pl-9`}
        />
      </div>

      <div className="flex flex-col gap-1.5 max-h-96 overflow-y-auto">
        {filtered.map((t) => (
          <label
            key={t.id}
            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
              selected === t.id ? "border-gold bg-gold/8" : "border-navy/8 hover:bg-navy/[0.03]"
            }`}
          >
            <input
              type="radio"
              name="teacher"
              checked={selected === t.id}
              onChange={() => setSelected(t.id)}
              className="accent-gold"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-navy truncate">{t.full_name}</p>
              <p className="text-xs text-navy/50">{t.subject} · {t.employee_id}</p>
            </div>
          </label>
        ))}
        {filtered.length === 0 && <p className="text-sm text-navy/40 text-center py-4">No teachers found.</p>}
      </div>

      {error && <Banner tone="error">{error}</Banner>}

      <div className="flex items-center gap-3 mt-2">
        <button
          type="button"
          disabled={!selected || submitting}
          onClick={handleAssign}
          className="flex-1 bg-gold text-navy-dark font-semibold text-sm py-3 rounded-full hover:bg-gold-light transition-colors disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Assign Class Teacher"}
        </button>
        {cls.class_teacher_id && (
          <button
            type="button"
            disabled={submitting}
            onClick={handleRemove}
            className="px-4 py-3 rounded-full text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
