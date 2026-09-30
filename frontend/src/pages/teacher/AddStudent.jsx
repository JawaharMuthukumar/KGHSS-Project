import { useState } from "react";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/portal/EmptyState";
import Banner from "../../components/portal/Banner";
import FormField, { inputClass } from "../../components/portal/FormField";
import { useMyTeacherProfile } from "../../hooks/useMyTeacherProfile";
import { api, ApiError } from "../../lib/apiClient";

const emptyForm = {
  full_name: "",
  gender: "",
  date_of_birth: "",
  blood_group: "",
  community: "",
  medium: "",
  admission_no: "",
  emis_no: "",
  umis_no: "",
  father_name: "",
  mother_name: "",
  guardian_phone: "",
  address: "",
};

const communities = ["OTH", "BC", "BCM", "MBC", "SC", "SCA", "ST"];

export default function AddStudent() {
  const { classCode, loading: loadingProfile } = useMyTeacherProfile();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const payload = { ...form, class_code: classCode, password: form.guardian_phone };
      Object.keys(payload).forEach((key) => {
        if (payload[key] === "") delete payload[key];
      });
      const result = await api.post("/students", payload);
      setCreated({ ...result, password: form.guardian_phone });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!loadingProfile && !classCode) {
    return (
      <div>
        <PortalPageHeader title="Add Student" />
        <EmptyState
          icon="UserPlus"
          title="You are not a Class Teacher"
          description="Only the assigned Class Teacher can enroll students. Ask an admin to assign you as a Class Teacher first."
        />
      </div>
    );
  }

  if (created) {
    return (
      <div>
        <PortalPageHeader title="Add Student" description={`Class ${classCode}`} />
        <Card className="p-6 max-w-md">
          <Banner tone="success" className="mb-4">Student enrolled successfully.</Banner>
          <div className="bg-navy-dark text-white rounded-2xl p-5 mb-5">
            <p className="text-xs text-white/50 uppercase tracking-wide mb-1">Register No (Login)</p>
            <p className="font-heading font-bold text-lg mb-4">{created.registration_no}</p>
            <p className="text-xs text-white/50 uppercase tracking-wide mb-1">Password (Parent's Mobile)</p>
            <p className="font-heading font-bold text-lg">{created.password}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setForm(emptyForm);
              setCreated(null);
            }}
            className="w-full bg-gold text-navy-dark font-semibold text-sm py-3 rounded-full hover:bg-gold-light transition-colors"
          >
            Add Another Student
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PortalPageHeader title="Add Student" description={`Class ${classCode}`} />

      <form onSubmit={handleSubmit} className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5 flex flex-col gap-4">
          <h2 className="font-heading font-bold text-navy text-sm">Student Details</h2>
          <FormField label="Full Name" htmlFor="full_name" required>
            <input id="full_name" name="full_name" required minLength={2} value={form.full_name} onChange={handleChange} className={inputClass} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Gender" htmlFor="gender">
              <select id="gender" name="gender" value={form.gender} onChange={handleChange} className={inputClass}>
                <option value="">Select…</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </FormField>
            <FormField label="Date of Birth" htmlFor="date_of_birth">
              <input id="date_of_birth" name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} className={inputClass} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Blood Group" htmlFor="blood_group">
              <input id="blood_group" name="blood_group" placeholder="e.g. O+" value={form.blood_group} onChange={handleChange} className={inputClass} />
            </FormField>
            <FormField label="Medium" htmlFor="medium">
              <select id="medium" name="medium" value={form.medium} onChange={handleChange} className={inputClass}>
                <option value="">Select…</option>
                <option value="TM">Tamil</option>
                <option value="EM">English</option>
              </select>
            </FormField>
          </div>
          <FormField label="Community" htmlFor="community">
            <select id="community" name="community" value={form.community} onChange={handleChange} className={inputClass}>
              <option value="">Select…</option>
              {communities.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </FormField>
        </Card>

        <div className="flex flex-col gap-5">
          <Card className="p-5 flex flex-col gap-4">
            <h2 className="font-heading font-bold text-navy text-sm">Identification Numbers</h2>
            <FormField label="Admission No" htmlFor="admission_no" hint="Optional, auto-generated if left blank">
              <input id="admission_no" name="admission_no" value={form.admission_no} onChange={handleChange} className={inputClass} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="EMIS No" htmlFor="emis_no">
                <input id="emis_no" name="emis_no" value={form.emis_no} onChange={handleChange} className={inputClass} />
              </FormField>
              <FormField label="UMIS No" htmlFor="umis_no">
                <input id="umis_no" name="umis_no" value={form.umis_no} onChange={handleChange} className={inputClass} />
              </FormField>
            </div>
          </Card>

          <Card className="p-5 flex flex-col gap-4">
            <h2 className="font-heading font-bold text-navy text-sm">Parent / Guardian Details</h2>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Father's Name" htmlFor="father_name">
                <input id="father_name" name="father_name" value={form.father_name} onChange={handleChange} className={inputClass} />
              </FormField>
              <FormField label="Mother's Name" htmlFor="mother_name">
                <input id="mother_name" name="mother_name" value={form.mother_name} onChange={handleChange} className={inputClass} />
              </FormField>
            </div>
            <FormField
              label="Parent's Mobile"
              htmlFor="guardian_phone"
              required
              hint="This becomes the student's login password — the student/guardian can change it later."
            >
              <input
                id="guardian_phone"
                name="guardian_phone"
                required
                pattern="[0-9]{10}"
                title="10-digit mobile number"
                value={form.guardian_phone}
                onChange={handleChange}
                className={inputClass}
              />
            </FormField>
            <FormField label="Address" htmlFor="address">
              <textarea id="address" name="address" rows={2} value={form.address} onChange={handleChange} className={inputClass} />
            </FormField>
          </Card>

          {error && <Banner tone="error">{error}</Banner>}

          <button
            type="submit"
            disabled={submitting}
            className="bg-gold text-navy-dark font-semibold text-sm py-3.5 rounded-full hover:bg-gold-light transition-colors disabled:opacity-60"
          >
            {submitting ? "Enrolling…" : "Enroll Student"}
          </button>
        </div>
      </form>
    </div>
  );
}
