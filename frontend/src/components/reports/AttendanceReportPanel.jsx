import { useState } from "react";
import Card from "../ui/Card";
import Icon from "../ui/Icon";
import Badge from "../ui/Badge";
import Banner from "../portal/Banner";
import { inputClass } from "../portal/FormField";
import { useApiResource } from "../../hooks/useApiResource";
import { api } from "../../lib/apiClient";

export default function AttendanceReportPanel({ classCode, canUnlock = false }) {
  const [tab, setTab] = useState("months");
  const { data, loading, error, reload } = useApiResource(`/classes/${classCode}/attendance`, {
    enabled: Boolean(classCode),
    deps: [classCode],
  });
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [unlocking, setUnlocking] = useState(null);

  const months = data || [];
  const active = selectedMonth ? months.find((m) => m.month === selectedMonth) : months[0];

  const classAverage = (record) =>
    record?.records.length
      ? Math.round(record.records.reduce((sum, r) => sum + r.percentage, 0) / record.records.length)
      : 0;

  const handleUnlock = async (month) => {
    setUnlocking(month);
    try {
      await api.post(`/classes/${classCode}/attendance/${month}/unlock`);
      reload();
    } finally {
      setUnlocking(null);
    }
  };

  if (error) return <Banner tone="error">{error.message}</Banner>;
  if (loading) return <p className="text-sm text-navy/50">Loading…</p>;
  if (months.length === 0) return <Card className="p-8 text-center text-navy/50">No attendance recorded yet.</Card>;

  return (
    <div>
      <div className="flex gap-1 mb-5 border-b border-navy/8">
        {["months", "detail"].map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === key ? "border-gold text-navy" : "border-transparent text-navy/45 hover:text-navy"
            }`}
          >
            {key === "months" ? "By Month" : "Student Detail"}
          </button>
        ))}
      </div>

      {tab === "months" && (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-navy/45 border-b border-navy/8">
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3">Working Days</th>
                <th className="px-4 py-3">Students</th>
                <th className="px-4 py-3">Average</th>
                <th className="px-4 py-3">Status</th>
                {canUnlock && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.month} className="border-b border-navy/6 last:border-0">
                  <td className="px-4 py-3 font-medium text-navy">{m.month}</td>
                  <td className="px-4 py-3 text-navy/70">{m.total_days}</td>
                  <td className="px-4 py-3 text-navy/70">{m.records.length}</td>
                  <td className="px-4 py-3 text-navy/70">{classAverage(m)}%</td>
                  <td className="px-4 py-3">
                    <Badge tone={m.locked ? "danger" : "success"}>{m.locked ? "Locked" : "Open"}</Badge>
                  </td>
                  {canUnlock && (
                    <td className="px-4 py-3 text-right">
                      {m.locked && (
                        <button
                          type="button"
                          disabled={unlocking === m.month}
                          onClick={() => handleUnlock(m.month)}
                          className="flex items-center gap-1 text-xs font-semibold text-navy hover:bg-navy/6 px-2.5 py-1.5 rounded-lg ml-auto"
                        >
                          <Icon name="RefreshCw" size={13} />
                          Unlock
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "detail" && (
        <div>
          <select
            value={selectedMonth || months[0]?.month}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className={inputClass + " max-w-[10rem] mb-4"}
          >
            {months.map((m) => (
              <option key={m.month} value={m.month}>
                {m.month}
              </option>
            ))}
          </select>

          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-navy/45 border-b border-navy/8">
                  <th className="px-4 py-3">Student ID</th>
                  <th className="px-4 py-3 text-center">Present</th>
                  <th className="px-4 py-3 text-center">Absent</th>
                  <th className="px-4 py-3 text-center">%</th>
                </tr>
              </thead>
              <tbody>
                {(active?.records || []).map((r) => (
                  <tr key={r.student_id} className="border-b border-navy/6 last:border-0">
                    <td className="px-4 py-2.5 text-navy/70">#{r.student_id}</td>
                    <td className="px-4 py-2.5 text-center text-navy">{r.present_days}</td>
                    <td className="px-4 py-2.5 text-center text-navy/60">{r.absent_days}</td>
                    <td className="px-4 py-2.5 text-center font-semibold text-navy">{r.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}
