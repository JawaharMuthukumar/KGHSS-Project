import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import Icon from "../ui/Icon";
import { useAuth } from "../../context/AuthContext";
import { portalNav, roleLabels } from "./navConfig";

export default function PortalLayout({ role }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = portalNav[role] || [];

  const handleLogout = () => {
    logout();
    navigate(`/login/${role === "student" ? "student" : role}`, { replace: true });
  };

  return (
    <div className="min-h-svh flex bg-mist">
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
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/8 transition-colors"
          >
            <Icon name="LogOut" size={17} />
            Sign out
          </button>
        </div>
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
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-navy leading-tight">{user?.full_name}</p>
              <p className="text-[11px] text-navy/50">{user?.username}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-navy/8 text-navy flex items-center justify-center font-semibold text-sm shrink-0">
              {(user?.full_name || "?").slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 p-5 lg:p-7 max-w-[1440px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
