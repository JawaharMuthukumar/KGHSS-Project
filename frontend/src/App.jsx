import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import PageLoader from "./components/utility/PageLoader";
import { LanguageProvider } from "./context/LanguageContext";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import PortalLayout from "./components/portal/PortalLayout";
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
const AdminTeachers = lazy(() => import("./pages/admin/Teachers"));
const AdminClassTeachers = lazy(() => import("./pages/admin/ClassTeacherAssignment"));
const AdminSubjectTeachers = lazy(() => import("./pages/admin/SubjectTeacherAssignment"));
const AdminStudents = lazy(() => import("./pages/admin/Students"));
const AdminTimetables = lazy(() => import("./pages/admin/AdminTimetables"));
const AdminResultsReports = lazy(() => import("./pages/admin/ResultsReports"));
const AdminAttendanceReport = lazy(() => import("./pages/admin/AttendanceReport"));
const AdminGalleryEvents = lazy(() => import("./pages/admin/GalleryEvents"));
const AdminContactMessages = lazy(() => import("./pages/admin/ContactMessages"));
const AdminNotices = lazy(() => import("./pages/admin/Notices"));
const AdminCertificates = lazy(() => import("./pages/admin/Certificates"));
const AdminComplaints = lazy(() => import("./pages/admin/Complaints"));
const AdminLeaveRequests = lazy(() => import("./pages/admin/LeaveRequests"));
const TeacherDashboard = lazy(() => import("./pages/teacher/TeacherDashboard"));
const MyStudents = lazy(() => import("./pages/teacher/MyStudents"));
const AddStudent = lazy(() => import("./pages/teacher/AddStudent"));
const EnterMarks = lazy(() => import("./pages/teacher/EnterMarks"));
const TakeAttendance = lazy(() => import("./pages/teacher/TakeAttendance"));
const ClassTimetable = lazy(() => import("./pages/teacher/ClassTimetable"));
const MyTimetable = lazy(() => import("./pages/teacher/MyTimetable"));
const ClassNotices = lazy(() => import("./pages/teacher/ClassNotices"));
const CertificateRequests = lazy(() => import("./pages/teacher/CertificateRequests"));
const TeacherAttendanceReport = lazy(() => import("./pages/teacher/AttendanceReport"));
const TeacherReports = lazy(() => import("./pages/teacher/Reports"));
const TeacherLeaveRequests = lazy(() => import("./pages/teacher/LeaveRequests"));
const StudentDashboard = lazy(() => import("./pages/student/StudentDashboard"));
const MyProfile = lazy(() => import("./pages/student/MyProfile"));
const MyResults = lazy(() => import("./pages/student/MyResults"));
const StudentTimetable = lazy(() => import("./pages/student/StudentTimetable"));
const MyNotices = lazy(() => import("./pages/student/MyNotices"));
const MyCertificates = lazy(() => import("./pages/student/MyCertificates"));
const MyLeave = lazy(() => import("./pages/student/MyLeave"));

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
                  <Route path="teachers" element={<AdminTeachers />} />
                  <Route path="class-teachers" element={<AdminClassTeachers />} />
                  <Route path="subject-teachers" element={<AdminSubjectTeachers />} />
                  <Route path="students" element={<AdminStudents />} />
                  <Route path="timetables" element={<AdminTimetables />} />
                  <Route path="reports" element={<AdminResultsReports />} />
                  <Route path="attendance-report" element={<AdminAttendanceReport />} />
                  <Route path="notices" element={<AdminNotices />} />
                  <Route path="leave-requests" element={<AdminLeaveRequests />} />
                  <Route path="certificates" element={<AdminCertificates />} />
                  <Route path="complaints" element={<AdminComplaints />} />
                  <Route path="gallery" element={<AdminGalleryEvents />} />
                  <Route path="contact-messages" element={<AdminContactMessages />} />
                </Route>
              </Route>

              <Route path="teacher" element={<ProtectedRoute roles={["teacher"]} />}>
                <Route element={<PortalLayout role="teacher" />}>
                  <Route index element={<TeacherDashboard />} />
                  <Route path="students" element={<MyStudents />} />
                  <Route path="students/new" element={<AddStudent />} />
                  <Route path="marks" element={<EnterMarks />} />
                  <Route path="attendance" element={<TakeAttendance />} />
                  <Route path="attendance-report" element={<TeacherAttendanceReport />} />
                  <Route path="class-timetable" element={<ClassTimetable />} />
                  <Route path="my-timetable" element={<MyTimetable />} />
                  <Route path="notices" element={<ClassNotices />} />
                  <Route path="leave-requests" element={<TeacherLeaveRequests />} />
                  <Route path="certificates" element={<CertificateRequests />} />
                  <Route path="reports" element={<TeacherReports />} />
                </Route>
              </Route>

              <Route path="student" element={<ProtectedRoute roles={["student"]} />}>
                <Route element={<PortalLayout role="student" />}>
                  <Route index element={<StudentDashboard />} />
                  <Route path="profile" element={<MyProfile />} />
                  <Route path="results" element={<MyResults />} />
                  <Route path="timetable" element={<StudentTimetable />} />
                  <Route path="notices" element={<MyNotices />} />
                  <Route path="leave" element={<MyLeave />} />
                  <Route path="certificates" element={<MyCertificates />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </LanguageProvider>
  );
}
