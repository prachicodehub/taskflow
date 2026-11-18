# TaskFlow – Architecture & Implementation Plan

This document describes how the system is put together and the order it was built in. All 13 phases are complete; see the README for how to run and test it.

## 1. Requirements, condensed

| Area | What must exist |
|---|---|
| Auth | Register, login → JWT. BCrypt passwords. Every other endpoint needs a valid token. |
| Ownership | A user only sees/changes projects they own, and tasks inside those projects. Guessing IDs must not leak data. |
| Projects | List mine, create. Summary (total, per-status counts, overdue). |
| Tasks | List with filters (status, priority, assignee), sort (dueDate, priority), pagination. Create, update, patch status, delete. |
| Validation | Title required, ≤ 120 chars, due date not in the past on create. 400 with field errors. |
| Errors | One error JSON shape everywhere: 400 / 401 / 404 (403 not used — see §6). |
| Frontend | Login/Register, Projects dashboard, Task board (3 columns + summary), Task create/edit modal, filters, sort, overdue highlight, auto-logout on expired JWT. |
| Quality | ≥ 2 real design patterns, service unit tests (MockK), ≥ 1 integration test, ≥ 2 RTL component tests, README. |
| Bonus | Docker Compose, Swagger, Flyway, GitHub Actions. |

## 2. Versions (pinned)

| Tool | Version | Why |
|---|---|---|
| JDK | 21 (Temurin) | LTS, already installed |
| Spring Boot | 3.5.16 | Latest 3.x line (assignment requires 3.x) |
| Kotlin | 2.2.21 | Stable K2 compiler |
| Gradle | 8.14.7 (wrapper) | Supported by Boot 3.5; wrapper means no global install |
| PostgreSQL | 16 | Runtime DB (via Docker or local install) |
| H2 | managed by Boot | In-memory DB for tests only |
| jjwt | 0.12.7 | JWT signing/parsing |
| springdoc-openapi | 2.8.17 | Swagger UI for Boot 3.5 |
| MockK / springmockk | 1.14.12 / 4.0.2 | Kotlin-native mocking |

## 3. Backend layering

```
HTTP request
   │
   ▼
security/JwtAuthenticationFilter   ← reads "Authorization: Bearer …", sets the current user
   │
   ▼
controller/*Controller             ← HTTP only: parse, @Valid, call service, return DTO
   │
   ▼
service/*Service                   ← business rules + ownership checks, @Transactional
   │
   ▼
repository/*Repository             ← Spring Data JPA interfaces (+ Specifications)
   │
   ▼
PostgreSQL (schema owned by Flyway migrations)
```

Cross-cutting:

- `exception/GlobalExceptionHandler` (`@RestControllerAdvice`) turns exceptions into the shared `ApiError` JSON.
- `dto/` holds request/response classes plus mappers; entities never leave the service layer.
- `config/` holds Security, CORS, OpenAPI, and typed `@ConfigurationProperties`.

### Package map

```
com.taskflow
├── TaskFlowApplication.kt
├── config/        SecurityConfig, CorsConfig, OpenApiConfig, JwtProperties
├── controller/    AuthController, ProjectController, TaskController
├── dto/           AuthDtos, ProjectDtos, TaskDtos, ApiError, PageResponse, mapper/
├── entity/        User, Project, Task, TaskStatus, TaskPriority, BaseEntity
├── exception/     NotFoundException, ConflictException, GlobalExceptionHandler
├── repository/    UserRepository, ProjectRepository, TaskRepository, TaskSpecifications
├── security/      JwtService, JwtAuthenticationFilter, AuthUser, CurrentUser, RestAuthEntryPoint
└── service/       AuthService, ProjectService, TaskService, task/sort strategies
```

## 4. Data model

```
users (1) ──< projects (owner_id)          a user owns many projects
projects (1) ──< tasks (project_id)         ON DELETE CASCADE
users (1) ──< tasks (assignee_id, nullable) ON DELETE SET NULL
```

| Table | Columns | Constraints |
|---|---|---|
| users | id, name, email, password_hash, created_at | email UNIQUE, NOT NULL |
| projects | id, name, description, owner_id, created_at | FK owner_id → users, index on owner_id |
| tasks | id, title, description, status, priority, due_date, assignee_id, project_id, created_at, updated_at | title ≤ 120, status/priority CHECK, FKs, index (project_id, status) |

Enums are stored as strings (`@Enumerated(STRING)`) so reordering an enum never corrupts data.

**Assignee scope (assumption):** an assignee must be an existing registered user, picked by email or ID. The app has no team/membership model, so assignees get no access to the project — ownership alone controls access. This is called out in the README as a trade-off.

## 5. API contract

All responses are JSON. All routes except `/api/auth/**` and Swagger need `Authorization: Bearer <jwt>`.

| Method | Path | Body | Success |
|---|---|---|---|
| POST | /api/auth/register | `{name, email, password}` | 201 `AuthResponse` |
| POST | /api/auth/login | `{email, password}` | 200 `AuthResponse` |
| GET | /api/auth/me | – | 200 `UserResponse` |
| GET | /api/users | – | 200 `UserResponse[]` (to pick assignees) |
| GET | /api/projects | – | 200 `ProjectResponse[]` |
| POST | /api/projects | `{name, description?}` | 201 `ProjectResponse` |
| GET | /api/projects/{id}/summary | – | 200 `ProjectSummary` |
| GET | /api/projects/{id}/tasks | query: `status, priority, assigneeId, sort=dueDate\|priority, direction=asc\|desc, page, size` | 200 `PageResponse<TaskResponse>` |
| POST | /api/projects/{id}/tasks | `TaskRequest` | 201 `TaskResponse` |
| PUT | /api/tasks/{id} | `TaskRequest` | 200 `TaskResponse` |
| PATCH | /api/tasks/{id}/status | `{status}` | 200 `TaskResponse` |
| DELETE | /api/tasks/{id} | – | 204 |

`AuthResponse = { token, expiresAt, user: { id, name, email } }`

Error body (every non-2xx):

```json
{
  "timestamp": "2026-11-17T10:15:30Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "path": "/api/projects/3/tasks",
  "fieldErrors": [{ "field": "title", "message": "Title is required" }]
}
```

## 6. Security & ownership

- **Stateless JWT.** HS256, secret from env `JWT_SECRET`, expiry from `JWT_EXPIRATION_MINUTES`. Subject = user id; claims = email, name.
- **401** comes from a custom `AuthenticationEntryPoint` so it uses the same `ApiError` shape.
- **Ownership is enforced in the query, not after it.** Repositories expose `findByIdAndOwnerId(projectId, userId)` and `findByIdAndProjectOwnerId(taskId, userId)`. If the row isn't found *for this user*, the service throws `NotFoundException` → **404**.
  We return 404 instead of 403 on purpose: a 403 would confirm that ID exists for someone else. The assignment allows "403 or an appropriate 404".
- CORS allows the Vite dev origin (configurable via `CORS_ALLOWED_ORIGINS`).

## 7. Design patterns (implemented, not just named)

| Pattern | Where | What it buys us |
|---|---|---|
| **Repository** | `repository/*` – Spring Data JPA interfaces | Services never write SQL; easy to mock in unit tests. |
| **Specification** (a Strategy/Composite for queries) | `repository/TaskSpecifications` | Each filter (status, priority, assignee) is a small composable predicate; only the filters the caller sent get combined. |
| **Strategy** | `service/task/TaskSortStrategy` + `DueDateSort`, `PrioritySort`, resolved by `TaskSortStrategyResolver` | The `sort=` parameter selects an object that builds the `Sort`. Adding a new sort = adding one class, no `when` chains in the service. Priority sort needs special handling (HIGH > MEDIUM > LOW, not alphabetical) – that logic lives in its strategy. |
| **Mapper / Factory** | `dto/mapper/*` – `Task.toResponse()`, `TaskRequest.toEntity(project, assignee)` | One place converts entities ↔ DTOs, so entities never leak to controllers. |

## 8. Frontend architecture

```
src/
├── api/          axiosClient (base URL, token header, 401 → logout), authApi, projectApi, taskApi, userApi
├── hooks/        useProjects, useCreateProject, useTasks, useTaskMutations, useProjectSummary (React Query)
├── context/      AuthContext (user, token, login, logout, expiry timer)
├── routes/       ProtectedRoute, PublicOnlyRoute, AppRoutes
├── pages/        LoginPage, RegisterPage, ProjectsPage, ProjectBoardPage, NotFoundPage
├── components/   layout/ (Sidebar, AppShell), ui/ (Button, Input, Modal, Badge, Spinner, EmptyState, ErrorState),
│                 auth/LoginForm, RegisterForm, projects/ProjectCard, CreateProjectModal,
│                 tasks/TaskBoard, TaskColumn, TaskCard, TaskFormModal, TaskFilters, ProjectSummary
├── types/        api.ts – TS types that mirror backend DTOs 1:1
├── utils/        date.ts (isOverdue, format), validation.ts, token.ts (decode exp)
├── App.tsx, main.tsx
```

Rules:

- Components never call Axios directly → they use hooks → hooks call `api/*`.
- One Axios instance. A response interceptor catches 401, clears the token and redirects to `/login`. `AuthContext` also sets a timer for the token's `exp` so the user is logged out even when idle.
- Drag-and-drop between columns uses native HTML5 DnD (no extra library). Each card also has a status dropdown for keyboard and mobile users.
- Styling: Tailwind CSS with a small token set (slate neutrals, one indigo accent, semantic red/amber/green for priority).
- Tests: Vitest + React Testing Library + jsdom (works with Vite out of the box).

## 9. Testing plan

| Layer | Tool | Cases |
|---|---|---|
| Service unit | JUnit 5 + MockK | AuthService (register dup email, login bad password), ProjectService (list mine, summary counts), TaskService (create ok, past due date → 400, other user's task → 404, status patch) |
| Integration | `@SpringBootTest` + MockMvc + H2 | register → login → create project → create task → 401 without token → 404 for another user's project → 400 on blank title |
| Frontend | Vitest + RTL | LoginForm validation & submit, TaskCard rendering + overdue highlight, ProjectCard |

## 10. Phase plan

| Phase | Output | Verify with |
|---|---|---|
| 1 | This doc, monorepo skeleton | – |
| 2 | Gradle Kotlin project, app boots | `gradlew.bat build` |
| 3 | Entities, repos, DTOs, services, controllers, Flyway V1 | `gradlew.bat build` |
| 4 | JWT + Spring Security | curl register/login |
| 5 | Validation + global error handler | curl bad payloads |
| 6 | Backend tests | `gradlew.bat test` |
| 7 | Vite + React + TS + Tailwind scaffold | `npm run dev` |
| 8 | Auth pages, dashboard, board, task modal | browser |
| 9 | Wire to API with React Query | browser against backend |
| 10 | Filters, sort, pagination, summary | browser |
| 11 | Frontend tests | `npm test` |
| 12 | Docker Compose, Swagger, GitHub Actions | `docker compose up` |
| 13 | README + submission checklist | – |
