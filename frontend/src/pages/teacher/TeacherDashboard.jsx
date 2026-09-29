import { Link } from "react-router-dom";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import StatCard from "../../components/portal/StatCard";
import Card from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import { useApiResource } from "../../hooks/useApiResource";
import { useAuth } from "../../context/AuthContext";

const quickLinks = [
  { to: "/teacher/students/new", label: "Add Student to My Class", icon: "UserPlus" },
  { to: "/teacher/marks", label: "Enter Term Marks", icon: "Pencil" },
  { to: "/teacher/students", label: "View Class Students", icon: "GraduationCap" },
];

export default function TeacherDashboard() {
  const { user } = useAuth();
  const { data, loading, error } = useApiResource("/dashboards/teacher");

  const isClassTeacher = Boolean(data?.class_code);

  return (
    <div>
      <PortalPageHeader
        title={`Welcome back, ${user?.full_name || "Teacher"}`}
        description={data?.subject ? `${data.subject} · ${data?.class_code ? `Class Teacher of ${data.class_code}` : "Subject Teacher"}` : undefined}
      />

      {error && <p className="text-sm text-red-600 mb-4">Could not load the dashboard. {error.message}</p>}

      {!loading && !isClassTeacher && (
        <Card className="p-4 mb-6 flex items-center gap-3 border-amber-200 bg-amber-50/60">
          <Icon name="AlertTriangle" size={18} className="text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            You are not currently assigned as a Class Teacher. You can still enter marks for classes/subjects you
            teach, but class-scoped tools (attendance, add student, class notices) need a Class Teacher assignment.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Class Strength" value={loading ? undefined : data?.student_count ?? "—"} icon="GraduationCap" tone="navy" />
        <StatCard
          label="Pending Certificate Requests"
          value={loading ? undefined : data?.pending_certificate_requests ?? "—"}
          icon="FileCheck2"
          tone="gold"
        />
        <StatCard label="Weekly Periods" value={loading ? undefined : (data?.timetable || []).length} icon="Clock" tone="teal" />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
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
      </div>
    </div>
  );
}
