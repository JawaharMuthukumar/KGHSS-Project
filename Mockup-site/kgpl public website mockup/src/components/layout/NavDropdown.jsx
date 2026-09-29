import { useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Icon from "../ui/Icon";

export default function NavDropdown({ item, scrolled }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef(null);
  const location = useLocation();

  const isActive =
    location.pathname === item.path ||
    item.children?.some((c) => location.pathname === c.path.split("#")[0]);

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
      <Link
        to={item.path}
        aria-haspopup="true"
        aria-expanded={open}
        className={`flex items-center gap-1 px-3.5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors duration-200 ${
          isActive
            ? "text-gold-dark"
            : scrolled
            ? "text-navy hover:text-gold-dark"
            : "text-white hover:text-gold-light"
        }`}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        {item.label}
        <Icon
          name="ChevronDown"
          size={15}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </Link>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute left-1/2 -translate-x-1/2 top-full pt-3 z-50 w-64"
            role="menu"
          >
            <div className="bg-white rounded-2xl shadow-lift border border-navy/8 p-2 overflow-hidden">
              {item.children.map((child) => (
                <Link
                  key={child.label}
                  to={child.path}
                  role="menuitem"
                  className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-navy/85 hover:bg-cream hover:text-navy transition-colors duration-150"
                  onClick={() => setOpen(false)}
                >
                  {child.label}
                  <Icon name="ChevronRight" size={14} className="text-navy/30" />
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
