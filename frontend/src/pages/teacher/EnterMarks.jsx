import { useState } from "react";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import EmptyState from "../../components/portal/EmptyState";
import MarksEntryPanel from "../../components/marks/MarksEntryPanel";
import SubjectMarksPanel from "../../components/marks/SubjectMarksPanel";
import SubjectSubmissionsPanel from "../../components/marks/SubjectSubmissionsPanel";
import { useMyTeacherProfile } from "../../hooks/useMyTeacherProfile";
import { useApiResource } from "../../hooks/useApiResource";

/**
 * My Class: the class teacher enters every subject (as before) and accepts subject teachers' marks.
 * My Subjects: any teacher enters only the subjects they take, then sends them to the class teacher.
 */
export default function EnterMarks() {
  const { classCode, profile, loading: loadingProfile } = useMyTeacherProfile();
  const { data: classes } = useApiResource("/classes");
  const academicYear = (classes || []).find((c) => c.code === classCode)?.academic_year || "2026-2027";
  // Periods like PET or Library have no marks, so only exam subjects are listed.
  const { data: schoolSubjects } = useApiResource("/subjects");
  const nonExam = new Set((schoolSubjects?.other_subjects || []).map((o) => o.name.toLowerCase()));
  const pairs = (profile?.subject_classes || []).filter((p) => !nonExam.has(p.subject.toLowerCase()));
  const [tab, setTab] = useState(null);
  const [version, setVersion] = useState(0); // remount the class grid after subject marks are accepted
  const active = tab || (classCode ? "class" : "subjects");

  if (!loadingProfile && !classCode && !pairs.length) {
    return (
      <div>
        <PortalPageHeader title="Enter Marks" />
        <EmptyState
          icon="Pencil"
          title="No classes assigned yet"
          description="Ask the HM to assign you as a Class Teacher, or as a subject teacher (Admin → Subject Teachers)."
        />
      </div>
    );
  }

  return (
    <div>
      <PortalPageHeader
        title="Enter Marks"
        description={active === "class" ? `Class ${classCode} · all subjects` : "Only the subjects you take, class by class"}
      />

      {classCode && pairs.length > 0 && (
        <div className="flex items-center gap-1 mb-5 border-b border-navy/8" role="tablist">
          {[
            ["class", `My Class (${classCode})`],
            ["subjects", "My Subjects"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active === key}
              onClick={() => setTab(key)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                active === key ? "border-gold text-navy" : "border-transparent text-navy/45 hover:text-navy"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {active === "class" && classCode && (
        <>
          <SubjectSubmissionsPanel classCode={classCode} onApplied={() => setVersion((v) => v + 1)} />
          <MarksEntryPanel key={`${classCode}-${version}`} classCode={classCode} academicYear={academicYear} />
        </>
      )}
      {/* Wait for the subject list so PET-style periods are filtered out before the first pick. */}
      {active === "subjects" && schoolSubjects && pairs.length > 0 && <SubjectMarksPanel pairs={pairs} />}
    </div>
  );
}
