import { useState } from "react";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import Banner from "../../components/portal/Banner";
import { inputClass } from "../../components/portal/FormField";
import AttendanceReportPanel from "../../components/reports/AttendanceReportPanel";
import { useApiResource } from "../../hooks/useApiResource";

export default function AdminAttendanceReport() {
  const { data: classes } = useApiResource("/classes");
  const [classCode, setClassCode] = useState("");

  const { data: schoolWide, loading: loadingSchoolWide, error: schoolWideError } = useApiResource("/reports/attendance");

  return (
    <div>
      <PortalPageHeader title="Attendance Report" description="Monthly attendance by class, with admin unlock." />

      <Card className="p-4 mb-5">
        <select value={classCode} onChange={(e) => setClassCode(e.target.value)} className={inputClass + " max-w-[10rem]"}>
          <option value="">Select a class…</option>
          {(classes || []).map((c) => (
            <option key={c.code} value={c.code}>
              {c.code}
            </option>
          ))}
        </select>
      </Card>

      {classCode && <AttendanceReportPanel classCode={classCode} canUnlock />}

      <div className="mt-8">
        <h2 className="font-heading font-bold text-navy text-base mb-3">School-wide Attendance</h2>
        {schoolWideError && <Banner tone="error">{schoolWideError.message}</Banner>}
        {!loadingSchoolWide && schoolWide && (
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-navy/45 border-b border-navy/8">
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Months Marked</th>
                  <th className="px-4 py-3">Average %</th>
                </tr>
              </thead>
              <tbody>
                {schoolWide.classes.map((c) => (
                  <tr key={c.class_code} className="border-b border-navy/6 last:border-0">
                    <td className="px-4 py-2.5 font-medium text-navy">{c.class_code}</td>
                    <td className="px-4 py-2.5 text-navy/70">{c.months_marked}</td>
                    <td className="px-4 py-2.5 text-navy/70">{c.average_percent != null ? `${c.average_percent}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
