import { useState } from "react";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Banner from "../../components/portal/Banner";
import FormField, { inputClass } from "../../components/portal/FormField";
import { useApiResource } from "../../hooks/useApiResource";
import { ContentSkeleton } from "../../components/ui/Skeleton";
import { formatDate } from "../../utils/formatDate";
import { api, ApiError } from "../../lib/apiClient";
import { useToast } from "../../components/ui/Toast";
import { BLOOD_GROUPS, normalizeBloodGroup } from "../../constants/academic";
import { capitalizeFirst, capitalizeWords } from "../../hooks/useAutoCapitalize";

// The only fields a student may change themselves (mirrors backend StudentSelfUpdate).
const EDITABLE = ["date_of_birth", "blood_group", "father_name", "mother_name", "address"];
const mediumLabels = { TM: "Tamil", EM: "English" };

export default function MyProfile() {
  const { data: profile, loading, error, setData } = useApiResource("/students/me/profile");
  const [editing, setEditing] = useState(false);

  return (
    <div>
      <PortalPageHeader
        title="My Profile"
        description="Your personal and academic details."
        actions={
          profile &&
          !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 bg-gold text-navy-dark font-semibold text-sm px-5 py-2.5 rounded-full hover:bg-gold-light transition-colors"
            >
              <Icon name="Pencil" size={15} />
              Edit Profile
            </button>
          )
        }
      />

      {error && <Banner tone="error" className="mb-4">{error.message}</Banner>}
      {loading && <ContentSkeleton rows={3} />}

      {profile && !editing && (
        <Card className="p-6 max-w-2xl">
          <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
            <Field label="Full Name" value={profile.full_name} />
            <Field label="Register No" value={profile.registration_no} />
            <Field label="Class" value={profile.class_code} />
            <Field label="Admission No" value={profile.admission_no} />
            <Field label="Gender" value={profile.gender} />
            <Field label="Date of Birth" value={profile.date_of_birth ? formatDate(profile.date_of_birth) : null} />
            <Field label="Blood Group" value={profile.blood_group} />
            <Field label="Community" value={profile.community} />
            <Field label="Medium" value={mediumLabels[profile.medium] || profile.medium} />
            <Field label="EMIS No" value={profile.emis_no} />
            <Field label="UMIS No" value={profile.umis_no} />
            <Field label="Father's Name" value={profile.father_name} />
            <Field label="Mother's Name" value={profile.mother_name} />
            <Field label="Parent Phone" value={profile.father_phone || profile.mother_phone || profile.guardian_phone} />
            <Field label="Address" value={profile.address} full />
          </div>
        </Card>
      )}

      {profile && editing && (
        <EditForm
          profile={profile}
          onCancel={() => setEditing(false)}
          onSaved={(updated) => {
            setData(updated);
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}

function EditForm({ profile, onCancel, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(() => ({
    date_of_birth: profile.date_of_birth || "",
    blood_group: normalizeBloodGroup(profile.blood_group),
    father_name: profile.father_name || "",
    mother_name: profile.mother_name || "",
    address: profile.address || "",
  }));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const bloodOptions = form.blood_group && !BLOOD_GROUPS.includes(form.blood_group) ? [form.blood_group, ...BLOOD_GROUPS] : BLOOD_GROUPS;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    // Send only what changed; an emptied date goes as null.
    const changes = {};
    EDITABLE.forEach((key) => {
      if (form[key] !== (profile[key] ?? "")) changes[key] = key === "date_of_birth" && !form[key] ? null : form[key];
    });
    if (!Object.keys(changes).length) {
      onCancel();
      return;
    }
    setSaving(true);
    try {
      const updated = await api.patch("/students/me/profile", changes);
      toast.success("Profile updated successfully");
      onSaved(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6 max-w-2xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Banner tone="info">
          You can update these details. For name, class, register / admission number or phone changes, contact your class teacher.
        </Banner>
        <div className="grid sm:grid-cols-2 gap-4">
          <FormField label="Date of Birth" htmlFor="me_dob">
            <input
              id="me_dob"
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={form.date_of_birth}
              onChange={(e) => set("date_of_birth", e.target.value)}
              className={inputClass}
            />
          </FormField>
          <FormField label="Blood Group" htmlFor="me_blood">
            <select id="me_blood" value={form.blood_group} onChange={(e) => set("blood_group", e.target.value)} className={inputClass}>
              <option value="">Select…</option>
              {bloodOptions.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Father's Name" htmlFor="me_father">
            <input
              id="me_father"
              value={form.father_name}
              onChange={(e) => set("father_name", capitalizeWords(e.target.value))}
              className={inputClass}
            />
          </FormField>
          <FormField label="Mother's Name" htmlFor="me_mother">
            <input
              id="me_mother"
              value={form.mother_name}
              onChange={(e) => set("mother_name", capitalizeWords(e.target.value))}
              className={inputClass}
            />
          </FormField>
        </div>
        <FormField label="Address" htmlFor="me_address">
          <textarea
            id="me_address"
            rows={3}
            value={form.address}
            onChange={(e) => set("address", capitalizeFirst(e.target.value))}
            className={inputClass}
          />
        </FormField>

        {error && <Banner tone="error">{error}</Banner>}

        <div className="flex items-center gap-3 mt-1">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 sm:flex-none sm:px-8 bg-gold text-navy-dark font-semibold text-sm py-3 rounded-full hover:bg-gold-light transition-colors disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Changes"}
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
    </Card>
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
