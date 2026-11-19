import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Icon from "../ui/Icon";
import NavDropdown from "./NavDropdown";
import LoginDropdown from "./LoginDropdown";
import MobileDrawer from "./MobileDrawer";
import { navigation, centenaryCta } from "../../data/schoolData";
import { SCHOOL_LOGO, SCHOOL_LOGO_ALT } from "../../constants/brand";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const headerRef = useRef(null);

  // Publish the header's real height (it changes when nav items wrap) so Hero can sit exactly behind it.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const publish = () => document.documentElement.style.setProperty("--site-header-h", `${el.offsetHeight}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const isHome = location.pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Transparent-over-hero styling only makes sense on the homepage; every
  // other page keeps a solid header since it has no dark hero behind it.
  const solid = scrolled || !isHome;

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  return (
    <header ref={headerRef} className="sticky top-0 z-50" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <div
        className={`transition-all duration-300 ${
          solid
            ? "bg-white/95 backdrop-blur-md shadow-soft"
            : "bg-transparent"
        }`}
      >
        <div className="container-page">
          {/* Fixed height regardless of scroll state: Hero relies on this being predictable so it can sit behind the header. */}
          <div className="flex items-center justify-between py-3.5">
            <Link to="/" className="flex items-center gap-3 min-w-0">
              <img src={SCHOOL_LOGO} alt={SCHOOL_LOGO_ALT} className="w-12 h-12 rounded-full bg-white object-contain shrink-0" />
            </Link>

            <nav className="hidden lg:flex items-center gap-0.5" aria-label="Primary">
              {navigation.map((item) =>
                item.children ? (
                  <NavDropdown key={item.label} item={item} scrolled={solid} />
                ) : (
                  <Link
                    key={item.label}
                    to={item.path}
                    className={`px-3.5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors duration-200 ${
                      location.pathname === item.path
                        ? "text-gold-dark"
                        : solid
                        ? "text-navy hover:text-gold-dark"
                        : "text-white hover:text-gold-light"
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              )}
            </nav>

            <div className="hidden lg:flex items-center gap-3">
              <LoginDropdown scrolled={solid} />
              <Link
                to={centenaryCta.path}
                className="flex items-center gap-1.5 bg-heritage-gradient text-white text-sm font-semibold px-4 py-2.5 rounded-full shadow-soft hover:shadow-lift transition-shadow duration-300"
              >
                <Icon name="Sparkle" size={15} className="text-gold-light" />
                {centenaryCta.label}
              </Link>
            </div>

            <button
              className={`lg:hidden p-2 rounded-full transition-colors ${solid ? "text-navy" : "text-white"}`}
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <Icon name="Menu" size={26} />
            </button>
          </div>
        </div>
      </div>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </header>
  );
}
