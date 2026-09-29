import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Icon from "../ui/Icon";
import { loginRoles } from "../../data/schoolData";

export default function LoginDropdown({ scrolled }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef(null);

  const openMenu = () => {
    clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  return (
    <div
      className="relative"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
      onFocus={openMenu}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={`flex items-center gap-1.5 text-xs font-semibold border rounded-full px-3.5 py-1.5 whitespace-nowrap transition-colors ${
          scrolled ? "border-navy/15 text-navy/70 hover:text-navy" : "border-white/30 text-white/85 hover:text-white"
        }`}
      >
        <Icon name="LogIn" size={14} />
        Login
        <Icon name="ChevronDown" size={13} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute right-0 top-full pt-3 z-50 w-52"
            role="menu"
          >
            <div className="bg-white rounded-2xl shadow-lift border border-navy/8 p-2 overflow-hidden">
              {loginRoles.map((role) => (
                <Link
                  key={role.label}
                  to={role.path}
                  role="menuitem"
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-navy/85 hover:bg-cream hover:text-navy transition-colors duration-150"
                  onClick={() => setOpen(false)}
                >
                  <Icon name={role.icon} size={16} className="text-gold-dark shrink-0" />
                  {role.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
