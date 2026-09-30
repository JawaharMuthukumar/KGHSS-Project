import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import Banner from "../../components/portal/Banner";
import { useApiResource } from "../../hooks/useApiResource";
import { formatDate } from "../../utils/formatDate";

export default function MyProfile() {
  const { data: profile, loading, error } = useApiResource("/students/me/profile");

  return (
    <div>
      <PortalPageHeader title="My Profile" description="Your personal and academic details." />

      {error && <Banner tone="error" className="mb-4">{error.message}</Banner>}
      {loading && <p className="text-sm text-navy/50">Loading…</p>}

      {profile && (
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
            <Field label="Medium" value={profile.medium} />
            <Field label="EMIS No" value={profile.emis_no} />
            <Field label="UMIS No" value={profile.umis_no} />
            <Field label="Father's Name" value={profile.father_name} />
            <Field label="Mother's Name" value={profile.mother_name} />
            <Field label="Guardian Phone" value={profile.guardian_phone} />
            <Field label="Address" value={profile.address} full />
          </div>
        </Card>
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
