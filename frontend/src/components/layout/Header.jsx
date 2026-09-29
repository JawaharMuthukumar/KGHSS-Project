import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Icon from "../ui/Icon";
import NavDropdown from "./NavDropdown";
import LoginDropdown from "./LoginDropdown";
import MobileDrawer from "./MobileDrawer";
import TopBar from "./TopBar";
import { navigation, centenaryCta, schoolInfo } from "../../data/schoolData";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

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
    <header className="sticky top-0 z-50" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <TopBar />
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
              <span className="flex items-center justify-center w-11 h-11 rounded-xl font-heading font-extrabold text-base shrink-0 bg-heritage-gradient text-gold-light">
                GK
              </span>
              <span className="min-w-0 hidden sm:block">
                <span className={`block font-heading font-bold leading-tight truncate transition-colors ${solid ? "text-navy text-sm" : "text-white text-base"}`}>
                  {schoolInfo.shortName}
                </span>
                <span className={`block text-[11px] leading-tight truncate transition-colors ${solid ? "text-navy/60" : "text-white/70"}`}>
                  {schoolInfo.location.village}, {schoolInfo.location.district}
                </span>
              </span>
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
