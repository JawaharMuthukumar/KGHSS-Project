import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Icon from "../ui/Icon";
import { navigation, centenaryCta, schoolInfo, loginRoles } from "../../data/schoolData";
import { useLanguage } from "../../context/LanguageContext";

export default function MobileDrawer({ open, onClose }) {
  const [expanded, setExpanded] = useState(null);
  const location = useLocation();
  const { lang, toggleLang } = useLanguage();

  const toggleExpand = (label) => setExpanded((prev) => (prev === label ? null : label));

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-navy-dark/60 backdrop-blur-sm z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            className="fixed top-0 right-0 h-full w-[86%] max-w-sm bg-cream z-50 lg:hidden flex flex-col shadow-lift"
            style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-navy/10">
              <span className="font-heading font-bold text-navy text-sm">Menu</span>
              <button
                onClick={onClose}
                aria-label="Close menu"
                className="p-2 rounded-full hover:bg-navy/5 text-navy"
              >
                <Icon name="X" size={22} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-3">
              {navigation.map((item) => {
                const hasChildren = !!item.children;
                const isExpanded = expanded === item.label;
                const isActive = location.pathname === item.path;
                return (
                  <div key={item.label} className="border-b border-navy/5 last:border-none">
                    <div className="flex items-center">
                      <Link
                        to={item.path}
                        onClick={onClose}
                        className={`flex-1 py-3.5 px-3 text-base font-semibold ${
                          isActive ? "text-gold-dark" : "text-navy"
                        }`}
                      >
                        {item.label}
                      </Link>
                      {hasChildren && (
                        <button
                          onClick={() => toggleExpand(item.label)}
                          aria-expanded={isExpanded}
                          aria-label={`Toggle ${item.label} submenu`}
                          className="p-3 text-navy/60"
                        >
                          <Icon
                            name="ChevronDown"
                            size={18}
                            className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                          />
                        </button>
                      )}
                    </div>
                    <AnimatePresence>
                      {hasChildren && isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22 }}
                          className="overflow-hidden pl-4"
                        >
                          {item.children.map((child) => (
                            <Link
                              key={child.label}
                              to={child.path}
                              onClick={onClose}
                              className="flex items-center gap-2 py-3 px-3 text-sm font-medium text-navy/75 hover:text-navy"
                            >
                              <Icon name="ChevronRight" size={13} className="text-gold-dark" />
                              {child.label}
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              <Link
                to={centenaryCta.path}
                onClick={onClose}
                className="mt-4 flex items-center justify-center gap-2 bg-heritage-gradient text-white font-semibold text-sm py-3.5 rounded-full shadow-soft"
              >
                <Icon name="Sparkle" size={16} className="text-gold-light" />
                {centenaryCta.label}
              </Link>

              <div className="mt-5 pt-4 border-t border-navy/10">
                <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-navy/40">Login</p>
                <div className="flex flex-col">
                  {loginRoles.map((role) => (
                    <Link
                      key={role.label}
                      to={role.path}
                      onClick={onClose}
                      className="flex items-center gap-3 py-3 px-3 text-sm font-medium text-navy/80 hover:text-navy"
                    >
                      <Icon name={role.icon} size={16} className="text-gold-dark" />
                      {role.label}
                    </Link>
                  ))}
                </div>
              </div>
            </nav>

            <div className="px-5 py-4 border-t border-navy/10 flex flex-col gap-3">
              <button
                onClick={toggleLang}
                className="self-start flex items-center gap-1 text-xs font-semibold text-navy/70 border border-navy/15 rounded-full px-3 py-1.5"
              >
                <span className={lang === "en" ? "text-navy" : ""}>English</span>
                <span className="text-navy/30">|</span>
                <span className={`font-tamil ${lang === "ta" ? "text-navy" : ""}`}>தமிழ்</span>
              </button>
              <a href={`tel:${schoolInfo.contact.phonePrimary.replace(/\s/g, "")}`} className="flex items-center gap-2 text-sm text-navy/70">
                <Icon name="Phone" size={15} />
                {schoolInfo.contact.phonePrimary}
              </a>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
