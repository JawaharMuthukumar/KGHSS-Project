# GHSS Kangayampalayam Portal — Technology Stack

This file records the selected technology stack for the school portal. The HTML mockup in `Mockup-site/kgpl-school-portal-main` is a visual and workflow reference; the production frontend will be built separately in React.

## Selected stack

| Layer | Technology | Use |
|---|---|---|
| Frontend | React | Build the public school website and the admin, teacher, and student portal interfaces. |
| Frontend tooling | Vite | Develop, bundle, and serve the React application. |
| Backend/API | Python + FastAPI | Implement the REST API, request validation, and backend application behavior. |
| Backend architecture | MVC-style structure | Keep request/controller handling, business logic, and data models/data access in distinct layers. React provides the View. |
| Database | MySQL | Store accounts, school records, classes, assignments, attendance, marks, notices, and related data. |
| Authentication | JWT | Issue signed tokens for authenticated API requests. Backend authorization checks determine which roles and records each user can access. |

## Suggested backend layers

- **Routers/controllers:** Receive HTTP requests, validate inputs, apply authentication dependencies, and return API responses.
- **Services:** Implement school workflows and business rules, including role and record-level permission checks.
- **Models:** Represent persisted entities and relationships.
- **Repositories/data access:** Encapsulate MySQL queries and persistence operations.
- **Schemas:** Define and validate API request and response data.
- **Configuration/security:** Load environment configuration and manage JWT validation, password hashing, and database sessions.

## Suggested project shape

```text
frontend/                 React + Vite application
backend/
  app/
    routers/              FastAPI endpoint groups
    controllers/          Request/response coordination, if kept separate from routers
    services/             Business rules and workflows
    models/               Database models
    repositories/         Database access
    schemas/              API input/output schemas
    core/                 Configuration, security, and database setup
```

This is a starting organization, not a required scaffold. Choose concrete libraries for MySQL access, migrations, routing, and JWT signing/refresh when implementation requirements are finalized.

## Authentication and authorization notes

- Store password hashes, never plaintext passwords.
- Sign and validate JWTs on the backend; keep signing secrets outside source control.
- Enforce authorization on every protected backend operation. Frontend route guards only control the user experience and are not a security boundary.
- Decide token lifetime, refresh/revocation behavior, and browser token storage before implementing sign-in.

## Scope

This file records the requested stack only. It does not define the final API contract, database schema, school policies, or feature release plan.
