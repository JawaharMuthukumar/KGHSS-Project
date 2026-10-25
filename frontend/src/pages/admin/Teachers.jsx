import { useMemo, useState } from "react";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Badge from "../../components/ui/Badge";
import Banner from "../../components/portal/Banner";
import StatCard from "../../components/portal/StatCard";
import Drawer from "../../components/portal/Drawer";
import FormField, { inputClass } from "../../components/portal/FormField";
import { useApiResource } from "../../hooks/useApiResource";
import { api, ApiError } from "../../lib/apiClient";
import { TableSkeleton } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";
import { mobileInputProps, toMobileDigits } from "../../utils/mobile";

const emptyForm = { full_name: "", subject: "", phone: "", password: "", is_active: true };

/** Exam subjects (from the mark scheme and groups) followed by the HM's other subjects (Physical Education, …). */
const subjectNames = (data) => [...(data?.exam_subjects || []), ...(data?.other_subjects || []).map((o) => o.name)];

export default function Teachers() {
  const { data: teachers, loading, error, reload } = useApiResource("/teachers");
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState(null); // { mode: 'create' | 'view' | 'edit', teacher? }
  const [credentials, setCredentials] = useState(null);
  const [actionError, setActionError] = useState("");
  const [subjectsOpen, setSubjectsOpen] = useState(false);
  const toast = useToast();

  const openTeacher = (teacher, mode = "view") => {
    setActionError("");
    setDrawer({ mode, teacher });
  };

  const filtered = useMemo(() => {
    const list = [...(teachers || [])].sort((a, b) => a.full_name.localeCompare(b.full_name, undefined, { sensitivity: "base" }));
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (t) => t.full_name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q) || t.employee_id.toLowerCase().includes(q)
    );
  }, [teachers, search]);

  const handleDeactivate = async (teacher) => {
    if (!window.confirm(`Deactivate ${teacher.full_name}? They will no longer be able to sign in.`)) return;
    setActionError("");
    try {
      await api.delete(`/teachers/${teacher.id}`);
      openTeacher({ ...teacher, is_active: false });
      reload();
      toast.success(`${teacher.full_name} deactivated`);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  };

  const handleReactivate = async (teacher) => {
    setActionError("");
    try {
      await api.patch(`/teachers/${teacher.id}`, { is_active: true });
      openTeacher({ ...teacher, is_active: true });
      reload();
      toast.success(`${teacher.full_name} reactivated`);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  };

  const activeCount = (teachers || []).filter((t) => t.is_active).length;

  const drawerTitle = credentials
    ? "Teacher Created"
    : { create: "Add Teacher", view: "Teacher Profile", edit: "Edit Teacher" }[drawer?.mode];

  return (
    <div>
      <PortalPageHeader
        title="Teachers"
        description="Add teachers, edit their details, or deactivate accounts."
        actions={
          <>
            <button
              type="button"
              onClick={() => setSubjectsOpen(true)}
              className="flex items-center gap-1.5 text-sm font-semibold text-navy border border-navy/15 px-4 py-2.5 rounded-full hover:bg-navy/5"
            >
              <Icon name="BookOpen" size={16} />
              Subjects
            </button>
            <button
              type="button"
              onClick={() => setDrawer({ mode: "create" })}
              className="flex items-center gap-1.5 bg-gold text-navy-dark font-semibold text-sm px-4 py-2.5 rounded-full hover:bg-gold-light transition-colors"
            >
              <Icon name="UserPlus" size={16} />
              Add Teacher
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Teachers" value={teachers?.length} icon="Users" tone="teal" />
        <StatCard label="Active" value={teachers && activeCount} icon="CircleCheck" tone="success" />
        <StatCard label="Inactive" value={teachers && teachers.length - activeCount} icon="CircleX" tone="danger" />
      </div>

      {error && <Banner tone="error" className="mb-4">Could not load teachers. {error.message}</Banner>}

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-navy/8">
          <div className="relative max-w-xs">
            <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/35" />
            <input
              type="text"
              placeholder="Search by name, subject, ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${inputClass} pl-9`}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table-cards w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-navy/45 border-b border-navy/8">
                <th className="px-4 py-3">Teacher</th>
                <th className="px-4 py-3">Employee ID</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="p-0"><TableSkeleton rows={5} columns={5} /></td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-navy/40">
                    No teachers found.
                  </td>
                </tr>
              )}
              {!loading && filtered.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => openTeacher(t)}
                  className="border-b border-navy/6 last:border-0 hover:bg-navy/[0.05] cursor-pointer"
                >
                  <td className="tc-primary px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-navy/8 text-navy text-xs font-bold shrink-0">
                        {t.full_name.slice(0, 1)}
                      </span>
                      <span className="font-medium text-navy">{t.full_name}</span>
                    </div>
                  </td>
                  <td data-label="Employee ID" className="px-4 py-3 text-navy/70">{t.employee_id}</td>
                  <td data-label="Subject" className="px-4 py-3 text-navy/70">{t.subject}</td>
                  <td data-label="Phone" className="px-4 py-3 text-navy/70">{t.phone || "—"}</td>
                  <td className="tc-aside px-4 py-3">
                    <Badge tone={t.is_active ? "success" : "danger"}>{t.is_active ? "Active" : "Inactive"}</Badge>
                  </td>
                  <td className="tc-hide px-4 py-3 text-right">
                    <Icon name="ChevronRight" size={16} className="text-navy/30" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Drawer
        open={Boolean(drawer)}
        onClose={() => {
          setDrawer(null);
          setCredentials(null);
        }}
        title={drawerTitle}
      >
        {drawer?.mode === "view" && !credentials && (
          <TeacherProfile
            teacher={drawer.teacher}
            error={actionError}
            onEdit={() => openTeacher(drawer.teacher, "edit")}
            onDeactivate={() => handleDeactivate(drawer.teacher)}
            onReactivate={() => handleReactivate(drawer.teacher)}
          />
        )}
        {(drawer?.mode === "create" || drawer?.mode === "edit") && !credentials && (
          <TeacherForm
            key={drawer.mode}
            mode={drawer.mode}
            teacher={drawer.teacher}
            onCancel={() => (drawer.mode === "edit" ? openTeacher(drawer.teacher) : setDrawer(null))}
            onSuccess={(result) => {
              reload();
              if (drawer.mode === "create") {
                setCredentials(result);
                toast.success("Teacher added successfully");
              } else {
                openTeacher({ ...drawer.teacher, ...result });
                toast.success("Teacher updated successfully");
              }
            }}
          />
        )}
        {credentials && (
          <div className="flex flex-col gap-4">
            <Banner tone="success">Teacher account created. Share these login details securely.</Banner>
            <div className="bg-navy-dark text-white rounded-2xl p-5">
              <p className="text-xs text-white/50 uppercase tracking-wide mb-1">Employee ID (Login)</p>
              <p className="font-heading font-bold text-lg mb-4">{credentials.employee_id}</p>
              <p className="text-xs text-white/50 uppercase tracking-wide mb-1">Temporary Password</p>
              <p className="font-heading font-bold text-lg">{credentials.password}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDrawer(null);
                setCredentials(null);
              }}
              className="bg-gold text-navy-dark font-semibold text-sm py-3 rounded-full hover:bg-gold-light transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </Drawer>

      <Drawer open={subjectsOpen} onClose={() => setSubjectsOpen(false)} title="Subjects">
        {subjectsOpen && <SubjectsPanel />}
      </Drawer>
    </div>
  );
}

/** HM adds or removes non-exam subjects (Physical Education, Library, …); exam subjects come from the mark scheme. */
function SubjectsPanel() {
  const { data, loading, error, reload } = useApiResource("/subjects");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const res = await api.post("/subjects", { name: name.trim() });
      toast.success(`${res.added} added`);
      setName("");
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not add this subject.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (subject) => {
    if (!window.confirm(`Remove ${subject.name} from the subject list?`)) return;
    try {
      await api.delete(`/subjects/${subject.id}`);
      toast.success(`${subject.name} removed`);
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not remove this subject.");
    }
  };

  if (error) return <Banner tone="error">{error.message}</Banner>;
  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={add} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Physical Education"
          aria-label="New subject"
          className={inputClass}
        />
        <button
          type="submit"
          disabled={busy || name.trim().length < 2}
          className="shrink-0 bg-gold text-navy-dark font-semibold text-sm px-5 rounded-full hover:bg-gold-light transition-colors disabled:opacity-50"
        >
          Add
        </button>
      </form>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-navy/45 mb-2">Other subjects &amp; periods</p>
        {loading && <TableSkeleton rows={4} columns={2} />}
        <ul className="flex flex-col divide-y divide-navy/6">
          {(data?.other_subjects || []).map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-navy">{o.name}</p>
                {o.teacher_count > 0 && <p className="text-[11px] text-navy/45">{o.teacher_count} teacher(s)</p>}
              </div>
              <button
                type="button"
                onClick={() => remove(o)}
                disabled={o.teacher_count > 0}
                title={o.teacher_count > 0 ? "A teacher has this subject" : "Remove"}
                aria-label={`Remove ${o.name}`}
                className="p-2 rounded-lg text-red-500/70 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <Icon name="Trash2" size={15} />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-navy/45 mb-2">Exam subjects</p>
        <div className="flex flex-wrap gap-1.5">
          {(data?.exam_subjects || []).map((s) => (
            <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-navy/6 text-navy/70">
              {s}
            </span>
          ))}
        </div>
        <p className="text-[11px] text-navy/40 mt-2">These come from the class subjects and the 11th/12th groups (Promotions → Groups).</p>
      </div>
    </div>
  );
}

function TeacherProfile({ teacher, error, onEdit, onDeactivate, onReactivate }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="flex items-center justify-center w-12 h-12 rounded-full bg-navy/8 text-navy text-lg font-bold shrink-0">
          {teacher.full_name.slice(0, 1)}
        </span>
        <div className="min-w-0">
          <p className="font-heading font-bold text-navy text-lg truncate">{teacher.full_name}</p>
          <Badge tone={teacher.is_active ? "success" : "danger"}>{teacher.is_active ? "Active" : "Inactive"}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
        <Field label="Employee ID" value={teacher.employee_id} />
        <Field label="Subject" value={teacher.subject} />
        <Field label="Phone" value={teacher.phone} />
      </div>

      {error && <Banner tone="error">{error}</Banner>}

      <div className="flex items-center gap-3 mt-2">
        <button
          type="button"
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-1.5 bg-gold text-navy-dark font-semibold text-sm py-3 rounded-full hover:bg-gold-light transition-colors"
        >
          <Icon name="Pencil" size={15} />
          Edit
        </button>
        {teacher.is_active ? (
          <button
            type="button"
            onClick={onDeactivate}
            className="flex-1 flex items-center justify-center gap-1.5 border border-red-200 text-red-600 font-semibold text-sm py-3 rounded-full hover:bg-red-50 transition-colors"
          >
            <Icon name="Trash2" size={15} />
            Delete
          </button>
        ) : (
          <button
            type="button"
            onClick={onReactivate}
            className="flex-1 flex items-center justify-center gap-1.5 border border-emerald-200 text-emerald-700 font-semibold text-sm py-3 rounded-full hover:bg-emerald-50 transition-colors"
          >
            <Icon name="RefreshCw" size={15} />
            Reactivate
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-navy/45 mb-0.5">{label}</p>
      <p className="text-navy font-medium">{value || "—"}</p>
    </div>
  );
}

function TeacherForm({ mode, teacher, onCancel, onSuccess }) {
  const { data: subjectData, reload: reloadSubjects } = useApiResource("/subjects");
  const subjects = subjectNames(subjectData);
  const [form, setForm] = useState(
    mode === "edit"
      ? {
          full_name: teacher.full_name,
          subject: (teacher.subject || "").trim(),
          phone: toMobileDigits(teacher.phone),
          password: "",
          is_active: teacher.is_active,
        }
      : emptyForm
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    // Match legacy free-text values like "tamil" onto the canonical list.
    const subject = subjects.find((s) => s.toLowerCase() === form.subject.trim().toLowerCase());
    if (!subject) {
      setError("Please choose a subject from the list, or add it as a new subject.");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "create") {
        const created = await api.post("/teachers", {
          full_name: form.full_name,
          subject,
          phone: form.phone || undefined,
          password: form.password,
        });
        onSuccess({ ...created, password: form.password });
      } else {
        const updated = await api.patch(`/teachers/${teacher.id}`, {
          full_name: form.full_name,
          subject,
          phone: form.phone || undefined,
          is_active: form.is_active,
        });
        onSuccess(updated);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField label="Full Name" htmlFor="full_name" required>
        <input
          id="full_name"
          name="full_name"
          required
          minLength={2}
          value={form.full_name}
          onChange={handleChange}
          className={inputClass}
        />
      </FormField>
      <FormField
        label="Main Subject"
        htmlFor="subject"
        required
        hint="Shown on their profile. The classes and subjects they actually take are set in Subject Teachers — they can take other subjects too."
      >
        <SubjectPicker
          value={form.subject}
          options={subjects}
          onChange={(subject) => setForm((f) => ({ ...f, subject }))}
          onAdd={async (name) => {
            const res = await api.post("/subjects", { name });
            await reloadSubjects();
            return res.added;
          }}
        />
      </FormField>
      <FormField label="Phone" htmlFor="phone" hint="Optional">
        <input id="phone" name="phone" {...mobileInputProps} value={form.phone} onChange={handleChange} className={inputClass} />
      </FormField>
      {mode === "create" && (
        <FormField label="Temporary Password" htmlFor="password" required hint="Minimum 8 characters. Share this with the teacher.">
          <input
            id="password"
            name="password"
            type="text"
            required
            minLength={8}
            value={form.password}
            onChange={handleChange}
            className={inputClass}
          />
        </FormField>
      )}

      {mode === "edit" && (
        <div className="flex items-center justify-between rounded-2xl border border-navy/10 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-navy">Account Status</p>
            <p className="text-xs text-navy/50">
              {form.is_active ? "Active — can sign in" : "Inactive — cannot sign in"}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.is_active}
            aria-label="Account active"
            onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
            className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${form.is_active ? "bg-emerald-500" : "bg-navy/20"}`}
          >
            <span
              className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                form.is_active ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>
      )}

      {error && <Banner tone="error">{error}</Banner>}

      <div className="flex items-center gap-3 mt-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 bg-gold text-navy-dark font-semibold text-sm py-3 rounded-full hover:bg-gold-light transition-colors disabled:opacity-60"
        >
          {submitting ? "Saving…" : mode === "create" ? "Create Teacher" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-3 rounded-full text-sm font-semibold text-navy/60 hover:text-navy hover:bg-navy/5 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function SubjectPicker({ value, options: all, onChange, onAdd }) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  // Show the full list until the user types something different from the chosen subject.
  const q = query.trim().toLowerCase();
  const options = !q || query === value ? all : all.filter((s) => s.toLowerCase().includes(q));
  // Typed something that isn't a subject yet: offer to add it (e.g. Physical Education).
  const canAdd = Boolean(onAdd) && q.length >= 2 && !all.some((s) => s.toLowerCase() === q);

  const addNew = async () => {
    setAdding(true);
    setAddError("");
    try {
      choose(await onAdd(query.trim()));
    } catch (err) {
      setAddError(err instanceof ApiError ? err.message : "Could not add this subject.");
    } finally {
      setAdding(false);
    }
  };

  const choose = (subject) => {
    onChange(subject);
    setQuery(subject);
    setOpen(false);
  };

  const handleBlur = () => {
    if (adding) return;
    setOpen(false);
    const exact = all.find((s) => s.toLowerCase() === q);
    if (exact) choose(exact);
    else setQuery(value);
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      const step = e.key === "ArrowDown" ? 1 : -1;
      setHighlight((h) => (h + step + options.length) % Math.max(options.length, 1));
    } else if (e.key === "Enter" && open && options[highlight]) {
      e.preventDefault();
      choose(options[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <input
        id="subject"
        role="combobox"
        aria-expanded={open}
        aria-controls="subject-options"
        autoComplete="off"
        placeholder="Type or choose a subject…"
        value={query}
        onFocus={(e) => {
          e.target.select();
          setHighlight(0);
          setOpen(true);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setHighlight(0);
          setOpen(true);
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`${inputClass} pr-9`}
      />
      <Icon
        name="ChevronDown"
        size={16}
        className={`absolute right-3 top-1/2 -translate-y-1/2 text-navy/40 pointer-events-none transition-transform ${open ? "rotate-180" : ""}`}
      />
      {open && (
        <ul
          id="subject-options"
          role="listbox"
          className="absolute z-20 mt-1.5 w-full max-h-60 overflow-y-auto bg-white border border-navy/10 rounded-2xl shadow-lg py-1.5"
        >
          {options.length === 0 && !canAdd && <li className="px-4 py-2.5 text-sm text-navy/40">No matching subject</li>}
          {options.map((s, i) => (
            <li
              key={s}
              role="option"
              aria-selected={s === value}
              // mousedown (not click) so the input's blur doesn't close the list first
              onMouseDown={(e) => {
                e.preventDefault();
                choose(s);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={`flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer ${
                i === highlight ? "bg-navy/[0.06]" : ""
              } ${s === value ? "font-semibold text-navy" : "text-navy/80"}`}
            >
              {s}
              {s === value && <Icon name="Check" size={15} className="text-gold" />}
            </li>
          ))}
          {canAdd && (
            <li
              role="option"
              aria-selected={false}
              onMouseDown={(e) => {
                e.preventDefault();
                if (!adding) addNew();
              }}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gold-dark cursor-pointer border-t border-navy/8 hover:bg-gold/10"
            >
              <Icon name="Plus" size={15} />
              {adding ? "Adding…" : `Add “${query.trim()}” as a new subject`}
            </li>
          )}
        </ul>
      )}
      {addError && <p className="text-xs text-red-600 mt-1">{addError}</p>}
    </div>
  );
}
