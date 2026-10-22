export const portalNav = {
  admin: [
    { to: "/admin", label: "Dashboard", icon: "LayoutDashboard", end: true },
    {
      label: "Teachers",
      icon: "Users",
      // A collapsible group: opens on click, and stays open while one of its pages is active.
      children: [
        { to: "/admin/teachers", label: "All Teachers", icon: "Users" },
        { to: "/admin/class-teachers", label: "Class Teacher Assignment", icon: "UserCog" },
        { to: "/admin/subject-teachers", label: "Subject Teachers", icon: "BookOpen" },
      ],
    },
    { to: "/admin/students", label: "Students", icon: "GraduationCap" },
    { to: "/admin/timetables", label: "Timetables", icon: "CalendarRange" },
    { to: "/admin/reports", label: "Results & Reports", icon: "BarChart3" },
    { to: "/admin/attendance-report", label: "Attendance Report", icon: "ClipboardCheck" },
    { to: "/admin/promotions", label: "Promotions", icon: "TrendingUp" },
    { to: "/admin/notices", label: "Notices", icon: "Bell" },
    { to: "/admin/leave-requests", label: "Leave Requests", icon: "CalendarDays", badge: "leave" },
    { to: "/admin/certificates", label: "Certificates", icon: "FileCheck2", badge: "certificates" },
    { to: "/admin/complaints", label: "Complaints", icon: "MessageSquare" },
    { to: "/admin/posts", label: "Posts", icon: "Images" },
    { to: "/admin/contact-messages", label: "Contact Inbox", icon: "Inbox" },
  ],
  teacher: [
    { to: "/teacher", label: "Dashboard", icon: "LayoutDashboard", end: true },
    { to: "/teacher/students", label: "My Class Students", icon: "GraduationCap", end: true },
    { to: "/teacher/students/new", label: "Add Student", icon: "UserPlus" },
    { to: "/teacher/marks", label: "Enter Marks", icon: "Pencil" },
    { to: "/teacher/attendance", label: "Take Attendance", icon: "ClipboardCheck" },
    { to: "/teacher/attendance-report", label: "Attendance Report", icon: "BarChart3" },
    { to: "/teacher/class-timetable", label: "Class Timetable", icon: "CalendarRange" },
    { to: "/teacher/my-timetable", label: "My Timetable", icon: "Clock" },
    { to: "/teacher/notices", label: "Class Notices", icon: "Bell", badge: "notices" },
    { to: "/teacher/leave-requests", label: "Leave Requests", icon: "CalendarDays", badge: "leave" },
    { to: "/teacher/certificates", label: "Certificate Requests", icon: "FileCheck2", badge: "certificates" },
    { to: "/teacher/reports", label: "Reports", icon: "FileText" },
    { to: "/teacher/promotion", label: "Promotion", icon: "TrendingUp" },
  ],
  student: [
    { to: "/student", label: "Dashboard", icon: "LayoutDashboard", end: true },
    { to: "/student/profile", label: "My Profile", icon: "UserRound" },
    { to: "/student/results", label: "Results / Marksheet", icon: "FileText" },
    { to: "/student/timetable", label: "Timetable", icon: "CalendarRange" },
    { to: "/student/notices", label: "Notices", icon: "Bell", badge: "notices" },
    { to: "/student/leave", label: "Leave Request", icon: "CalendarDays" },
    { to: "/student/certificates", label: "Certificates", icon: "FileCheck2", badge: "certificates" },
  ],
};

export const roleLabels = {
  admin: "Admin Portal",
  teacher: "Teacher Portal",
  student: "Student Portal",
};

/**
 * Phone / tablet bottom tab bar (below the lg breakpoint): four everyday pages per role; the fifth
 * "More" tab opens a sheet with the full menu. `badge` keys match the alert counts used in the sidebar.
 */
export const mobileTabs = {
  admin: [
    { to: "/admin", label: "Home", icon: "LayoutDashboard", end: true },
    { to: "/admin/teachers", label: "Teachers", icon: "Users" },
    { to: "/admin/students", label: "Students", icon: "GraduationCap" },
    { to: "/admin/certificates", label: "Requests", icon: "FileCheck2", badge: "certificates" },
  ],
  teacher: [
    { to: "/teacher", label: "Home", icon: "LayoutDashboard", end: true },
    { to: "/teacher/students", label: "Students", icon: "GraduationCap", end: true },
    { to: "/teacher/attendance", label: "Attendance", icon: "ClipboardCheck" },
    { to: "/teacher/notices", label: "Notices", icon: "Bell", badge: "notices" },
  ],
  student: [
    { to: "/student", label: "Home", icon: "LayoutDashboard", end: true },
    { to: "/student/results", label: "Results", icon: "FileText" },
    { to: "/student/timetable", label: "Timetable", icon: "CalendarRange" },
    { to: "/student/notices", label: "Notices", icon: "Bell", badge: "notices" },
  ],
};

/** Flat list of every page in a role's menu (groups expanded), for page titles and the "More" sheet. */
export const flatNav = (role) => (portalNav[role] || []).flatMap((item) => item.children || [item]);
