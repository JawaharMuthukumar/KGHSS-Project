import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import Icon from "../ui/Icon";
import ComplaintFab from "./ComplaintFab";
import { useAuth } from "../../context/AuthContext";
import { portalNav, roleLabels } from "./navConfig";
import { selectTeacherClass, useMyTeacherProfile } from "../../hooks/useMyTeacherProfile";
import { useAutoCapitalize } from "../../hooks/useAutoCapitalize";
import { AlertsProvider, useAlerts } from "../../context/AlertsContext";
import { formatDate } from "../../utils/formatDate";

/** Lets a teacher who is Class Teacher of several sections pick which one the portal pages work on. */
function TeacherClassSwitcher() {
  const { classCode, classes } = useMyTeacherProfile();
  if (classes.length < 2) return null;
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="hidden sm:inline text-navy/55 font-medium">My class</span>
      <select
        value={classCode || ""}
        onChange={(e) => selectTeacherClass(e.target.value)}
        className="rounded-xl border border-navy/15 bg-white px-3 py-1.5 font-semibold text-navy focus:outline-none focus:border-gold"
      >
        {classes.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code}
            {c.group_name ? ` · ${c.group_name}` : ""}
            {c.medium ? ` · ${c.medium}` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

function CountBadge({ count, className = "" }) {
  if (!count) return null;
  return (
    <span className={`min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center leading-none ${className}`}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

const kindIcons = { certificate: "FileCheck2", leave: "CalendarDays" };

/** Header bell: everything waiting on this user, plus unread notices. */
function NotificationBell() {
  const { items, unreadNotices, noticePath, counts } = useAlerts();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const total = (counts.certificates || 0) + (counts.leave || 0) + (unreadNotices || 0);

  const go = (to) => {
    setOpen(false);
    navigate(to);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={total ? `${total} notifications` : "Notifications"}
        aria-expanded={open}
        className="relative flex items-center justify-center w-10 h-10 rounded-full text-navy/70 hover:text-navy hover:bg-navy/5 transition-colors"
      >
        <Icon name="Bell" size={20} />
        <CountBadge count={total} className="absolute -top-0.5 -right-0.5" />
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-transparent hover:bg-transparent"
          />
          <div className="absolute right-0 mt-2 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-white border border-navy/8 shadow-lg py-2">
            <p className="px-4 pb-2 text-sm font-heading font-bold text-navy border-b border-navy/8">Notifications</p>
            <div className="max-h-96 overflow-y-auto">
              {unreadNotices > 0 && (
                <button type="button" onClick={() => go(noticePath)} className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-navy/[0.04]">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gold/15 text-gold-dark shrink-0">
                    <Icon name="Bell" size={15} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-navy">
                      {unreadNotices} new notice{unreadNotices === 1 ? "" : "s"}
                    </span>
                    <span className="block text-xs text-navy/50">Tap to read</span>
                  </span>
                </button>
              )}
              {items.map((item) => (
                <button key={item.key} type="button" onClick={() => go(item.to)} className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-navy/[0.04]">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-navy/8 text-navy shrink-0">
                    <Icon name={kindIcons[item.kind] || "Bell"} size={15} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-navy">{item.title}</span>
                    <span className="block text-xs text-navy/60 truncate">{item.detail}</span>
                    {item.created_at && <span className="block text-[11px] text-navy/40">{formatDate(item.created_at)}</span>}
                  </span>
                </button>
              ))}
              {!items.length && !unreadNotices && <p className="px-4 py-6 text-sm text-center text-navy/45">You're all caught up.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function PortalLayout({ role }) {
  const { user } = useAuth();
  return (
    <AlertsProvider key={user?.username} role={role} username={user?.username}>
      <PortalShell role={role} />
    </AlertsProvider>
  );
}

function PortalShell({ role }) {
  const { user, logout } = useAuth();
  const { counts } = useAlerts();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const items = portalNav[role] || [];
  useAutoCapitalize(role === "admin" || role === "teacher");

  const handleLogout = () => {
    logout();
    navigate(`/login/${role === "student" ? "student" : role}`, { replace: true });
  };

  return (
    <div className="portal-shell min-h-svh flex bg-mist">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-navy-dark/60 lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 z-50 h-svh w-72 shrink-0 bg-navy-dark text-white flex flex-col transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div className="w-10 h-10 rounded-xl bg-heritage-gradient flex items-center justify-center font-heading font-bold text-sm shrink-0">
            GK
          </div>
          <div className="min-w-0">
            <p className="font-heading font-bold text-sm leading-tight truncate">GHSS Kangayampalayam</p>
            <p className="text-[11px] text-white/50">{roleLabels[role]}</p>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="ml-auto text-white/60 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <Icon name="X" size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? "bg-gold text-navy-dark" : "text-white/70 hover:text-white hover:bg-white/8"
                }`
              }
            >
              <Icon name={item.icon} size={17} />
              <span className="truncate">{item.label}</span>
              <CountBadge count={item.badge && counts[item.badge]} className="ml-auto shrink-0" />
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-3 bg-white border-b border-navy/8 px-5 py-3.5">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="text-navy/70 hover:text-navy lg:hidden"
            aria-label="Open menu"
          >
            <Icon name="Menu" size={22} />
          </button>
          {role === "teacher" && <TeacherClassSwitcher />}
          <div className="ml-auto">
            <NotificationBell />
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex items-center gap-3 rounded-xl px-2 py-1 hover:bg-navy/5 transition-colors"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-navy leading-tight">{user?.full_name}</p>
                <p className="text-[11px] text-navy/50">{user?.username}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-navy/8 text-navy flex items-center justify-center font-semibold text-sm shrink-0">
                {(user?.full_name || "?").slice(0, 1).toUpperCase()}
              </div>
              <Icon
                name="ChevronDown"
                size={16}
                className={`text-navy/50 transition-transform ${menuOpen ? "rotate-180" : ""}`}
              />
            </button>

            {menuOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => setMenuOpen(false)}
                  className="fixed inset-0 z-40 cursor-default bg-transparent hover:bg-transparent"
                />
                <div
                  role="menu"
                  className="absolute right-0 mt-2 z-50 w-56 rounded-xl bg-white border border-navy/8 shadow-lg py-1.5"
                >
                  <div className="px-4 py-2.5 border-b border-navy/8 sm:hidden">
                    <p className="text-sm font-semibold text-navy leading-tight truncate">{user?.full_name}</p>
                    <p className="text-[11px] text-navy/50 truncate">{user?.username}</p>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Icon name="LogOut" size={17} />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 p-5 lg:p-7 max-w-[1440px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {role === "student" && <ComplaintFab />}
    </div>
  );
}
