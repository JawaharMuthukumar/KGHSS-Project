import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import StatCard from "../../components/portal/StatCard";
import Drawer from "../../components/portal/Drawer";
import StudentProfilePanel from "../../components/portal/StudentProfilePanel";
import Card from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import { useApiResource } from "../../hooks/useApiResource";
import { useMyTeacherProfile } from "../../hooks/useMyTeacherProfile";
import { useAuth } from "../../context/AuthContext";
import { DashboardSkeleton } from "../../components/ui/Skeleton";

const quickLinks = [
  { to: "/teacher/students/new", label: "Add Student to My Class", icon: "UserPlus" },
  { to: "/teacher/marks", label: "Enter Term Marks", icon: "Pencil" },
  { to: "/teacher/students", label: "View Class Students", icon: "GraduationCap" },
];

export default function TeacherDashboard() {
  const { user } = useAuth();
  const { profile: data, loading, error, classCode, classes } = useMyTeacherProfile();

  const isClassTeacher = Boolean(classCode);
  const [search, setSearch] = useState("");
  const [activeStudent, setActiveStudent] = useState(null);
  const { data: students, loading: loadingStudents } = useApiResource("/students", {
    query: { class_code: classCode },
    enabled: isClassTeacher,
    deps: [classCode],
  });

  const roleLine = classes.length
    ? `Class Teacher of ${classes.map((c) => c.code).join(", ")}`
    : "Subject Teacher";

  const query = search.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!query) return [];
    return (students || []).filter(
      (s) =>
        s.full_name.toLowerCase().includes(query) ||
        s.registration_no.toLowerCase().includes(query) ||
        (s.admission_no || "").toLowerCase().includes(query)
    );
  }, [students, query]);

  return (
    <div>
      <PortalPageHeader
        title={`Welcome back, ${user?.full_name || "Teacher"}`}
        description={data ? [data.subject, roleLine].filter(Boolean).join(" · ") : undefined}
        actions={
          isClassTeacher && (
            <div className="relative w-64 max-w-full">
              <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/35" />
              <input
                type="text"
                placeholder={`Search students in ${classCode}…`}
                aria-label={`Find a student in ${classCode}`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setSearch("")}
                className="w-full rounded-full border border-navy/15 bg-white pl-9 pr-3 py-2 text-sm text-navy placeholder:text-navy/35 focus:outline-none focus:border-gold"
              />
              {query && (
                <div className="absolute right-0 mt-1.5 w-80 max-w-[calc(100vw-2rem)] z-30 bg-white border border-navy/10 rounded-2xl shadow-lg p-1.5 flex flex-col gap-0.5">
                  {loadingStudents && <p className="text-sm text-navy/40 px-2 py-2">Loading…</p>}
                  {!loadingStudents && matches.length === 0 && (
                    <p className="text-sm text-navy/40 px-2 py-2">No students match “{search.trim()}”.</p>
                  )}
                  {matches.slice(0, 8).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setActiveStudent(s.id);
                        setSearch("");
                      }}
                      className="flex items-center gap-3 p-2 rounded-xl text-left hover:bg-navy/[0.05] transition-colors"
                    >
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-navy/8 text-navy text-xs font-bold shrink-0">
                        {s.full_name.slice(0, 1)}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-navy truncate">{s.full_name}</span>
                        <span className="block text-xs text-navy/50">{s.registration_no}</span>
                      </span>
                    </button>
                  ))}
                  {matches.length > 8 && (
                    <Link to="/teacher/students" className="text-xs font-semibold text-gold-dark hover:text-gold px-2 py-1.5">
                      {matches.length - 8} more — view all students
                    </Link>
                  )}
                </div>
              )}
            </div>
          )
        }
      />

      {error && <p className="text-sm text-red-600 mb-4">Could not load the dashboard. {error.message}</p>}

      {loading && <DashboardSkeleton />}

      {!loading && !isClassTeacher && (
        <Card className="p-4 mb-6 flex items-center gap-3 border-amber-200 bg-amber-50/60">
          <Icon name="AlertTriangle" size={18} className="text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            You are not currently assigned as a Class Teacher. You can still enter marks for classes/subjects you
            teach, but class-scoped tools (attendance, add student, class notices) need a Class Teacher assignment.
          </p>
        </Card>
      )}

      {!loading && <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          label={data?.strength ? `Enrolled of ${data.strength} · ${classCode}` : "Class Strength"}
          value={loading ? undefined : data?.student_count ?? "—"}
          icon="GraduationCap"
          tone="navy"
          to={isClassTeacher ? "/teacher/students" : undefined}
        />
        <StatCard
          label="Pending Certificate Requests"
          value={loading ? undefined : data?.pending_certificate_requests ?? "—"}
          icon="FileCheck2"
          tone="gold"
          to="/teacher/certificates"
        />
        <StatCard label="Weekly Periods" value={loading ? undefined : (data?.timetable || []).length} icon="Clock" tone="teal" to="/teacher/my-timetable" />
      </div>}

      {!loading && <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <h2 className="font-heading font-bold text-navy mb-4">Quick Links</h2>
          <div className="flex flex-col gap-2">
            {quickLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center gap-3 p-3 rounded-xl border border-navy/8 hover:border-gold/40 hover:bg-gold/5 transition-colors"
              >
                <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-navy/8 text-navy shrink-0">
                  <Icon name={link.icon} size={17} />
                </span>
                <span className="text-sm font-semibold text-navy">{link.label}</span>
                <Icon name="ChevronRight" size={16} className="ml-auto text-navy/30" />
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-bold text-navy">Certificate Requests</h2>
            <Link to="/teacher/certificates" className="text-xs font-semibold text-gold-dark hover:text-gold">
              Review all
            </Link>
          </div>
          <p className="text-sm text-navy/55">
            {loading
              ? "Loading…"
              : data?.pending_certificate_requests
                ? `${data.pending_certificate_requests} request(s) waiting for your decision.`
                : "No pending certificate requests right now."}
          </p>
        </Card>
      </div>}

      <Drawer open={Boolean(activeStudent)} onClose={() => setActiveStudent(null)} title="Student Profile">
        {activeStudent && <StudentProfilePanel studentId={activeStudent} />}
      </Drawer>
    </div>
  );
}
