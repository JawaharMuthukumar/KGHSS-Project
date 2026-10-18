import { useEffect, useState } from "react";
import Banner from "./Banner";
import Icon from "../ui/Icon";
import FormField, { inputClass } from "./FormField";
import { api, ApiError } from "../../lib/apiClient";
import { formatDate } from "../../utils/formatDate";
import { ContentSkeleton } from "../ui/Skeleton";
import { BLOOD_GROUPS, normalizeBloodGroup } from "../../constants/academic";

const editableFields = [
  "full_name",
  "admission_no",
  "emis_no",
  "gender",
  "date_of_birth",
  "blood_group",
  "medium",
  "community",
  "father_name",
  "mother_name",
  "father_phone",
  "mother_phone",
  "address",
];

const communities = ["OTH", "BC", "BCM", "MBC", "SC", "SCA", "ST"];
const mediumLabels = { TM: "Tamil", EM: "English" };
// The saved value stays selectable even if it is an old free-text entry outside the list.
const bloodGroupOptions = (current) => (current && !BLOOD_GROUPS.includes(current) ? [current, ...BLOOD_GROUPS] : BLOOD_GROUPS);
const mobileProps = { pattern: "[0-9]{10}", title: "10-digit mobile number", inputMode: "numeric" };

export default function StudentProfilePanel({ studentId, editable = false, onSaved, onDelete }) {
  const [tab, setTab] = useState("profile");
  const [profile, setProfile] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setProfile(null);
    setResults(null);
    setForm(null);
    api.get(`/students/${studentId}`).then(setProfile).catch((err) => setError(err.message));
  }, [studentId]);

  useEffect(() => {
    if (tab === "results" && !results) {
      api.get(`/students/${studentId}/results`).then(setResults).catch((err) => setError(err.message));
    }
  }, [tab, studentId, results]);

  const startEditing = () => {
    setSaveError("");
    const values = Object.fromEntries(editableFields.map((key) => [key, profile[key] ?? ""]));
    values.blood_group = normalizeBloodGroup(values.blood_group);
    setForm(values);
  };

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveError("");
    setSaving(true);
    try {
      // Send only changed fields; an emptied date must go as null, not "".
      const changes = {};
      editableFields.forEach((key) => {
        if (form[key] !== (profile[key] ?? "")) changes[key] = key === "date_of_birth" && !form[key] ? null : form[key];
      });
      const updated = Object.keys(changes).length ? await api.patch(`/students/${studentId}`, changes) : profile;
      setProfile(updated);
      setForm(null);
      onSaved?.(updated);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  if (error) return <Banner tone="error">{error}</Banner>;
  if (!profile) return <ContentSkeleton rows={3} />;

  return (
    <div>
      <div className="flex items-center gap-1 mb-5 border-b border-navy/8">
        {["profile", "results"].map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-semibold capitalize border-b-2 -mb-px transition-colors ${
              tab === key ? "border-gold text-navy" : "border-transparent text-navy/45 hover:text-navy"
            }`}
          >
            {key}
          </button>
        ))}
        {editable && tab === "profile" && !form && (
          <button
            type="button"
            onClick={startEditing}
            className="ml-auto mb-1.5 bg-gold text-navy-dark font-semibold text-sm px-5 py-2 rounded-full hover:bg-gold-light transition-colors"
          >
            Edit Profile
          </button>
        )}
      </div>

      {tab === "profile" && !form && (
        <div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
            <Field label="Full Name" value={profile.full_name} />
            <Field label="Register No" value={profile.registration_no} />
            <Field label="Class" value={profile.class_code} />
            <Field label="Admission No" value={profile.admission_no} />
            <Field label="EMIS No" value={profile.emis_no} />
            <Field label="Gender" value={profile.gender} />
            <Field label="Date of Birth" value={profile.date_of_birth ? formatDate(profile.date_of_birth) : null} />
            <Field label="Blood Group" value={profile.blood_group} />
            <Field label="Medium" value={mediumLabels[profile.medium] || profile.medium} />
            <Field label="Community" value={profile.community} />
            <Field label="Father's Name" value={profile.father_name} />
            <Field label="Mother's Name" value={profile.mother_name} />
            <Field label="Father's Mobile" value={profile.father_phone} />
            <Field label="Mother's Mobile" value={profile.mother_phone} />
            {!profile.father_phone && !profile.mother_phone && <Field label="Guardian Phone" value={profile.guardian_phone} />}
            <Field label="Address" value={profile.address} full />
          </div>
          {editable && onDelete && (
            <button
              type="button"
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                try {
                  await onDelete(profile);
                } finally {
                  setDeleting(false);
                }
              }}
              className="mt-6 w-full flex items-center justify-center gap-1.5 border border-red-200 text-red-600 font-semibold text-sm py-3 rounded-full hover:bg-red-50 transition-colors disabled:opacity-60"
            >
              <Icon name="Trash2" size={15} />
              {deleting ? "Deleting…" : "Delete Student"}
            </button>
          )}
        </div>
      )}

      {tab === "profile" && form && (
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <FormField label="Full Name" htmlFor="edit_full_name" required>
            <input id="edit_full_name" name="full_name" required minLength={2} value={form.full_name} onChange={handleChange} className={inputClass} />
          </FormField>
          <FormField label="Admission No" htmlFor="edit_admission_no" required>
            <input id="edit_admission_no" name="admission_no" required value={form.admission_no} onChange={handleChange} className={inputClass} />
          </FormField>
          <FormField label="EMIS No" htmlFor="edit_emis_no">
            <input id="edit_emis_no" name="emis_no" value={form.emis_no} onChange={handleChange} className={inputClass} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Gender" htmlFor="edit_gender">
              <select id="edit_gender" name="gender" value={form.gender} onChange={handleChange} className={inputClass}>
                <option value="">Select…</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </FormField>
            <FormField label="Date of Birth" htmlFor="edit_date_of_birth">
              <input id="edit_date_of_birth" name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} className={inputClass} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Blood Group" htmlFor="edit_blood_group">
              <select id="edit_blood_group" name="blood_group" value={form.blood_group} onChange={handleChange} className={inputClass}>
                <option value="">Select…</option>
                {bloodGroupOptions(form.blood_group).map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Medium" htmlFor="edit_medium">
              <select id="edit_medium" name="medium" value={form.medium} onChange={handleChange} className={inputClass}>
                <option value="">Select…</option>
                <option value="TM">Tamil</option>
                <option value="EM">English</option>
              </select>
            </FormField>
          </div>
          <FormField label="Community" htmlFor="edit_community">
            <select id="edit_community" name="community" value={form.community} onChange={handleChange} className={inputClass}>
              <option value="">Select…</option>
              {communities.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Father's Name" htmlFor="edit_father_name">
            <input id="edit_father_name" name="father_name" value={form.father_name} onChange={handleChange} className={inputClass} />
          </FormField>
          <FormField label="Mother's Name" htmlFor="edit_mother_name">
            <input id="edit_mother_name" name="mother_name" value={form.mother_name} onChange={handleChange} className={inputClass} />
          </FormField>
          <FormField label="Father's Mobile" htmlFor="edit_father_phone">
            <input id="edit_father_phone" name="father_phone" {...mobileProps} value={form.father_phone} onChange={handleChange} className={inputClass} />
          </FormField>
          <FormField label="Mother's Mobile" htmlFor="edit_mother_phone">
            <input id="edit_mother_phone" name="mother_phone" {...mobileProps} value={form.mother_phone} onChange={handleChange} className={inputClass} />
          </FormField>
          <FormField label="Address" htmlFor="edit_address">
            <textarea id="edit_address" name="address" rows={2} value={form.address} onChange={handleChange} className={inputClass} />
          </FormField>

          {saveError && <Banner tone="error">{saveError}</Banner>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setForm(null)}
              className="flex-1 border border-navy/15 text-navy font-semibold text-sm py-3 rounded-full hover:bg-navy/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-gold text-navy-dark font-semibold text-sm py-3 rounded-full hover:bg-gold-light transition-colors disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      )}

      {tab === "results" && (
        <div>
          {!results && <ContentSkeleton rows={2} />}
          {results && results.results.length === 0 && <p className="text-sm text-navy/50">No marks recorded yet.</p>}
          {results && results.results.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-navy mb-1">
                Overall Average: {results.average_percent != null ? `${results.average_percent}%` : "—"}
              </p>
              {results.results.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-navy/6 last:border-0">
                  <span className="text-navy/70">
                    {r.subject} <span className="text-navy/40">· {r.term}</span>
                  </span>
                  <span className={`font-semibold ${r.absent ? "text-navy/40" : r.score < r.max * 0.35 ? "text-red-600" : "text-navy"}`}>
                    {r.absent ? "Absent" : `${r.score}/${r.max}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, full }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <p className="text-xs text-navy/45 mb-0.5">{label}</p>
      <p className="text-navy font-medium">{value || "—"}</p>
    </div>
  );
}
