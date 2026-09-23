# GHSS Kangayampalayam School Portal — Project Idea

**Status:** Initial source of truth, based on the HTML mockup in `Mockup-site/kgpl-school-portal-main`.
**Purpose:** Describe what the real application should contain before implementation starts.

## 1. Project summary

Build a school website and role-based school management portal for Government Higher Secondary School, Kangayampalayam. The existing mockup covers public school information plus administrative, teacher, and student workflows for classes 6–12. The production application should keep those user-facing workflows while moving authentication and persistent school data from browser storage into a Python FastAPI backend and MySQL database.

The mockup is the reference for page structure and demonstrated workflows; it is not authoritative for real credentials, real student data, school policy, or production security. Those details need to be supplied/confirmed by the school before release.

## 2. What is in the mockup

### Public school website

- Home, About, Headmaster profile, Academics, Achievements, Facilities, Events, Notices, Contact, Gallery/Photo Gallery, Student Council, and Centenary pages.
- School identity and contact details, classes/streams, event and achievement information, public notices, and photo/video galleries.
- Static public content should be maintainable rather than copied into backend code where it is expected to change.

### Role selection and accounts

- A portal gateway leads to separate Admin, Teacher, and Student sign-in pages.
- Admin maintains teachers and assignments. Teachers use employee IDs; students use registration numbers and select their class as part of sign-in in the mockup.
- The mockup implies role-restricted pages and logout. A real application must enforce access in the backend on every protected operation, not only hide pages in the browser.

### Admin workflows

- Admin dashboard with school overview, quick actions, class-teacher coverage, and notices.
- Add/edit/remove teachers and view their employee IDs and assigned classes.
- Assign one class teacher to a class and subject teachers by class and subject.
- Publish/manage notices, review student complaints, and manage school-level settings/content.
- View school reports, attendance reports, class scorecards, marks reports, and result analysis.
- Approve certificate requests and generate certificates.
- Manage class and teacher timetables, events, and gallery entries where permitted by the screen design.

### Teacher workflows

- Teacher dashboard with assigned-class summary, results snapshot, timetable, school/class notices, and certificate requests.
- Add and view students within the teacher's assigned class; the mockup generates student login details on creation.
- Take attendance and view attendance reports. Monthly attendance can be locked and explicitly unlocked in the mockup.
- Enter marks and view class mark reports/scorecards.
- Maintain class timetable and publish class notices.
- Review and approve/reject certificate requests for students in the teacher's class.

### Student workflows

- Student dashboard with notices, subject teachers, profile, results, timetable, and certificates.
- View personal profile and result/marksheet information.
- Request certificates and follow request status.
- Submit a complaint and exchange messages in a complaint thread with the admin.

## 3. Important mockup behavior and limitations

- `js/app.js` describes itself as a client-side database and stores the shared demo database in `localStorage`; the session is stored in `sessionStorage`. The production backend must replace this source of truth.
- The mock data contains seeded staff/students, demo passwords, generated marks, and placeholder gallery art. Do not migrate these demo credentials or treat seeded records/results as real school data.
- The mockup is mostly standalone HTML pages with JavaScript behavior. It does not currently define a FastAPI application, MySQL schema, API contract, or server-side authorization.
- Some contact, public-information, and report pages appear read-only; data-entry workflows are concentrated in the portals. Confirm which public content the school wants staff to edit through the portal.

## 4. Proposed architecture (MVC concept)

Use a layered MVC-style backend. In an API-driven application, the existing HTML/CSS/JavaScript front end is the **View**; FastAPI routes/controllers handle HTTP and authorization; services hold business rules; SQLAlchemy models and repositories handle persistence in MySQL. Keep the current mockup under a separate reference directory while it is used to reproduce the UI.

```text
Browser pages (View)
       │ HTTP / JSON
FastAPI routers + controllers (request validation, auth, response mapping)
       │
Services (school rules, permission checks, workflows)
       │
Repositories / SQLAlchemy models (data access and mapping)
       │
MySQL
```

Suggested code areas (names are illustrative, not a final scaffold):

- `app/routers` — versioned API route groups by feature/role.
- `app/controllers` — request/response handling where separate from routers.
- `app/services` — authentication, enrollment, marks, attendance, notices, certificates, reports.
- `app/models` — SQLAlchemy entities.
- `app/schemas` — Pydantic request/response schemas.
- `app/repositories` — focused database queries and persistence.
- `app/core` — configuration, password hashing, tokens, database session, permissions.
- `app/templates` or the existing static frontend — page rendering/presentation, depending on the frontend decision.
- `migrations` — versioned MySQL schema changes (for example, Alembic).

## 5. Initial domain model

The following entities are suggested by the screens. Exact fields, constraints, and retention rules should be finalized with the school before schema implementation.

| Entity | Purpose / key relationships |
|---|---|
| User / Account | Authentication identity, password hash, active status, role; associated with an admin, teacher, or student profile. |
| Role | Admin, teacher, student; enforce role and resource-level permissions server-side. |
| Teacher | Employee ID, name, subject/specialty, contact details, optional photo; may have class and subject assignments. |
| Student | Registration/admission identifiers, name, date of birth, gender, class enrollment, guardian contacts, profile details. Avoid collecting fields not needed by the school. |
| AcademicYear | School year boundaries and active year for enrollment, assessments, attendance, and reporting. |
| ClassSection | Grade/standard, section or higher-secondary group, academic year. Mockup examples include 6A–10B and Groups I/II in classes 11–12. |
| ClassTeacherAssignment | Teacher assigned as class teacher for a class section, with effective dates/academic year. |
| Subject / SubjectTeacherAssignment | Subjects offered and teacher assignment per subject and class section. |
| Assessment / Mark | Term/exam, student, subject, score, maximum score, entry/audit metadata. |
| AttendanceSession / AttendanceRecord | Class, date or reporting period, student attendance status/count, marker, lock state and timestamps. Decide whether daily attendance or the mockup's monthly totals are the required policy. |
| TimetableEntry | Class/teacher, weekday, period, subject, room or notes, academic year. |
| Notice | Title, body, audience (public/all/class), author, publish date and status. |
| ClassNotice | Class-specific homework/information, author, timestamps. Could be represented as a scoped Notice if rules are consistent. |
| CertificateRequest / Certificate | Student, certificate type, note, status, decision maker/timestamps, generated document metadata. |
| Complaint / ComplaintMessage | Student complaint thread, sender, message, timestamps, read state and status. Restrict visibility to the student and authorized admin staff. |
| Event / GalleryItem | Event metadata and media item metadata, public visibility, caption, type and storage reference. Store uploaded media outside MySQL and keep its path/key in the database. |
| SchoolContent | Editable public pages/profile/contact content if the school requires a content-management workflow. |

Use database-generated primary keys, foreign keys, uniqueness constraints, and indexes for identifiers, class/year lookups, and report filters. Prefer soft deactivation or explicit archival for school records when deletion could damage historical reports.

## 6. Initial API surface

Illustrative REST API groups (not a finalized contract):

- `/api/v1/auth` — sign in, current account, sign out/token revocation as applicable.
- `/api/v1/users`, `/teachers`, `/students` — authorized account and directory operations.
- `/api/v1/classes`, `/assignments`, `/subjects` — classes, class teachers, and subject teachers.
- `/api/v1/attendance` — record, query, report, lock/unlock with permission checks.
- `/api/v1/assessments`, `/marks`, `/reports/results` — assessment setup, marks, scorecards, analysis.
- `/api/v1/timetables` — teacher/class timetable read and authorized update.
- `/api/v1/notices` — public, school-wide, and class-specific notices.
- `/api/v1/certificates` — request, decision, issue/download.
- `/api/v1/complaints` — student threads and admin responses.
- `/api/v1/events`, `/gallery` — event and media metadata, with upload/download handled through an appropriate file-storage approach.
- `/api/v1/public` — school profile, published content, events, notices, and gallery for public pages.

Reports should be computed from persisted data using explicit academic-year, class, term, and date filters. Return only data visible to the requesting role.

## 7. Access rules implied by the UI

- **Admin:** school-wide staff, student, assignment, notice, complaint, report, and certificate oversight.
- **Teacher:** own account/timetable; assigned class roster and class-specific workflows; marks only for assigned teaching scope; certificate decisions only within allowed scope.
- **Student:** own profile/results/attendance/certificate requests and the notices/timetable relevant to their class; own complaint thread only.
- **Public visitor:** published school information, public notices, events, and gallery only.

These are a starting interpretation of the mockup. Confirm the real school's role boundaries, especially whether all teachers or only class teachers enter marks, who can unlock attendance, and who approves which certificate types.

## 8. Security and data handling requirements

- Hash passwords with a modern password-hashing algorithm; never store or return plaintext passwords.
- Replace the mockup's shared demo credentials with controlled account provisioning and password reset procedures.
- Authenticate requests with a secure session or token design; protect browser sessions against CSRF where applicable and use secure cookie settings when cookie-based.
- Validate every request and enforce role, class, and student ownership rules in the backend.
- Use parameterized ORM/database queries, secrets from environment configuration, HTTPS in deployment, and safe upload validation/storage.
- Avoid logging passwords, tokens, complaint content, or unnecessary student personal data.
- Keep audit metadata for consequential changes such as mark updates, attendance locks/unlocks, assignment changes, and certificate decisions.
- Define backups, access retention, data correction, and student-record archival policies with the school.

## 9. Delivery outline

1. **Confirm requirements:** roles and permissions, school-year/class structure, marks/attendance policy, content ownership, deployment, and data migration/import needs.
2. **Foundation:** FastAPI app, configuration, MySQL connection, migrations, account/authentication, error handling, and API conventions.
3. **Core school data:** classes, academic years, teacher/student accounts, and assignment workflows.
4. **Teaching operations:** attendance, marks, timetables, notices, and role-specific dashboards.
5. **Student services:** profiles, results, complaint threads, and certificate request/approval/issue flows.
6. **Public site and reporting:** connect public pages to published content, media handling, dashboards/reports, and print/export needs.
7. **Release preparation:** load verified school data, configure deployment/backups, and validate permissions and workflows with school users.

This is a dependency-oriented outline, not a promise that every feature belongs in the first release. The school should choose the minimum usable release after reviewing this inventory.

## 10. Decisions still needed

1. Should the existing static HTML/CSS/JS remain the frontend and call FastAPI JSON endpoints, or should the backend render pages with templates?
2. Which features are required in the first release: public site, admin portal, teacher portal, student portal, or all of them?
3. What is the authoritative class/section/group list, and how are academic years and student promotions handled?
4. Is attendance recorded daily or as monthly totals? Who may correct or unlock submitted attendance?
5. What assessment terms, subject combinations, grading rules, and mark-entry responsibilities are official?
6. How are initial accounts created, passwords reset, and student credentials delivered to guardians/students?
7. Which certificates, approval steps, templates, and student data are required to generate them?
8. Where will gallery images and generated certificate files be stored and backed up?
9. Which public content must school staff update, and who approves publication?
10. What verified data exists for import, and what jurisdictional privacy/retention requirements apply?

## 11. Scope boundary

This document records the product idea and implementation direction from the mockup. It does not establish real school policies, supply production credentials, or define final database/API contracts. Update it when requirements are confirmed; use the confirmed version to guide implementation decisions.
