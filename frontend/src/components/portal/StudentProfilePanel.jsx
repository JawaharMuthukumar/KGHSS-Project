import { useEffect, useState } from "react";
import Banner from "./Banner";
import { api } from "../../lib/apiClient";
import { formatDate } from "../../utils/formatDate";

export default function StudentProfilePanel({ studentId }) {
  const [tab, setTab] = useState("profile");
  const [profile, setProfile] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setProfile(null);
    setResults(null);
    api.get(`/students/${studentId}`).then(setProfile).catch((err) => setError(err.message));
  }, [studentId]);

  useEffect(() => {
    if (tab === "results" && !results) {
      api.get(`/students/${studentId}/results`).then(setResults).catch((err) => setError(err.message));
    }
  }, [tab, studentId, results]);

  if (error) return <Banner tone="error">{error}</Banner>;
  if (!profile) return <p className="text-sm text-navy/50">Loading…</p>;

  return (
    <div>
      <div className="flex gap-1 mb-5 border-b border-navy/8">
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
      </div>

      {tab === "profile" && (
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
      )}

      {tab === "results" && (
        <div>
          {!results && <p className="text-sm text-navy/50">Loading…</p>}
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
