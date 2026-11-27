import { useState } from "react";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Banner from "../../components/portal/Banner";
import EmptyState from "../../components/portal/EmptyState";
import ConfirmDialog from "../../components/portal/ConfirmDialog";
import FormField, { inputClass } from "../../components/portal/FormField";
import { ContentSkeleton } from "../../components/ui/Skeleton";
import { useApiResource } from "../../hooks/useApiResource";
import { useToast } from "../../components/ui/Toast";
import { api, ApiError } from "../../lib/apiClient";
import { addDays, dayLabel, nextSchoolDay, slotKey } from "../../constants/homework";

/**
 * Teacher: give homework to the classes they teach (one class + subject at a time) and see what they have given.
 * Class Notices stays for notices; the HM checks homework against each day's timetable.
 */
export default function Homework() {
  const toast = useToast();
  const { data: setup, loading: loadingSetup, error: setupError, reload: reloadSetup } = useApiResource("/homework/setup", { live: "homework" });
  const { data: given, loading, reload } = useApiResource("/homework", { live: "homework" });
  const [slot, setSlot] = useState("");
  const [details, setDetails] = useState("");
  const [givenOn, setGivenOn] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null); // { id, details, due_on }
  const [removing, setRemoving] = useState(null);
  const [filter, setFilter] = useState("all");

  if (loadingSetup) return <ContentSkeleton rows={5} />;
  if (setupError) return <Banner tone="error">{setupError.message}</Banner>;

  const header = (
    <PortalPageHeader
      title="Homework"
      description="Give homework to the classes you teach. Students see it in their portal; the Headmaster checks it against each day's timetable."
    />
  );
  if (!setup.slots?.length) {
    return (
      <div>
        {header}
        <EmptyState icon="ClipboardList" title="No subjects assigned" description="You have no subject–class assignments this year. Ask the Headmaster to assign your subjects first." />
      </div>
    );
  }

  const today = setup.today;
  // Default to the first class with a period today that has no homework yet, else the first class.
  const fallback = setup.slots.find((s) => s.periods_today.length && !s.given_today) || setup.slots[0];
  const slotValue = slot || slotKey(fallback);
  const given_on = givenOn || today;
  const due_on = dueOn || nextSchoolDay(given_on);
  const todaySlots = setup.slots.filter((s) => s.periods_today.length);
  const list = (given || []).filter((h) => filter === "all" || slotKey(h) === filter);

  const refresh = () => {
    reload();
    reloadSetup();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (details.trim().length < 2) return setError("Write the homework.");
    const [class_code, subject] = slotValue.split("|");
    setSaving(true);
    setError("");
    try {
      await api.post("/homework", { class_code, subject, details: details.trim(), given_on, due_on });
      toast.success(`Homework given to ${class_code} · ${subject}`);
      setDetails("");
      setDueOn("");
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    try {
      await api.patch(`/homework/${editing.id}`, { details: editing.details.trim(), due_on: editing.due_on });
      setEditing(null);
      reload();
    } catch (err) {
      toast.error?.(err instanceof ApiError ? err.message : "Could not save.");
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/homework/${removing.id}`);
      setRemoving(null);
      refresh();
    } catch (err) {
      toast.error?.(err instanceof ApiError ? err.message : "Could not delete.");
    }
  };

  return (
    <div>
      {header}

      <div className="grid lg:grid-cols-5 gap-5 mb-5">
        <Card className="p-5 lg:col-span-3">
          <h2 className="font-heading font-bold text-navy text-sm mb-4">Give homework</h2>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <FormField label="Class · Subject" htmlFor="hw-slot" required>
              <div id="hw-slot" className="flex flex-wrap gap-2">
                {setup.slots.map((s) => (
                  <button
                    key={slotKey(s)}
                    type="button"
                    onClick={() => setSlot(slotKey(s))}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm border transition-colors ${
                      slotValue === slotKey(s) ? "bg-navy text-white border-navy" : "bg-white text-navy border-navy/15 hover:border-gold"
                    }`}
                  >
                    {s.class_code} · {s.subject}
                    {s.given_today && <Icon name="Check" size={14} className={slotValue === slotKey(s) ? "text-emerald-300" : "text-emerald-600"} />}
                  </button>
                ))}
              </div>
            </FormField>
            <FormField label="Homework" htmlFor="hw-details" required>
              <textarea
                id="hw-details"
                rows={4}
                value={details}
                maxLength={2000}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="e.g. Unit 3 – answer the 2-mark questions 1 to 10 in the notebook"
                className={inputClass}
              />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Given on" htmlFor="hw-given" required>
                <input
                  id="hw-given"
                  type="date"
                  value={given_on}
                  min={addDays(today, -7)}
                  max={today}
                  onChange={(e) => setGivenOn(e.target.value)}
                  className={inputClass}
                />
              </FormField>
              <FormField label="Submit by" htmlFor="hw-due" required>
                <input id="hw-due" type="date" value={due_on} min={given_on} onChange={(e) => setDueOn(e.target.value)} className={inputClass} />
              </FormField>
            </div>
            {error && <Banner tone="error">{error}</Banner>}
            <button
              type="submit"
              disabled={saving}
              className="bg-gold text-navy-dark font-semibold text-sm py-3 rounded-full hover:bg-gold-light transition-colors disabled:opacity-60"
            >
              {saving ? "Saving…" : "Give Homework"}
            </button>
          </form>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h2 className="font-heading font-bold text-navy text-sm">Today · {setup.weekday}</h2>
          <p className="text-xs text-navy/50 mb-3">Your periods today, from the timetable</p>
          {todaySlots.length === 0 ? (
            <p className="text-sm text-navy/50">No periods of your subjects today.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {todaySlots.map((s) => (
                <li key={slotKey(s)} className="flex items-center gap-2 text-sm">
                  <Icon name={s.given_today ? "CircleCheck" : "CircleAlert"} size={16} className={s.given_today ? "text-emerald-600" : "text-amber-500"} />
                  <span className="font-medium text-navy">
                    {s.class_code} · {s.subject}
                  </span>
                  <span className="text-xs text-navy/45">Period {s.periods_today.join(", ")}</span>
                  <span className={`ml-auto text-xs font-semibold ${s.given_today ? "text-emerald-600" : "text-amber-600"}`}>
                    {s.given_today ? "Given" : "Not given yet"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <h2 className="font-heading font-bold text-navy text-sm">Homework you have given</h2>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className={`${inputClass} !w-auto !py-1.5 text-xs ml-auto`}>
            <option value="all">All classes</option>
            {setup.slots.map((s) => (
              <option key={slotKey(s)} value={slotKey(s)}>
                {s.class_code} · {s.subject}
              </option>
            ))}
          </select>
        </div>
        {loading && <ContentSkeleton rows={3} />}
        {!loading && list.length === 0 && <p className="text-sm text-navy/50">No homework given yet.</p>}
        <div className="flex flex-col">
          {list.map((h) => (
            <div key={h.id} className="py-3 border-b border-navy/6 last:border-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-sm font-semibold text-navy">
                  {h.class_code} · {h.subject}
                </span>
                <span className="text-xs text-navy/50">
                  Given {dayLabel(h.given_on)} · Submit by {dayLabel(h.due_on)}
                </span>
                {editing?.id !== h.id && (
                  <span className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing({ id: h.id, details: h.details, due_on: h.due_on })}
                      className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg text-navy hover:bg-navy/6"
                    >
                      <Icon name="Pencil" size={13} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setRemoving(h)}
                      className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg text-red-600 hover:bg-red-50"
                    >
                      <Icon name="Trash2" size={13} /> Delete
                    </button>
                  </span>
                )}
              </div>
              {editing?.id === h.id ? (
                <div className="mt-2 flex flex-col gap-2">
                  <textarea
                    rows={3}
                    value={editing.details}
                    maxLength={2000}
                    onChange={(e) => setEditing((x) => ({ ...x, details: e.target.value }))}
                    className={inputClass}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-xs text-navy/60" htmlFor={`due-${h.id}`}>
                      Submit by
                    </label>
                    <input
                      id={`due-${h.id}`}
                      type="date"
                      value={editing.due_on}
                      min={h.given_on}
                      onChange={(e) => setEditing((x) => ({ ...x, due_on: e.target.value }))}
                      className={`${inputClass} !w-auto !py-1.5 text-xs`}
                    />
                    <button
                      type="button"
                      disabled={editing.details.trim().length < 2}
                      onClick={saveEdit}
                      className="ml-auto bg-gold text-navy-dark font-semibold text-xs px-4 py-1.5 rounded-full hover:bg-gold-light disabled:opacity-60"
                    >
                      Save
                    </button>
                    <button type="button" onClick={() => setEditing(null)} className="text-xs font-semibold px-3 py-1.5 rounded-full text-navy/60 hover:bg-navy/6">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-navy/70 mt-1 whitespace-pre-line">{h.details}</p>
              )}
            </div>
          ))}
        </div>
      </Card>

      <ConfirmDialog
        open={Boolean(removing)}
        title="Delete this homework?"
        message={removing ? `${removing.class_code} · ${removing.subject} — given ${dayLabel(removing.given_on)}. Students will no longer see it.` : ""}
        confirmLabel="Delete"
        danger
        onConfirm={remove}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}
