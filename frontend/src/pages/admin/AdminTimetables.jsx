import { useState } from "react";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import { inputClass } from "../../components/portal/FormField";
import ClassTimetableEditor from "../../components/timetable/ClassTimetableEditor";
import { useApiResource } from "../../hooks/useApiResource";

export default function AdminTimetables() {
  const { data: classes } = useApiResource("/classes");
  const [classCode, setClassCode] = useState("");

  return (
    <div>
      <PortalPageHeader title="Timetables" description="View or edit any class's weekly timetable." />

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

      {classCode && <ClassTimetableEditor key={classCode} classCode={classCode} />}
    </div>
  );
}
