import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import Card from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Banner from "../../components/portal/Banner";
import Drawer from "../../components/portal/Drawer";
import StudentProfilePanel from "../../components/portal/StudentProfilePanel";
import { inputClass } from "../../components/portal/FormField";
import { useApiResource } from "../../hooks/useApiResource";
import { TableSkeleton } from "../../components/ui/Skeleton";
import DownloadButton from "../../components/ui/DownloadButton";

const th = "px-4 py-3";

/**
 * HM's student browser. Opens on a class-wise summary (boys / girls / total / class teacher); a row opens that
 * class's students (`?class=6A`, so the browser's Back returns to the summary). Search finds a student school-wide.
 */
export default function Students() {
  const [params, setParams] = useSearchParams();
  const classCode = params.get("class") || "";
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const { data: classes, loading: classesLoading, error: classesError } = useApiResource("/classes");
  // Students load only for an opened class or a search — never the whole school list by default.
  const { data: students, loading, error, reload } = useApiResource("/students", {
    query: classCode ? { class_code: classCode } : {},
    deps: [classCode, Boolean(q)],
    enabled: Boolean(classCode || q),
  });
  const [activeStudent, setActiveStudent] = useState(null);

  const openClass = (code) => {
    setSearch("");
    setParams(code ? { class: code } : {});
  };

  const filtered = useMemo(() => {
    const list = students || [];
    if (!q) return list;
    return list.filter((s) => s.full_name.toLowerCase().includes(q) || s.registration_no.toLowerCase().includes(q));
  }, [students, q]);

  const totals = useMemo(
    () =>
      (classes || []).reduce(
        (t, c) => ({ boys: t.boys + (c.boys || 0), girls: t.girls + (c.girls || 0), total: t.total + (c.student_count || 0) }),
        { boys: 0, girls: 0, total: 0 }
      ),
    [classes]
  );
  const current = (classes || []).find((c) => c.code === classCode);
  const showStudents = Boolean(classCode || q);

  return (
    <div>
      <PortalPageHeader
        title={classCode ? `Students · ${classCode}` : "Students"}
        description={
          classCode
            ? [current?.group_name, current?.medium && `${current.medium} medium`, current?.class_teacher_name && `Class teacher: ${current.class_teacher_name}`]
                .filter(Boolean)
                .join(" · ") || "Students of this class."
            : "Class-wise strength. Open a class to see its students."
        }
        actions={
          <DownloadButton
            path="/exports/students.csv"
            query={{ class_code: classCode || undefined }}
            filename={`students_${classCode || "all"}.csv`}
            label={classCode ? `Download ${classCode} CSV` : "Download all (CSV)"}
          />
        }
      />

      <Card className="p-4 mb-5 flex flex-wrap gap-3 items-center">
        {classCode && (
          <button
            type="button"
            onClick={() => openClass("")}
            className="flex items-center gap-1.5 text-sm font-semibold text-navy border border-navy/15 rounded-full px-4 py-2 hover:border-gold"
          >
            <Icon name="ArrowLeft" size={15} />
            All classes
          </button>
        )}
        <div className="relative flex-1 min-w-[200px]">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/35" />
          <input
            type="text"
            placeholder={classCode ? `Search ${classCode} by name or register number…` : "Search any student by name or register number…"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputClass} pl-9`}
          />
        </div>
      </Card>

      {!showStudents && (
        <>
          {classesError && <Banner tone="error" className="mb-4">Could not load classes. {classesError.message}</Banner>}
          <Card className="p-0 overflow-hidden">
            <table className="table-cards w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-navy/45 border-b border-navy/8">
                  <th className={th}>Class</th>
                  <th className={`${th} text-center`}>Boys</th>
                  <th className={`${th} text-center`}>Girls</th>
                  <th className={`${th} text-center`}>Total</th>
                  <th className={th}>Class Teacher</th>
                  <th className={th}></th>
                </tr>
              </thead>
              <tbody>
                {classesLoading && <tr><td colSpan={6} className="p-0"><TableSkeleton rows={8} columns={5} /></td></tr>}
                {(classes || []).map((c) => (
                  <tr
                    key={c.code}
                    onClick={() => openClass(c.code)}
                    className="border-b border-navy/6 last:border-0 hover:bg-navy/[0.05] cursor-pointer"
                  >
                    <td className="tc-primary px-4 py-3">
                      <p className="font-semibold text-navy">{c.code}</p>
                      <p className="text-xs text-navy/45">{[c.group_name, c.medium].filter(Boolean).join(" · ")}</p>
                    </td>
                    <td data-label="Boys" className="px-4 py-3 text-navy/80 md:text-center">{c.boys ?? "—"}</td>
                    <td data-label="Girls" className="px-4 py-3 text-navy/80 md:text-center">{c.girls ?? "—"}</td>
                    <td data-label="Total" className="px-4 py-3 font-semibold text-navy md:text-center">{c.student_count}</td>
                    <td data-label="Class Teacher" className="px-4 py-3 text-navy/80">{c.class_teacher_name || <span className="text-navy/40">Not assigned</span>}</td>
                    <td className="tc-aside px-4 py-3 text-right">
                      <Icon name="ChevronRight" size={16} className="text-navy/30" />
                    </td>
                  </tr>
                ))}
                {!classesLoading && (classes || []).length > 0 && (
                  <tr className="bg-navy/[0.04] font-bold text-navy">
                    <td className="tc-primary px-4 py-3">All classes</td>
                    <td data-label="Boys" className="px-4 py-3 md:text-center">{totals.boys}</td>
                    <td data-label="Girls" className="px-4 py-3 md:text-center">{totals.girls}</td>
                    <td data-label="Total" className="px-4 py-3 md:text-center">{totals.total}</td>
                    <td className="px-4 py-3 max-md:hidden"></td>
                    <td className="px-4 py-3 max-md:hidden"></td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {showStudents && (
        <>
          {error && <Banner tone="error" className="mb-4">Could not load students. {error.message}</Banner>}
          <Card className="p-0 overflow-hidden">
            <table className="table-cards w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-navy/45 border-b border-navy/8">
                  <th className={th}>Student</th>
                  <th className={th}>Register No</th>
                  <th className={th}>Class</th>
                  <th className={th}>Gender</th>
                  <th className={th}>Guardian Phone</th>
                  <th className={th}></th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={6} className="p-0"><TableSkeleton rows={6} columns={5} /></td></tr>}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-navy/40">No students found.</td>
                  </tr>
                )}
                {!loading &&
                  filtered.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => setActiveStudent(s.id)}
                      className="border-b border-navy/6 last:border-0 hover:bg-navy/[0.05] cursor-pointer"
                    >
                      <td className="tc-primary px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-navy/8 text-navy text-xs font-bold shrink-0">
                            {s.full_name.slice(0, 1)}
                          </span>
                          <span className="font-medium text-navy">{s.full_name}</span>
                        </div>
                      </td>
                      <td data-label="Register No" className="px-4 py-3 text-navy/70">{s.registration_no}</td>
                      <td data-label="Class" className="px-4 py-3 text-navy/70">{s.class_code}</td>
                      <td data-label="Gender" className="px-4 py-3 text-navy/70">{s.gender || "—"}</td>
                      <td data-label="Guardian Phone" className="px-4 py-3 text-navy/70">{s.guardian_phone || "—"}</td>
                      <td className="tc-aside px-4 py-3 text-right">
                        <Icon name="ChevronRight" size={16} className="text-navy/30" />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      <Drawer open={Boolean(activeStudent)} onClose={() => setActiveStudent(null)} title="Student Profile">
        {activeStudent && <StudentProfilePanel studentId={activeStudent} editable onSaved={reload} />}
      </Drawer>
    </div>
  );
}
