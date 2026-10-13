import { useEffect, useState } from "react";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Banner from "../../components/portal/Banner";
import EmptyState from "../../components/portal/EmptyState";
import { inputClass } from "../../components/portal/FormField";
import { useMyTeacherProfile } from "../../hooks/useMyTeacherProfile";
import { api, ApiError } from "../../lib/apiClient";

/** Keeps a typed day count to digits only, drops leading zeros, and caps it at `max`. Empty stays empty while editing. */
function sanitizeDays(raw, max) {
  const digits = String(raw).replace(/\D/g, "");
  if (digits === "") return "";
  return String(Math.min(Number(digits), max));
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function TakeAttendance() {
  const { classCode, loading: loadingProfile } = useMyTeacherProfile();
  const [month, setMonth] = useState(currentMonth());
  const [totalDays, setTotalDays] = useState(22);
  const [students, setStudents] = useState(null);
  const [present, setPresent] = useState({});
  const [leaveDays, setLeaveDays] = useState({}); // approved normal leave (Mon–Fri days) per student this month
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!classCode) return;
    setError("");
    setSuccess("");
    Promise.all([
      api.get("/students", { query: { class_code: classCode } }),
      api.get(`/classes/${classCode}/attendance`, { query: { month } }),
      api.get(`/classes/${classCode}/leave-days`, { query: { month } }),
    ])
      .then(([studentRes, attendanceRes, leaveRes]) => {
        setStudents(studentRes);
        setLeaveDays(leaveRes.leave_days);
        const record = attendanceRes[0];
        if (record) {
          setTotalDays(record.total_days);
          setLocked(record.locked);
          const map = {};
          record.records.forEach((r) => {
            map[r.student_id] = r.present_days;
          });
          setPresent(map);
        } else {
          setLocked(false);
          setPresent(Object.fromEntries(studentRes.map((s) => [s.id, s.id in present ? present[s.id] : 0])));
        }
      })
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classCode, month]);

  const markAllPresent = () => {
    setPresent(Object.fromEntries((students || []).map((s) => [s.id, Math.max(Number(totalDays) - (leaveDays[s.id] || 0), 0)])));
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");
    if (!Number(totalDays)) {
      setError("Enter the total working days (1–31) before saving.");
      return;
    }
    setSaving(true);
    try {
      await api.put(`/classes/${classCode}/attendance`, {
        month,
        total_days: Number(totalDays),
        records: Object.fromEntries((students || []).map((s) => [s.id, Number(present[s.id]) || 0])),
      });
      setLocked(true);
      setSuccess("Attendance saved and locked for this month.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  if (!loadingProfile && !classCode) {
    return (
      <div>
        <PortalPageHeader title="Take Attendance" />
        <EmptyState
          icon="ClipboardCheck"
          title="You are not a Class Teacher"
          description="Only the assigned Class Teacher can record attendance for a class."
        />
      </div>
    );
  }

  const classAverage =
    students && students.length && totalDays
      ? Math.round(
          (Object.values(present).reduce((a, b) => a + Number(b || 0), 0) * 100) / (students.length * totalDays)
        )
      : 0;

  return (
    <div>
      <PortalPageHeader title="Take Attendance" description={classCode ? `Class ${classCode}` : undefined} />

      <Card className="p-4 mb-5 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-semibold text-navy/70 mb-1.5">Month</label>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-navy/70 mb-1.5">Total Working Days</label>
          <input
            type="number"
            min={1}
            max={31}
            value={totalDays}
            disabled={locked}
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const next = sanitizeDays(e.target.value, 31);
              setTotalDays(next);
              // Lowering the working days pulls any present count above it back down.
              const cap = Number(next) || 0;
              if (next !== "")
                setPresent((prev) =>
                  Object.fromEntries(Object.entries(prev).map(([id, v]) => [id, v === "" ? v : Math.min(Number(v), cap)]))
                );
            }}
            className={inputClass + " w-28"}
          />
        </div>
        <button
          type="button"
          disabled={locked}
          onClick={markAllPresent}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold text-navy border border-navy/15 hover:bg-navy/5 transition-colors disabled:opacity-50"
        >
          <Icon name="Check" size={15} />
          Mark All Present
        </button>
        <div className="ml-auto text-right">
          <p className="text-xs text-navy/45">Class Average</p>
          <p className="font-heading font-bold text-navy text-lg">{classAverage}%</p>
        </div>
      </Card>

      {error && <Banner tone="error" className="mb-4">{error}</Banner>}
      {success && <Banner tone="success" className="mb-4">{success}</Banner>}
      {locked && !success && (
        <Banner tone="info" className="mb-4">
          This month is locked. Ask an admin to unlock it from Attendance Report if you need to make changes.
        </Banner>
      )}

      {!locked && Object.keys(leaveDays).length > 0 && (
        <Banner tone="info" className="mb-4">
          Approved leave is counted as absent — "Mark All Present" already subtracts each student's leave days.
        </Banner>
      )}

      {students && (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-navy/45 border-b border-navy/8">
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3 text-center">Present Days</th>
                <th className="px-4 py-3 text-center">Absent Days</th>
                <th className="px-4 py-3 text-center">Approved Leave</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const p = Number(present[s.id]) || 0;
                return (
                  <tr key={s.id} className="border-b border-navy/6 last:border-0">
                    <td className="px-4 py-2.5 font-medium text-navy">{s.full_name}</td>
                    <td className="px-4 py-2.5 text-center">
                      <input
                        type="number"
                        min={0}
                        max={totalDays}
                        disabled={locked}
                        value={present[s.id] ?? ""}
                        placeholder="0"
                        onFocus={(e) => e.target.select()}
                        onChange={(e) =>
                          setPresent((prev) => ({ ...prev, [s.id]: sanitizeDays(e.target.value, Number(totalDays) || 0) }))
                        }
                        className="w-20 px-2 py-1.5 rounded-lg border border-navy/15 text-center disabled:bg-navy/5"
                      />
                    </td>
                    <td className="px-4 py-2.5 text-center text-navy/60">{Math.max((Number(totalDays) || 0) - p, 0)}</td>
                    <td className="px-4 py-2.5 text-center text-navy/60">{leaveDays[s.id] || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {students && !locked && (
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="mt-5 bg-gold text-navy-dark font-semibold text-sm px-6 py-3 rounded-full hover:bg-gold-light transition-colors disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Attendance"}
        </button>
      )}
    </div>
  );
}
