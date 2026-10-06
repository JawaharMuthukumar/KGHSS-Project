# GHSS Portal API (FastAPI + PostgreSQL / Supabase)

Backend implementation for the React + Vite school portal. The HTML pages and `js/app.js` under `Mockup-site/` are workflow/UI references; their browser `localStorage` demo data and demo passwords are not imported. This API persists real application data in PostgreSQL (hosted on Supabase) and protects role-specific operations with JWT bearer tokens.

## Requirements

- Python 3.11 or newer
- A Supabase project (or any PostgreSQL 15+ server)
- A virtual environment is recommended

## 1. Create the Supabase project

Create the project with **Data API disabled** and **automatic RLS enabled**. The API connects directly to Postgres as the table owner, so it is unaffected by RLS, while the tables stay closed to Supabase's auto-generated REST API. Supabase Auth is not used; logins are handled by this API.

From **Connect → Direct → Session pooler**, copy the connection string. The direct connection host is IPv6-only on the free plan, so use the session pooler (port 5432).

## 2. Install and configure

PowerShell:

```powershell
cd backend
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `backend/.env` and set `DATABASE_URL` to the session pooler string, with the scheme changed to `postgresql+psycopg2://` and `?sslmode=require` appended, plus a long random `JWT_SECRET_KEY`. Keep `.env` private and out of source control. Example URL:

```text
postgresql+psycopg2://postgres.<project-ref>:<password>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require
```

For credentials containing URL-reserved characters, percent-encode the username/password in this URL.

## 3. Create the first admin and start the API

Run from the `backend` directory with the virtual environment active:

```powershell
python -m app.create_admin
uvicorn app.main:app --reload
```

The admin setup command asks for a username, name, and password without storing plaintext. On first server startup, the initial schema and mockup class list (6A–10B, 11G1–12G2) are created. No teachers, students, demo users, or fake marks are seeded. Create teachers and students through the API after signing in.

`Base.metadata.create_all()` is included for initial local development. Before production schema evolution, add/use versioned Alembic migrations and take database backups.

## 4. Swagger / OpenAPI

Start the server, then open:

- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`
- OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`
- Health (also checks the database): `http://127.0.0.1:8000/health`

In Swagger, call `POST /api/v1/auth/login` with JSON, copy `access_token`, select **Authorize**, and enter the token as a Bearer credential. Protected endpoints will then use the logged-in account and enforce its role/class access on the backend.

Login example:

```json
{
  "username": "GHSS-HM-001",
  "password": "the-password-created-above"
}
```

Student sign-in uses the registration number as `username`; `class_code` can also be sent to validate the selected class:

```json
{
  "username": "GHSS/2026/0001",
  "password": "student-password",
  "class_code": "6A"
}
```

## API map

All application endpoints are under `/api/v1`; system health/docs are outside that prefix.

| Area | Routes / behavior |
|---|---|
| Auth | `POST /auth/login`, `GET /auth/me`, `POST /auth/change-password` |
| Classes | `GET /classes`, `GET /public/classes`, `POST /classes`, subject list and class/subject-teacher assignment routes |
| Teachers | `GET/POST /teachers`, `PATCH/DELETE /teachers/{id}`, teacher timetable read/write, `GET /teachers/{id}/timetable` (admin, read-only view of any teacher's aggregated schedule) |
| Students | `GET/POST /students`, `GET /students/{id}`, `GET /students/me/profile`; teacher enrollment is limited to their class-teacher class |
| Results | `PUT /classes/{code}/marks/{term}`, student results, class scorecard/mark report, admin result analysis, `GET /reports/consolidated` (deep exam analysis: enrollment/result summary by medium+gender, subject-wise stats, marks distribution, subjects-failed histogram, section comparison, top rank holders) |
| Attendance | Monthly class attendance, report, and admin-only unlock; a saved month locks until unlocked |
| Timetables | Class timetable read/write and teacher timetable read/write |
| Notices | Public website notices, role/class portal notices, class notices, create, `PATCH /notices/{id}` (edit; teachers limited to their own class notices), admin unpublish |
| Certificates | Student request, teacher/admin decision, status listing, approved PDF download |
| Complaints | Private student/admin message thread; teachers cannot read it |
| Public content | School profile, page index, events (`POST/PATCH/DELETE /events` admin-only), gallery, contact form (now also captures `phone`/`subject`, stored for admin inbox); admin image upload stores files locally under `backend/uploads/gallery` |
| Reports/dashboards | Admin, teacher, student dashboards; attendance, results, school, and consolidated reports |

## Important payload shapes

### Create teacher (admin)

```json
{
  "full_name": "Example Teacher",
  "subject": "Mathematics",
  "phone": "+91 9000000000",
  "password": "choose-a-strong-password"
}
```

The response includes the generated `employee_id`, which is also the teacher's login username. The requested password is hashed before storage.

### Create student (admin or assigned class teacher)

```json
{
  "full_name": "Example Student",
  "class_code": "6A",
  "password": "choose-a-strong-password",
  "gender": "Female",
  "father_name": "Guardian Name",
  "guardian_phone": "+91 9000000000"
}
```

The response includes generated `registration_no` and login `username`. Provide the initial password to the student/guardian using a school-approved method; do not place it in logs or public messages.

### Save class marks

`PUT /api/v1/classes/6A/marks/Term%201`

```json
{
  "academic_year": "2026-2027",
  "students": {
    "1": {
      "Tamil": { "score": 82, "max": 100, "absent": false },
      "English": { "score": 0, "max": 100, "absent": true }
    }
  }
}
```

The keys in `students` are database student IDs. Marks are upserted for included student/subject pairs. Admins can manage all marks; teachers must be assigned to the class or subject.

### Save monthly attendance

`PUT /api/v1/classes/6A/attendance`

```json
{
  "month": "2026-08",
  "total_days": 22,
  "records": { "1": 20, "2": 22 }
}
```

The record keys are database student IDs in that class. A successful save locks the month. Only admins can unlock it with `POST /classes/6A/attendance/2026-08/unlock`.

## MVC-style organization

- `app/api/` contains FastAPI routers/controllers.
- `app/schemas/` contains Pydantic request schemas and validation.
- `app/services/` is reserved for reusable business services as the workflows are split out of the initial router implementation.
- `app/models/` contains SQLAlchemy models and relational schema.
- `app/core/` contains settings, database sessions, JWT/password helpers, and authorization dependencies.

## React development server

The default CORS origin is `http://localhost:5173`. Add any other React development/production origins to the comma-separated `CORS_ORIGINS` setting in `.env`. The React client should send `Authorization: Bearer <access_token>` on protected requests.

## Scope and production follow-up

This backend implements the workflows represented by the mockup, but the school must confirm real permissions, attendance correction policy, grading rules, academic-year transitions, account/password delivery, privacy/retention needs, and content before real student data or production hosting is used. Rate limiting, email/SMS delivery, object storage to replace local gallery uploads, token refresh/revocation, automated migrations, backups, and audit-history tables should be planned for the production deployment.
