import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import ScrollProgress from "./ScrollProgress";
import BackToTop from "./BackToTop";
import ScrollToTop from "../utility/ScrollToTop";

export default function Layout() {
  const location = useLocation();
  const isLoginPage = location.pathname.startsWith("/login/");

  return (
    <div className={`flex flex-col bg-cream ${isLoginPage ? "h-dvh overflow-hidden" : "min-h-svh"}`}>
      <ScrollToTop />
      <ScrollProgress />
      <Header />
      <main className={`flex-1 ${isLoginPage ? "min-h-0" : ""}`}>
        <Outlet />
      </main>
      {!isLoginPage && <Footer />}
      <BackToTop />
    </div>
  );
}
