# TaskFlow – Team Task Management System

A full-stack task manager. Users register, create projects, and track tasks on a three-column board (To do / In progress / Done) with filters, sorting, pagination, and overdue highlighting.

| Layer | Stack |
|---|---|
| Backend | Kotlin 2.2, Spring Boot 3.5, Spring Security (JWT, BCrypt), Spring Data JPA, Flyway, springdoc-openapi |
| Database | PostgreSQL 16 (H2 in PostgreSQL mode for tests and the no-Docker demo) |
| Frontend | React 18, TypeScript, Vite, TanStack Query, React Router, Axios, Tailwind CSS |
| Tests | JUnit 5 + MockK, `@SpringBootTest` + MockMvc, `@DataJpaTest`, Vitest + React Testing Library |
| Bonus | Docker Compose, Swagger UI, Flyway migrations, GitHub Actions CI |

Architecture, data model, and design decisions are in **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

---

## 1. Running it

### Option A: Docker (everything, one command)

```bash
cp .env.example .env        # optional, the defaults work for a demo
docker compose up --build
```

| What | URL |
|---|---|
| App | http://localhost:3000 |
| API | http://localhost:8080/api |
| Swagger UI | http://localhost:8080/swagger-ui.html |

### Option B: Local, no Docker, no PostgreSQL (fastest to try)

Needs **JDK 21** and **Node 20.19+ / 22+**.

```powershell
# Terminal 1 – API on :8080 with an in-memory H2 database (data resets on restart)
cd backend
.\gradlew.bat bootRun --args="--spring.profiles.active=h2"

# Terminal 2 – UI on :5173 (Vite proxies /api to :8080)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and create an account.

### Option C: Local with PostgreSQL

```powershell
docker compose up -d postgres          # or use any local PostgreSQL 16
cd backend
$env:DB_URL="jdbc:postgresql://localhost:5432/taskflow"; $env:DB_USERNAME="taskflow"; $env:DB_PASSWORD="taskflow"
$env:JWT_SECRET="<at least 32 random characters>"
.\gradlew.bat bootRun
```

Flyway creates the schema on startup (`backend/src/main/resources/db/migration`).

### Configuration

| Variable | Default | Purpose |
|---|---|---|
| `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` | `jdbc:postgresql://localhost:5432/taskflow`, `taskflow`, `taskflow` | Database |
| `JWT_SECRET` | dev-only value | HS256 signing key, **≥ 32 chars**. Always set it outside your machine. |
| `JWT_EXPIRATION_MINUTES` | `60` | Token lifetime |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Comma-separated origins allowed to call the API directly |
| `VITE_API_BASE_URL` | `/api` | Frontend API base (only needed when the API is on another host) |

### Deploying (Vercel + Render)

The frontend is a static site; the Spring Boot API needs a server and a PostgreSQL database.

1. **Backend on Render:** Dashboard → **New → Blueprint** → select this repo. `render.yaml` creates the API (Docker, from `backend/`) and a PostgreSQL database, wires the DB credentials, and generates `JWT_SECRET`. Set `CORS_ALLOWED_ORIGINS` to your frontend URL if it differs. Note the API URL, e.g. `https://taskflow-api.onrender.com`.
2. **Frontend on Vercel:** import the repo, set **Root Directory** to `frontend`, and add the environment variable `VITE_API_BASE_URL=https://<your-api>.onrender.com/api`. `frontend/vercel.json` handles client-side routing.

Free Render services sleep when idle, so the first request after a while can take up to a minute.

## 2. Running the tests

```powershell
cd backend;  .\gradlew.bat test     # 49 tests: services (MockK), repository, API integration
cd frontend; npm test               # 20 tests: components (RTL) + utilities
cd frontend; npm run typecheck
```

| Suite | What it covers |
|---|---|
| `AuthServiceTest`, `ProjectServiceTest`, `TaskServiceTest` | Unit tests with MockK: duplicate email, wrong password, summary counts, past due date → 400, someone else's task → 404, status patch, … |
| `TaskRepositoryTest` | Filters (Specifications), priority/due-date sort strategies, ownership queries against H2 |
| `AuthFlowIntegrationTest`, `TaskApiIntegrationTest` | Full HTTP flow with MockMvc: register → login → project → tasks; 401 without token; 404 for another user's project; 400 field errors |
| `LoginForm.test`, `TaskCard.test`, `TaskFormModal.test`, `ProjectCard.test` | RTL: validation, submit, server error display, overdue highlight, handlers |

## 3. API

All routes except register/login and Swagger need `Authorization: Bearer <token>`. The interactive docs are in Swagger UI (click **Authorize** and paste the token from login).

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/register` | `{name, email, password}` → 201 `{token, expiresAt, user}` |
| POST | `/api/auth/login` | `{email, password}` → 200 `{token, expiresAt, user}` |
| GET | `/api/auth/me` | Current user |
| GET | `/api/users` | Users to pick as assignee |
| GET / POST | `/api/projects` | My projects / create one |
| GET | `/api/projects/{id}/summary` | `{total, todo, inProgress, done, overdue}` |
| GET | `/api/projects/{id}/tasks` | `?status=&priority=&assigneeId=&sort=createdAt\|dueDate\|priority&direction=asc\|desc&page=0&size=20` |
| POST | `/api/projects/{id}/tasks` | Create task |
| PUT | `/api/tasks/{id}` | Full update |
| PATCH | `/api/tasks/{id}/status` | `{status}` |
| DELETE | `/api/tasks/{id}` | 204 |

Every error uses one shape:

```json
{ "timestamp": "…", "status": 400, "error": "Bad Request", "message": "Validation failed",
  "path": "/api/projects/3/tasks", "fieldErrors": [{ "field": "title", "message": "Title is required" }] }
```

## 4. Features

**Backend**
- JWT auth (HS256, configurable expiry), BCrypt password hashes, normalised emails, same message for wrong email or password.
- Ownership enforced **inside the query** (`findByIdAndOwnerId`, `findByIdAndProjectOwnerId`). Another user's IDs answer **404**, so they can't even confirm an ID exists.
- Validation: title required and ≤ 120 chars, due date not in the past on create (and on update only when the date changes), enum/JSON/type errors become field errors.
- Filtering with composable JPA Specifications; sorting via the Strategy pattern (priority sorts HIGH > MEDIUM > LOW, not alphabetically; tasks without a due date sort last); stable pagination.
- Global `@RestControllerAdvice` and a custom 401/403 responder: one error JSON everywhere, no stack traces leaked.

**Frontend**
- Login / register with client-side validation that mirrors the backend, plus server field errors shown inline.
- Protected routes; the token is stored with its expiry, and the user is **logged out automatically** when the JWT expires (timer) or any call returns 401.
- Projects dashboard (create project modal, empty/loading/error states).
- Task board: 3 columns, **drag and drop** between columns (native HTML5) plus a status dropdown on each card for keyboard/mobile users, optimistic status updates with rollback.
- Summary bar (totals, overdue, progress), filters (status, priority, assignee), sort (newest, due date, priority, asc/desc), pagination.
- Create/edit modal and delete confirmation; overdue cards get a red edge and an "Overdue" label.
- Responsive down to phone width; accessible labels, focus handling, Escape to close dialogs.

## 5. Design patterns used

| Pattern | Where |
|---|---|
| **Strategy** | `service/task/TaskSortStrategies.kt`: one class per sort (`createdAt`, `dueDate`, `priority`), chosen by `TaskSortStrategyResolver`. A new sort is one new `@Component`. |
| **Specification** | `repository/TaskSpecifications.kt`: each filter is a small predicate; only the filters sent are combined. |
| **Repository** | Spring Data interfaces in `repository/`; services never write SQL and are easy to mock. |
| **Mapper / Factory** | `dto/mapper/Mappers.kt`: entities ↔ DTOs in one place; entities never reach controllers. |
| **Interceptor / Observer** (frontend) | One Axios instance whose interceptors add the token and broadcast 401s to `AuthContext`. |

## 6. Assumptions and trade-offs

- **Ownership model:** projects belong to one owner. Assignees are any registered user but get **no access** to the project; there is no team/membership model. That keeps the access rule simple and safe; membership would be the next feature.
- **404 instead of 403** for other users' resources, to avoid leaking which IDs exist.
- **Due date in the past** is rejected on create. On update it's only checked when the date changes, so an already-overdue task can still be edited or completed.
- **"Overdue"** = due date before today and status not DONE. The server computes it in its time zone; the UI rechecks it in local time.
- **Token storage:** `localStorage`, which is simple for a SPA calling a stateless API. The trade-off is XSS exposure; an httpOnly cookie plus CSRF protection would be the hardened alternative.
- **Board + pagination:** the board shows one page (default 50) of the filtered list across the three columns; the summary always reflects the whole project.
- No refresh tokens: when the token expires the user logs in again.

## 7. Project layout

```
TaskFlow/
├── backend/                 Kotlin + Spring Boot API (Gradle wrapper, Dockerfile)
│   └── src/main/kotlin/com/taskflow/{config,controller,dto,entity,exception,repository,security,service}
├── frontend/                React + TypeScript (Vite, Dockerfile, nginx.conf)
│   └── src/{api,components,context,hooks,pages,routes,types,utils}
├── docs/ARCHITECTURE.md     Design document
├── docker-compose.yml       postgres + backend + frontend
└── .github/workflows/ci.yml Backend tests, frontend typecheck/tests/build, Docker build
```
