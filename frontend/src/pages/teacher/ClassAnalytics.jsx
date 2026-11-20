import { useState } from "react";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import EmptyState from "../../components/portal/EmptyState";
import Card from "../../components/ui/Card";
import { inputClass } from "../../components/portal/FormField";
import AnalyticsReport from "../../components/reports/AnalyticsReport";
import { useApiResource } from "../../hooks/useApiResource";
import { useMyTeacherProfile } from "../../hooks/useMyTeacherProfile";
import { termsForGrade } from "../../constants/academic";
import { ContentSkeleton } from "../../components/ui/Skeleton";

/** Class teacher's analytics for their own class: the HM view scoped to the class, plus the class-only panels. */
export default function ClassAnalytics() {
  const { classCode, loading: loadingProfile } = useMyTeacherProfile();
  const { data: classes } = useApiResource("/classes");
  const [selectedTerm, setTerm] = useState(null);
  const terms = termsForGrade((classes || []).find((c) => c.code === classCode)?.grade);
  const term = selectedTerm && terms.includes(selectedTerm) ? selectedTerm : terms[0];

  if (!loadingProfile && !classCode) {
    return (
      <div>
        <PortalPageHeader title="Class Analytics" />
        <EmptyState
          icon="BarChart3"
          title="You are not a Class Teacher"
          description="Class analytics are available only for your assigned class. Ask the Headmaster to assign you as a Class Teacher first."
        />
      </div>
    );
  }

  return (
    <div>
      <PortalPageHeader
        title={classCode ? `Class Analytics · ${classCode}` : "Class Analytics"}
        description="Results, boys vs girls, exam-to-exam improvement, section comparison, and the students and subjects that need your attention."
      />
      <Card className="p-4 mb-5 flex flex-wrap gap-3 items-center">
        <select value={term} onChange={(e) => setTerm(e.target.value)} className={inputClass + " max-w-[12rem]"} aria-label="Exam">
          {terms.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </Card>
      {classCode ? <AnalyticsReport term={term} classCode={classCode} onPickTerm={setTerm} /> : <ContentSkeleton rows={5} />}
    </div>
  );
}
