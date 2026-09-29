import { Link } from "react-router-dom";
import PortalPageHeader from "../../components/portal/PortalPageHeader";
import StatCard from "../../components/portal/StatCard";
import Card from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Badge from "../../components/ui/Badge";
import { useApiResource } from "../../hooks/useApiResource";
import { useAuth } from "../../context/AuthContext";
import { formatDate } from "../../utils/formatDate";

const quickActions = [
  { to: "/admin/teachers", label: "Add Teacher", icon: "UserPlus" },
  { to: "/admin/class-teachers", label: "Assign Class Teacher", icon: "UserCog" },
  { to: "/admin/students", label: "Browse Students", icon: "GraduationCap" },
  { to: "/admin/notices", label: "Post a Notice", icon: "Bell" },
  { to: "/admin/certificates", label: "Certificates", icon: "FileCheck2" },
  { to: "/admin/gallery", label: "Manage Gallery", icon: "Images" },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data, loading, error } = useApiResource("/dashboards/admin");

  return (
    <div>
      <PortalPageHeader
        title={`Welcome back, ${user?.full_name || "Admin"}`}
        description="Here is what's happening across the school today."
      />

      {error && <p className="text-sm text-red-600 mb-4">Could not load the dashboard. {error.message}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Classes" value={loading ? undefined : data?.class_count} icon="School" tone="navy" />
        <StatCard label="Teachers" value={loading ? undefined : data?.teacher_count} icon="Users" tone="teal" />
        <StatCard label="Students" value={loading ? undefined : data?.student_count} icon="GraduationCap" tone="gold" />
        <StatCard
          label="Pending Certificates"
          value={loading ? undefined : data?.pending_certificate_requests}
          icon="FileCheck2"
          tone="navy"
        />
        <StatCard
          label="Open Complaints"
          value={loading ? undefined : data?.open_complaint_threads}
          icon="MessageSquare"
          tone="danger"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-heading font-bold text-navy mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="flex flex-col items-start gap-2 p-4 rounded-2xl border border-navy/8 hover:border-gold/40 hover:bg-gold/5 transition-colors"
              >
                <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-navy/8 text-navy">
                  <Icon name={action.icon} size={17} />
                </span>
                <span className="text-sm font-semibold text-navy">{action.label}</span>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-bold text-navy">Recent Notices</h2>
            <Link to="/admin/notices" className="text-xs font-semibold text-gold-dark hover:text-gold">
              View all
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {!loading && (data?.recent_notices || []).length === 0 && (
              <p className="text-sm text-navy/50">No notices posted yet.</p>
            )}
            {(data?.recent_notices || []).map((notice) => (
              <div key={notice.id} className="pb-3 border-b border-navy/6 last:border-0 last:pb-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold text-navy truncate">{notice.title}</p>
                  <Badge tone="navy">{notice.audience}</Badge>
                </div>
                <p className="text-xs text-navy/50">{formatDate(notice.created_at)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
