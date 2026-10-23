import { useState } from "react";
import Card from "../ui/Card";
import Icon from "../ui/Icon";
import Badge from "../ui/Badge";
import Banner from "../portal/Banner";
import Drawer from "../portal/Drawer";
import ConfirmDialog from "../portal/ConfirmDialog";
import FormField, { inputClass } from "../portal/FormField";
import { TableSkeleton } from "../ui/Skeleton";
import { useApiResource } from "../../hooks/useApiResource";
import { useToast } from "../ui/Toast";
import { api, ApiError } from "../../lib/apiClient";

const MEDIUM_SUFFIX = { Tamil: "", English: "1" };
const errorText = (err, fallback) => (err instanceof ApiError ? err.message : fallback);

/** HM: higher-secondary groups (subjects) and their 11th/12th classes, used by 10th → 11th promotion. */
export default function GroupsManager() {
  const { data, loading, error, reload } = useApiResource("/groups");
  const [editing, setEditing] = useState(null); // null | "new" | group
  const [addingClass, setAddingClass] = useState(false);
  const [hiding, setHiding] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const toggleIntake = async (cls) => {
    try {
      await api.patch(`/groups/classes/${cls.code}`, { intake_open: !cls.intake_open });
      await reload();
      toast.success(`${cls.code} ${cls.intake_open ? "closed for" : "open to"} 10th students`);
    } catch (err) {
      toast.error(errorText(err, "Could not update this class."));
    }
  };

  const hide = async () => {
    setBusy(true);
    try {
      await api.post(`/groups/classes/${hiding.code}/hide`);
      toast.success(`${hiding.code} hidden`);
      setHiding(null);
      await reload();
    } catch (err) {
      toast.error(errorText(err, "Could not hide this class."));
    } finally {
      setBusy(false);
    }
  };

  const removeGroup = async () => {
    setBusy(true);
    try {
      await api.delete(`/groups/${deleting.id}`);
      toast.success(`${deleting.name} removed`);
      setDeleting(null);
      await reload();
    } catch (err) {
      toast.error(errorText(err, "Could not remove this group."));
    } finally {
      setBusy(false);
    }
  };

  if (error) return <Banner tone="error">{error.message}</Banner>;

  const classes = data?.classes || [];
  const eleventh = classes.filter((c) => c.grade === 11);
  const twelfth = classes.filter((c) => c.grade === 12);

  return (
    <div className="flex flex-col gap-6">
      <Banner>
        Only 11th classes that are <strong>open for 10th students</strong> appear in the 10th class teachers' promotion list. Closing or adding a
        group never affects students already in 11th or 12th — they finish in their own group.
      </Banner>

      {/* Groups and their subjects */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-heading font-bold text-navy">Groups</h2>
            <p className="text-xs text-navy/50 mt-0.5">{(data?.languages || ["Tamil", "English"]).join(" and ")} are added to every group.</p>
          </div>
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="flex items-center gap-1.5 bg-gold text-navy-dark font-semibold text-sm px-4 py-2.5 rounded-full hover:bg-gold-light transition-colors"
          >
            <Icon name="Plus" size={15} />
            Add Group
          </button>
        </div>
        {loading && <TableSkeleton rows={3} columns={3} />}
        <div className="flex flex-col divide-y divide-navy/6">
          {(data?.groups || []).map((g) => (
            <div key={g.id} className="flex flex-wrap items-start gap-3 py-3">
              <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-navy/8 text-navy font-heading font-bold text-sm shrink-0">
                {g.letter}
              </span>
              <div className="flex-1 min-w-[12rem]">
                <p className="font-semibold text-navy">{g.name}</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {g.subjects.map((s) => (
                    <span key={s.subject} className="text-xs px-2.5 py-1 rounded-full bg-navy/6 text-navy/75">
                      {s.subject}
                      {s.practical && <span className="text-gold-dark font-semibold"> · Practical</span>}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-navy/45 mt-1.5">
                  {g.class_codes.length ? `Classes: ${g.class_codes.join(", ")}` : "No classes yet"}
                </p>
              </div>
              {g.locked ? (
                <Badge tone="navy">
                  <Icon name="Lock" size={12} />
                  In use · subjects locked
                </Badge>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(g)}
                    className="flex items-center gap-1 text-xs font-semibold text-navy border border-navy/15 px-3 py-1.5 rounded-full hover:bg-navy/5"
                  >
                    <Icon name="Pencil" size={13} />
                    Edit
                  </button>
                  {g.can_delete && (
                    <button
                      type="button"
                      onClick={() => setDeleting(g)}
                      aria-label={`Delete ${g.name}`}
                      className="flex items-center gap-1 text-xs font-semibold text-red-600 px-3 py-1.5 rounded-full hover:bg-red-50"
                    >
                      <Icon name="Trash2" size={13} />
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* 11th and 12th classes */}
      <Card className="p-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-3">
          <div>
            <h2 className="font-heading font-bold text-navy">11th &amp; 12th Classes</h2>
            <p className="text-xs text-navy/50 mt-0.5">11th students always move up to the 12th class with the same section.</p>
          </div>
          <button
            type="button"
            onClick={() => setAddingClass(true)}
            disabled={!data?.groups?.length}
            className="flex items-center gap-1.5 text-sm font-semibold text-navy border border-navy/15 px-4 py-2.5 rounded-full hover:bg-navy/5 disabled:opacity-50"
          >
            <Icon name="Plus" size={15} />
            Add Class
          </button>
        </div>
        <ClassTable title="11th Standard" rows={eleventh} loading={loading} onToggle={toggleIntake} onHide={setHiding} />
        <ClassTable title="12th Standard" rows={twelfth} loading={loading} onHide={setHiding} />
      </Card>

      <Drawer open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === "new" ? "Add Group" : `Edit ${editing?.name || ""}`}>
        {editing && (
          <GroupForm
            key={editing === "new" ? "new" : editing.id}
            group={editing === "new" ? null : editing}
            onSaved={async () => {
              setEditing(null);
              await reload();
            }}
          />
        )}
      </Drawer>

      <Drawer open={addingClass} onClose={() => setAddingClass(false)} title="Add 11th Class">
        {addingClass && (
          <ClassForm
            groups={data?.groups || []}
            existing={classes.map((c) => c.code)}
            onSaved={async () => {
              setAddingClass(false);
              await reload();
            }}
          />
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleting)}
        danger
        title={`Delete the ${deleting?.name} group?`}
        message="It has no classes, students or marks. You can add it again later from Add Group."
        confirmLabel="Yes, delete"
        busy={busy}
        onConfirm={removeGroup}
        onCancel={() => setDeleting(null)}
      />

      <ConfirmDialog
        open={Boolean(hiding)}
        danger
        title={`Hide ${hiding?.code}?`}
        message="It disappears from class lists and can't take students. Its old marks and records stay saved, and adding the same group class again brings it back."
        confirmLabel="Yes, hide"
        busy={busy}
        onConfirm={hide}
        onCancel={() => setHiding(null)}
      />
    </div>
  );
}

function ClassTable({ title, rows, loading, onToggle, onHide }) {
  const isEleventh = Boolean(onToggle);
  return (
    <div className="border-t border-navy/8">
      <p className="px-5 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-navy/45">{title}</p>
      <table className="table-cards w-full text-sm">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-navy/45 border-b border-navy/8">
            <th className="px-5 py-2.5">Class</th>
            <th className="px-4 py-2.5">Seats</th>
            <th className="px-4 py-2.5">Students</th>
            <th className="px-4 py-2.5">{isEleventh ? "Moves up to" : "Comes from"}</th>
            {isEleventh && <th className="px-4 py-2.5">Open for 10th</th>}
            <th className="px-4 py-2.5"></th>
          </tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan={6} className="p-0"><TableSkeleton rows={3} columns={5} /></td></tr>}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={6} className="px-5 py-6 text-center text-navy/40">No classes.</td>
            </tr>
          )}
          {rows.map((c) => (
            <tr key={c.code} className="border-b border-navy/6 last:border-0">
              <td className="tc-primary px-5 py-3">
                <p className="font-semibold text-navy">{c.code}</p>
                <p className="text-xs text-navy/45">{[c.group_name, c.medium].filter(Boolean).join(" · ")}</p>
              </td>
              <td data-label="Seats" className="px-4 py-3 text-navy/70">{c.strength ?? "—"}</td>
              <td data-label="Students" className="px-4 py-3 text-navy/70">{c.student_count}</td>
              <td data-label={isEleventh ? "Moves up to" : "Comes from"} className="px-4 py-3">
                {c.partner_code ? (
                  <span className="font-medium text-navy">{c.partner_code}</span>
                ) : (
                  <span className="text-xs text-amber-700">{isEleventh ? "No 12th class" : "No 11th class feeds it"}</span>
                )}
              </td>
              {isEleventh && (
                <td data-label="Open for 10th" className="px-4 py-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={c.intake_open}
                    aria-label={`${c.code} open for 10th students`}
                    onClick={() => onToggle(c)}
                    className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${c.intake_open ? "bg-emerald-500" : "bg-navy/20"}`}
                  >
                    <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${c.intake_open ? "translate-x-5" : ""}`} />
                  </button>
                </td>
              )}
              <td className="tc-full px-4 py-3 md:text-right">
                <button
                  type="button"
                  onClick={() => onHide(c)}
                  disabled={!c.can_hide}
                  title={c.hide_blocker || "Hide this empty class"}
                  className="text-xs font-semibold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-full disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  Hide
                </button>
                {!c.can_hide && <p className="text-[11px] text-navy/40 md:max-w-[14rem] md:ml-auto">{c.hide_blocker}</p>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GroupForm({ group, onSaved }) {
  const [name, setName] = useState(group?.name || "");
  const [subjects, setSubjects] = useState(group?.subjects?.length ? group.subjects : [{ subject: "", practical: false }]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const toast = useToast();

  const setRow = (i, patch) => setSubjects((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    const rows = subjects.filter((s) => s.subject.trim());
    if (!rows.length) return setFormError("Add at least one subject.");
    setSaving(true);
    try {
      const body = { name: name.trim(), subjects: rows.map((s) => ({ subject: s.subject.trim(), practical: s.practical })) };
      if (group) await api.put(`/groups/${group.id}`, body);
      else await api.post("/groups", body);
      toast.success(group ? "Group updated" : "Group added");
      onSaved();
    } catch (err) {
      setFormError(errorText(err, "Could not save this group."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <FormField label="Group name" htmlFor="g-name" required hint="e.g. Commerce, or P/C/M/B">
        <input id="g-name" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </FormField>
      <div>
        <p className="block text-xs font-semibold text-navy/70 mb-1.5">Core subjects (after Tamil and English)</p>
        <div className="flex flex-col gap-2">
          {subjects.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={s.subject}
                onChange={(e) => setRow(i, { subject: e.target.value })}
                placeholder={`Subject ${i + 1}`}
                aria-label={`Subject ${i + 1}`}
                className={inputClass}
              />
              <label className="flex items-center gap-1.5 text-xs font-medium text-navy/70 whitespace-nowrap">
                <input type="checkbox" checked={s.practical} onChange={(e) => setRow(i, { practical: e.target.checked })} className="accent-gold w-4 h-4" />
                Practical
              </label>
              <button
                type="button"
                onClick={() => setSubjects((rows) => rows.filter((_, j) => j !== i))}
                disabled={subjects.length === 1}
                aria-label={`Remove subject ${i + 1}`}
                className="p-2 rounded-lg text-red-500/70 hover:text-red-600 hover:bg-red-50 disabled:opacity-30"
              >
                <Icon name="Trash2" size={15} />
              </button>
            </div>
          ))}
        </div>
        {subjects.length < 6 && (
          <button
            type="button"
            onClick={() => setSubjects((rows) => [...rows, { subject: "", practical: false }])}
            className="mt-2 flex items-center gap-1 text-xs font-semibold text-gold-dark hover:text-gold"
          >
            <Icon name="Plus" size={13} />
            Add subject
          </button>
        )}
        <p className="text-xs text-navy/40 mt-2">
          Practical subjects are marked Theory 70 + Practical 20 + Internal 10; others Theory 90 + Internal 10.
        </p>
      </div>
      {formError && <Banner tone="error">{formError}</Banner>}
      <button
        type="submit"
        disabled={saving}
        className="bg-gold text-navy-dark font-semibold text-sm py-3 rounded-full hover:bg-gold-light transition-colors disabled:opacity-60"
      >
        {saving ? "Saving…" : group ? "Save Group" : "Add Group"}
      </button>
    </form>
  );
}

function ClassForm({ groups, existing, onSaved }) {
  const [groupId, setGroupId] = useState(groups[0]?.id || "");
  const [medium, setMedium] = useState("Tamil");
  const [strength, setStrength] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const toast = useToast();

  const group = groups.find((g) => g.id === Number(groupId));
  const section = group ? group.letter + MEDIUM_SUFFIX[medium] : "";
  const exists = existing.includes(`11${section}`);

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      const res = await api.post("/groups/classes", { group_id: Number(groupId), medium, strength: strength ? Number(strength) : null });
      toast.success(`Created ${res.created.join(" and ")}`);
      onSaved();
    } catch (err) {
      setFormError(errorText(err, "Could not add this class."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <FormField label="Group" htmlFor="c-group" required>
        <select id="c-group" value={groupId} onChange={(e) => setGroupId(e.target.value)} className={inputClass}>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.letter} · {g.name}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Medium" htmlFor="c-medium" required>
        <select id="c-medium" value={medium} onChange={(e) => setMedium(e.target.value)} className={inputClass}>
          <option value="Tamil">Tamil</option>
          <option value="English">English</option>
        </select>
      </FormField>
      <FormField label="Seats (sanctioned strength)" htmlFor="c-seats">
        <input id="c-seats" type="number" min={1} max={200} value={strength} onChange={(e) => setStrength(e.target.value)} className={inputClass} />
      </FormField>
      {section && (
        <Banner tone={exists ? "error" : "info"}>
          {exists ? `11${section} already exists.` : `Creates 11${section}, and 12${section} for next year if it isn't there yet.`}
        </Banner>
      )}
      {formError && <Banner tone="error">{formError}</Banner>}
      <button
        type="submit"
        disabled={saving || !group || exists}
        className="bg-gold text-navy-dark font-semibold text-sm py-3 rounded-full hover:bg-gold-light transition-colors disabled:opacity-60"
      >
        {saving ? "Adding…" : "Add Class"}
      </button>
    </form>
  );
}
