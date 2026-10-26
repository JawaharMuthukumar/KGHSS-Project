import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import Icon from "../ui/Icon";
import ComplaintFab from "./ComplaintFab";
import { useAuth } from "../../context/AuthContext";
import { portalNav, roleLabels, mobileTabs, flatNav } from "./navConfig";
import { selectTeacherClass, useMyTeacherProfile } from "../../hooks/useMyTeacherProfile";
import { useAutoCapitalize } from "../../hooks/useAutoCapitalize";
import { enableAppInstall } from "../../lib/installApp";
import InstallAppBanner from "./InstallAppBanner";
import ChangePasswordDialog from "./ChangePasswordDialog";
import ChangeStaffIdDialog from "./ChangeStaffIdDialog";
import { AlertsProvider, useAlerts } from "../../context/AlertsContext";
import { formatDate } from "../../utils/formatDate";

/** Lets a teacher who is Class Teacher of several sections pick which one the portal pages work on. */
function TeacherClassSwitcher({ className = "" }) {
  const { classCode, classes } = useMyTeacherProfile();
  if (classes.length < 2) return null;
  return (
    <label className={`flex items-center gap-2 text-sm ${className}`}>
      <span className="text-navy/55 font-medium whitespace-nowrap">My class</span>
      <select
        value={classCode || ""}
        onChange={(e) => selectTeacherClass(e.target.value)}
        className="min-w-0 flex-1 lg:flex-none rounded-xl border border-navy/15 bg-white px-3 py-1.5 font-semibold text-navy focus:outline-none focus:border-gold"
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

const navLinkClass = ({ isActive }) =>
  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
    isActive ? "bg-gold text-navy-dark" : "text-white/70 hover:text-white hover:bg-white/8"
  }`;

function NavItem({ item, count, onNavigate, nested = false }) {
  return (
    <NavLink to={item.to} end={item.end} onClick={onNavigate} className={(state) => `${navLinkClass(state)} ${nested ? "py-2" : ""}`}>
      <Icon name={item.icon} size={nested ? 15 : 17} />
      <span className="truncate">{item.label}</span>
      <CountBadge count={count} className="ml-auto shrink-0" />
    </NavLink>
  );
}

/** Sidebar entry that slides its sub-pages down; open by default while one of them is the current page. */
function NavGroup({ item, counts, onNavigate }) {
  const { pathname } = useLocation();
  const containsActive = item.children.some((c) => pathname === c.to || pathname.startsWith(`${c.to}/`));
  const [open, setOpen] = useState(containsActive);
  const expanded = open || containsActive;
  const total = item.children.reduce((sum, c) => sum + ((c.badge && counts[c.badge]) || 0), 0);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !(v || containsActive))}
        aria-expanded={expanded}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
          containsActive ? "text-white bg-white/8" : "text-white/70 hover:text-white hover:bg-white/8"
        }`}
      >
        <Icon name={item.icon} size={17} />
        <span className="truncate">{item.label}</span>
        {!expanded && <CountBadge count={total} className="ml-auto shrink-0" />}
        <Icon name="ChevronDown" size={15} className={`shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""} ${expanded || !total ? "ml-auto" : ""}`} />
      </button>
      {/* grid-rows 0fr → 1fr animates the height for a smooth slide-down */}
      <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="flex flex-col gap-1 pt-1 pl-4 ml-3.5 border-l border-white/10">
            {item.children.map((child) => (
              <NavItem key={child.to} item={child} count={child.badge && counts[child.badge]} onNavigate={onNavigate} nested />
            ))}
          </div>
        </div>
      </div>
    </div>
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

/** Phone/tablet bottom navigation: four everyday pages plus "More" (the full menu sheet). */
function MobileTabBar({ role, counts, onMore, moreOpen }) {
  const tabs = mobileTabs[role] || [];
  const itemClass = (active) =>
    `flex-1 flex flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 text-[11px] font-semibold transition-colors ${
      active ? "text-navy" : "text-navy/45"
    }`;
  const pill = (active) => `relative flex items-center justify-center w-12 h-7 rounded-full transition-colors ${active ? "bg-gold/25" : ""}`;

  return (
    <nav
      aria-label="Main"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-navy/10 shadow-[0_-4px_16px_rgba(6,54,74,0.06)] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex max-w-xl mx-auto">
        {tabs.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.end} className={({ isActive }) => itemClass(isActive && !moreOpen)}>
            {({ isActive }) => (
              <>
                <span className={pill(isActive && !moreOpen)}>
                  <Icon name={tab.icon} size={20} />
                  <CountBadge count={tab.badge && counts[tab.badge]} className="absolute -top-1 right-0.5 min-w-4! h-4! text-[10px]! px-1!" />
                </span>
                {tab.label}
              </>
            )}
          </NavLink>
        ))}
        <button type="button" onClick={onMore} aria-expanded={moreOpen} className={itemClass(moreOpen)}>
          <span className={pill(moreOpen)}>
            <Icon name="LayoutGrid" size={20} />
          </span>
          More
        </button>
      </div>
    </nav>
  );
}

/** Bottom sheet listing every page of the role's menu as an app-style icon grid (account actions live in the header avatar menu). */
function MoreSheet({ role, user, counts, onClose }) {
  const items = flatNav(role);
  return (
    <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
      <button type="button" aria-label="Close menu" onClick={onClose} className="absolute inset-0 bg-navy-dark/50" />
      <div className="relative bg-white rounded-t-3xl shadow-2xl max-h-[85svh] flex flex-col animate-[sheet-up_0.22s_ease-out] pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-center pt-2.5 pb-1">
          <span className="w-10 h-1.5 rounded-full bg-navy/15" />
        </div>
        <div className="flex items-center gap-3 px-5 py-3 border-b border-navy/8">
          <div className="w-11 h-11 rounded-full bg-navy text-white flex items-center justify-center font-semibold shrink-0">
            {(user?.full_name || "?").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-navy truncate">{user?.full_name}</p>
            <p className="text-xs text-navy/50 truncate">
              {user?.username} · {roleLabels[role]}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 flex items-center justify-center rounded-full text-navy/50">
            <Icon name="X" size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-3 py-4 grid grid-cols-3 sm:grid-cols-4 gap-2">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1.5 rounded-2xl px-1 py-3 text-center text-[11.5px] font-medium leading-tight transition-colors ${
                  isActive ? "bg-gold/15 text-navy" : "text-navy/75"
                }`
              }
            >
              <span className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-navy/[0.06] text-navy">
                <Icon name={item.icon} size={20} />
                <CountBadge count={item.badge && counts[item.badge]} className="absolute -top-1 -right-1 min-w-4! h-4! text-[10px]! px-1!" />
              </span>
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}

const THEME_KEY = "ghss_theme";

/** Saved portal theme; with no saved choice, follow the device's light/dark setting. */
function readDarkMode() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved === "dark";
  } catch {
    // Storage blocked: fall through to the device setting.
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

/** The current page's menu label, for the compact phone app bar (longest matching path wins). */
function usePageTitle(role) {
  const { pathname } = useLocation();
  const match = flatNav(role)
    .filter((item) => pathname === item.to || (!item.end && pathname.startsWith(`${item.to}/`)))
    .sort((a, b) => b.to.length - a.to.length)[0];
  return match?.label || roleLabels[role];
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
  const [moreOpen, setMoreOpen] = useState(false);
  const pageTitle = usePageTitle(role);
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [staffIdOpen, setStaffIdOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(readDarkMode);
  const items = portalNav[role] || [];
  useAutoCapitalize(role === "admin" || role === "teacher");

  // The phone-app install is offered only inside the portal (after sign-in), never on the public site.
  useEffect(() => enableAppInstall(role), [role]);

  // Opening another page closes the More sheet.
  useEffect(() => setMoreOpen(false), [pathname]);

  // Dark mode lives on <html> so drawers/toasts rendered outside the shell follow it;
  // leaving the portal (public site, login pages) always drops back to light.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("portal-dark", darkMode);
    return () => root.classList.remove("portal-dark");
  }, [darkMode]);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      // Storage blocked (private mode): the choice just lasts for this visit.
    }
  };

  const handleLogout = () => {
    logout();
    navigate(`/login/${role === "student" ? "student" : role}`, { replace: true });
  };

  return (
    <div className="portal-shell min-h-svh flex bg-mist">
      {/* Desktop sidebar; phones and tablets use the bottom tab bar + More sheet instead. */}
      <aside className="hidden lg:flex sticky top-0 z-50 h-svh w-72 shrink-0 bg-navy-dark text-white flex-col">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div className="w-10 h-10 rounded-xl bg-heritage-gradient flex items-center justify-center font-heading font-bold text-sm shrink-0">
            GK
          </div>
          <div className="min-w-0">
            <p className="font-heading font-bold text-sm leading-tight truncate">GHSS Kangayampalayam</p>
            <p className="text-[11px] text-white/50">{roleLabels[role]}</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
          {items.map((item) =>
            item.children ? (
              <NavGroup key={item.label} item={item} counts={counts} />
            ) : (
              <NavItem key={item.to} item={item} count={item.badge && counts[item.badge]} />
            )
          )}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-2 lg:gap-3 bg-white border-b border-navy/8 px-4 lg:px-5 pt-[calc(env(safe-area-inset-top)+0.625rem)] pb-2.5 lg:py-3.5">
          {/* Phone/tablet app bar: school mark + the current page's name */}
          <div className="lg:hidden flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-heritage-gradient text-white flex items-center justify-center font-heading font-bold text-xs shrink-0">
              GK
            </span>
            <div className="min-w-0">
              <p className="font-heading font-bold text-navy text-[15px] leading-tight truncate">{pageTitle}</p>
              <p className="text-[11px] text-navy/45 leading-tight truncate">GHSS Kangayampalayam</p>
            </div>
          </div>
          {role === "teacher" && <TeacherClassSwitcher className="hidden lg:flex" />}
          <div className="ml-auto">
            <NotificationBell />
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex items-center gap-3 rounded-xl px-1 lg:px-2 py-1 hover:bg-navy/5 transition-colors"
            >
              <div className="text-right hidden lg:block">
                <p className="text-sm font-semibold text-navy leading-tight">{user?.full_name}</p>
                <p className="text-[11px] text-navy/50">{user?.username}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-navy/8 text-navy flex items-center justify-center font-semibold text-sm shrink-0">
                {(user?.full_name || "?").slice(0, 1).toUpperCase()}
              </div>
              <Icon
                name="ChevronDown"
                size={16}
                className={`hidden lg:block text-navy/50 transition-transform ${menuOpen ? "rotate-180" : ""}`}
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
                  <div className="px-4 py-2.5 border-b border-navy/8 lg:hidden">
                    <p className="text-sm font-semibold text-navy leading-tight truncate">{user?.full_name}</p>
                    <p className="text-[11px] text-navy/50 truncate">{user?.username}</p>
                  </div>
                  <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-navy/8">
                    <span className="flex items-center gap-2 text-sm font-medium text-navy">
                      <Icon name={darkMode ? "Moon" : "Sun"} size={17} />
                      {darkMode ? "Dark mode" : "Light mode"}
                    </span>
                    <button
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={darkMode}
                      aria-label={`Switch to ${darkMode ? "light" : "dark"} mode`}
                      onClick={toggleDarkMode}
                      className={`relative h-6 w-11 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${darkMode ? "bg-navy" : "bg-navy/20"}`}
                    >
                      <span className={`absolute top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform ${darkMode ? "translate-x-[1.375rem]" : "translate-x-0.5"}`}>
                        <Icon name={darkMode ? "Moon" : "Sun"} size={12} className="text-gold-dark" />
                      </span>
                    </button>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setPasswordOpen(true);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-navy hover:bg-navy/5 transition-colors border-b border-navy/8"
                  >
                    <Icon name="KeyRound" size={17} />
                    Change Password
                  </button>
                  {role === "admin" && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        setStaffIdOpen(true);
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-navy hover:bg-navy/5 transition-colors border-b border-navy/8"
                    >
                      <Icon name="UserCog" size={17} />
                      Change Staff ID
                    </button>
                  )}
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

        {role === "teacher" && (
          <div className="lg:hidden bg-white border-b border-navy/8 px-4 py-2 empty:hidden">
            <TeacherClassSwitcher className="w-full" />
          </div>
        )}

        <main className="flex-1 px-4 pt-4 pb-28 sm:px-5 sm:pt-5 lg:p-7 max-w-[1440px] w-full mx-auto">
          {user?.password_is_default && (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
              <Icon name="KeyRound" size={18} className="shrink-0" />
              <p className="flex-1 min-w-[12rem] text-sm">
                <strong className="font-semibold">You're using the default password.</strong> Change it to keep your account safe.
              </p>
              <button
                type="button"
                onClick={() => setPasswordOpen(true)}
                className="bg-gold text-navy-dark font-semibold text-sm px-4 py-2 rounded-full hover:bg-gold-light transition-colors max-sm:w-full"
              >
                Change Password
              </button>
            </div>
          )}
          <InstallAppBanner />
          <Outlet />
        </main>
      </div>

      <MobileTabBar role={role} counts={counts} moreOpen={moreOpen} onMore={() => setMoreOpen((v) => !v)} />
      {moreOpen && (
        <MoreSheet role={role} user={user} counts={counts} onClose={() => setMoreOpen(false)} />
      )}
      <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
      {role === "admin" && <ChangeStaffIdDialog open={staffIdOpen} onClose={() => setStaffIdOpen(false)} />}

      {role === "student" && <ComplaintFab />}
    </div>
  );
}
