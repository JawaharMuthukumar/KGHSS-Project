import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import PageLoader from "./components/utility/PageLoader";
import { LanguageProvider } from "./context/LanguageContext";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import PortalLayout from "./components/portal/PortalLayout";
import ComingSoon from "./components/portal/ComingSoon";
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

const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const TeacherDashboard = lazy(() => import("./pages/teacher/TeacherDashboard"));
const StudentDashboard = lazy(() => import("./pages/student/StudentDashboard"));

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <AuthProvider>
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

              <Route path="admin" element={<ProtectedRoute roles={["admin"]} />}>
                <Route element={<PortalLayout role="admin" />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="teachers" element={<ComingSoon title="Teachers" description="Add, edit and deactivate teacher accounts." />} />
                  <Route path="class-teachers" element={<ComingSoon title="Class Teacher Assignment" description="Assign one class teacher per class section." />} />
                  <Route path="subject-teachers" element={<ComingSoon title="Subject Teachers" description="Assign subject teachers per class." />} />
                  <Route path="students" element={<ComingSoon title="Students" description="Browse students by class." />} />
                  <Route path="timetables" element={<ComingSoon title="Timetables" description="Manage class and teacher timetables." />} />
                  <Route path="marks" element={<ComingSoon title="Enter Marks" description="Enter term marks for any class." />} />
                  <Route path="reports" element={<ComingSoon title="Results & Reports" description="Scorecards, mark reports and result analysis." />} />
                  <Route path="attendance-report" element={<ComingSoon title="Attendance Report" description="Monthly attendance across classes, with unlock." />} />
                  <Route path="notices" element={<ComingSoon title="Notices" description="Publish and manage school notices." />} />
                  <Route path="certificates" element={<ComingSoon title="Certificates" description="Generate and review certificate requests." />} />
                  <Route path="complaints" element={<ComingSoon title="Complaints" description="Student complaint inbox." />} />
                  <Route path="gallery" element={<ComingSoon title="Gallery & Events" description="Manage public gallery and events." />} />
                  <Route path="contact-messages" element={<ComingSoon title="Contact Inbox" description="Messages submitted from the public website." />} />
                </Route>
              </Route>

              <Route path="teacher" element={<ProtectedRoute roles={["teacher"]} />}>
                <Route element={<PortalLayout role="teacher" />}>
                  <Route index element={<TeacherDashboard />} />
                  <Route path="students" element={<ComingSoon title="My Class Students" description="Students in your assigned class." />} />
                  <Route path="students/new" element={<ComingSoon title="Add Student" description="Enroll a new student in your class." />} />
                  <Route path="marks" element={<ComingSoon title="Enter Marks" description="Enter term marks for your class/subjects." />} />
                  <Route path="attendance" element={<ComingSoon title="Take Attendance" description="Record monthly attendance for your class." />} />
                  <Route path="attendance-report" element={<ComingSoon title="Attendance Report" description="View attendance for your class." />} />
                  <Route path="class-timetable" element={<ComingSoon title="Class Timetable" description="View or edit your class's weekly timetable." />} />
                  <Route path="my-timetable" element={<ComingSoon title="My Timetable" description="Your personal weekly teaching schedule." />} />
                  <Route path="notices" element={<ComingSoon title="Class Notices" description="Post homework and class announcements." />} />
                  <Route path="certificates" element={<ComingSoon title="Certificate Requests" description="Approve or reject requests from your class." />} />
                  <Route path="reports" element={<ComingSoon title="Reports" description="Scorecard, mark report and marksheet views." />} />
                </Route>
              </Route>

              <Route path="student" element={<ProtectedRoute roles={["student"]} />}>
                <Route element={<PortalLayout role="student" />}>
                  <Route index element={<StudentDashboard />} />
                  <Route path="profile" element={<ComingSoon title="My Profile" description="Your personal and academic details." />} />
                  <Route path="results" element={<ComingSoon title="Results / Marksheet" description="Your marks across every term." />} />
                  <Route path="timetable" element={<ComingSoon title="Timetable" description="Your class's weekly timetable." />} />
                  <Route path="notices" element={<ComingSoon title="Notices" description="Notices for you and your class." />} />
                  <Route path="certificates" element={<ComingSoon title="Certificates" description="Request and download certificates." />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </LanguageProvider>
  );
}
