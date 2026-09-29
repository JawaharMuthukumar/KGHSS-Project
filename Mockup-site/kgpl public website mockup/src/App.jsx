import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import PageLoader from "./components/utility/PageLoader";
import { LanguageProvider } from "./context/LanguageContext";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";

const AboutOurStory = lazy(() => import("./pages/AboutOurStory"));
const HeadmasterProfile = lazy(() => import("./pages/HeadmasterProfile"));
const FacilitiesSafety = lazy(() => import("./pages/FacilitiesSafety"));
const Academics = lazy(() => import("./pages/Academics"));
const Achievements = lazy(() => import("./pages/Achievements"));
const SchoolLife = lazy(() => import("./pages/SchoolLife"));
const Sports = lazy(() => import("./pages/Sports"));
const Events = lazy(() => import("./pages/Events"));
const Notices = lazy(() => import("./pages/Notices"));
const Gallery = lazy(() => import("./pages/Gallery"));
const Alumni = lazy(() => import("./pages/Alumni"));
const PTA = lazy(() => import("./pages/PTA"));
const Contact = lazy(() => import("./pages/Contact"));
const Legacy = lazy(() => import("./pages/Legacy"));
const Login = lazy(() => import("./pages/Login"));

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="about" element={<AboutOurStory />} />
              <Route path="about/headmaster" element={<HeadmasterProfile />} />
              <Route path="about/facilities" element={<FacilitiesSafety />} />
              <Route path="academics" element={<Academics />} />
              <Route path="achievements" element={<Achievements />} />
              <Route path="school-life" element={<SchoolLife />} />
              <Route path="sports" element={<Sports />} />
              <Route path="events" element={<Events />} />
              <Route path="notices" element={<Notices />} />
              <Route path="gallery" element={<Gallery />} />
              <Route path="alumni" element={<Alumni />} />
              <Route path="pta" element={<PTA />} />
              <Route path="contact" element={<Contact />} />
              <Route path="legacy" element={<Legacy />} />
              <Route path="login/:role" element={<Login />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </LanguageProvider>
  );
}
