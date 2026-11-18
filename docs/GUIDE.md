# TaskFlow, explained

This guide explains how TaskFlow works in plain language, so you can find your way around the code, demo it confidently, and answer questions about it. The [README](../README.md) is the short version for reviewers; this is the long version for you.

---

## 1. The big picture

TaskFlow has three parts that run separately and talk over HTTP:

```
  Browser                         Server                         Database
┌────────────────┐   JSON over  ┌──────────────────────┐  SQL   ┌────────────┐
│ React frontend │ ───────────▶ │ Spring Boot backend  │ ─────▶ │ PostgreSQL │
│ (what you see) │ ◀─────────── │ (rules + security)   │ ◀───── │ (the data) │
└────────────────┘              └──────────────────────┘        └────────────┘
   frontend/                       backend/
```

- The **frontend** only draws screens and sends requests. It never talks to the database.
- The **backend** decides what's allowed, checks the input, and reads/writes the database.
- The **database** stores three tables: `users`, `projects`, `tasks`.

Because the backend checks everything itself, the app stays safe even if someone skips the frontend and calls the API directly (for example with Postman or curl).

---

## 2. The data

```
users ──< projects ──< tasks
  │                      │
  └──────────────────────┘  (a task can have one assignee, who is a user)
```

- A **user** owns many **projects** (`projects.owner_id`).
- A **project** has many **tasks** (`tasks.project_id`). Deleting a project deletes its tasks.
- A **task** may have an **assignee** (`tasks.assignee_id`). If that user is deleted, the task just becomes unassigned.
- A task has a **status** (`TODO`, `IN_PROGRESS`, `DONE`) and a **priority** (`LOW`, `MEDIUM`, `HIGH`), stored as text so reordering the enum in code can never scramble saved data.

The tables are created by **Flyway** from `backend/src/main/resources/db/migration/V1__init_schema.sql`. Flyway runs SQL files in order (`V1__`, `V2__`, …) when the app starts, and remembers which ones it already ran. So the database structure is versioned just like the code.

---

## 3. Follow one request from start to finish

The best way to understand the backend is to follow a single request. Here is what happens when you click **Create task**.

**In the browser**

1. `TaskFormModal.tsx` checks the form (title not empty, at most 120 characters, due date not in the past) and shows errors immediately.
2. It calls `create.mutateAsync(...)` from `hooks/queries.ts`.
3. That calls `taskApi.create(...)` in `api/endpoints.ts`, which sends:
   `POST /api/projects/1/tasks` with JSON `{ "title": "...", "priority": "HIGH", ... }`.
4. `api/axiosClient.ts` automatically adds the header `Authorization: Bearer <your token>`.

**On the server**, the request passes through these layers in order:

| Step | File | What it does |
|---|---|---|
| 1 | `security/JwtAuthenticationFilter.kt` | Reads the token, checks its signature and expiry, and records who you are. A bad or missing token means you stay "anonymous". |
| 2 | `config/SecurityConfig.kt` | The rule list: only register/login and Swagger are public. Anonymous requests to anything else get **401**. |
| 3 | `controller/TaskController.kt` | Turns the JSON into a `TaskRequest` object. `@Valid` checks the annotations on it (`@NotBlank`, `@Size(max = 120)`). Failures become **400** with field errors. |
| 4 | `service/TaskService.kt` | The business rules. It loads project 1 **only if you own it**; otherwise it throws `NotFoundException` (→ **404**). It rejects a past due date, checks the assignee exists, then saves. |
| 5 | `repository/TaskRepository.kt` | Spring Data writes the SQL for us. |
| 6 | `dto/mapper/Mappers.kt` | Converts the saved database object into a `TaskResponse`, the JSON the frontend receives. |

**Back in the browser**, React Query (`hooks/queries.ts`) marks the task list and summary as out of date and fetches them again, so the new card appears and the progress bar updates.

If anything goes wrong at any step, `exception/GlobalExceptionHandler.kt` catches it and returns the same error JSON shape every time (status, message, path, and field errors).

---

## 4. Login and security

### How logging in works

1. You send email + password to `POST /api/auth/login`.
2. `AuthService.kt` finds the user and checks the password with **BCrypt**. Passwords are never stored, only a BCrypt hash. BCrypt is deliberately slow and adds a random "salt", so the same password gives a different hash every time and leaked hashes are very hard to crack.
3. If correct, `JwtService.kt` creates a **JWT** (JSON Web Token) and sends it back.

### What a JWT is

A JWT is a small signed note: "this is user 5, Alice, valid until 3pm", plus a signature made with the server's secret key (`JWT_SECRET`). Anyone can *read* it, but nobody can change it without breaking the signature. On every request the server re-checks the signature and the expiry date. It doesn't need to remember logins in memory; this is called **stateless** authentication.

The wrong-password and unknown-email cases return the same message ("Invalid email or password"), so attackers can't find out which emails have accounts.

### Ownership: who can see what

Every lookup includes the owner in the query itself, for example:

```kotlin
projectRepository.findByIdAndOwnerId(projectId, userId)
taskRepository.findByIdAndProjectOwnerId(taskId, userId)
```

If the row exists but belongs to someone else, the query simply finds nothing, and the API answers **404 Not Found**. We use 404 rather than 403 Forbidden on purpose: a 403 would confirm "this ID exists, it's just not yours", which leaks information. These helpers live in `service/OwnershipLookups.kt`, so the rule is written once.

### Auto-logout on the frontend

`context/AuthContext.tsx` reads the token's expiry time and sets a timer, so you're logged out the moment the token expires, even if you're idle. Separately, `api/axiosClient.ts` watches every response: any **401** clears the token and sends you to the login page with "Your session has expired".

### CORS (why the browser sometimes blocks requests)

Browsers block a page on one site from calling an API on another site unless the API says it's allowed. `CORS_ALLOWED_ORIGINS` is that allow-list. Locally, Vite forwards `/api` to the backend so the browser sees one site and CORS never triggers. When deployed on Vercel + Render, the Vercel URL must be in the allow-list.

---

## 5. Validation and errors

Validation happens in **two places**, on purpose:

- **Frontend** (`utils/validation.ts`): instant feedback while typing; nicer for the user.
- **Backend** (annotations in `dto/*.kt` plus rules in services): the real protection, since anyone can bypass a frontend.

Status codes you'll see:

| Code | Meaning | Example |
|---|---|---|
| 200 / 201 / 204 | OK / Created / Deleted | Normal success |
| 400 | Bad request | Blank title, past due date, unknown priority |
| 401 | Not logged in | Missing, tampered or expired token |
| 404 | Not found | Wrong ID, or someone else's project |
| 409 | Conflict | Registering with an email that's already used |

---

## 6. Design patterns, in plain words

The assignment asks for at least two design patterns. Here's what each one is and where to point when asked.

**Strategy** (`service/task/TaskSortStrategies.kt`)
A family of interchangeable "ways of doing something". Each sort option is its own small class with a `key`: `"createdAt"`, `"dueDate"`, `"priority"`. Spring collects them all, and `TaskSortStrategyResolver` picks one based on the `?sort=` value. To add a new sort, you add one class and change nothing else. The priority strategy also fixes a real problem: sorting the text alphabetically would give HIGH, LOW, MEDIUM, so it sorts by a rank (LOW=1, MEDIUM=2, HIGH=3) instead.

**Specification** (`repository/TaskSpecifications.kt`)
Each filter (status, priority, assignee) is a small reusable piece of a WHERE clause. Only the filters the user actually chose are combined, so there's no pile of `if` statements building SQL strings.

**Repository** (`repository/`)
Interfaces like `TaskRepository` describe *what* data we need; Spring Data generates the SQL. Services never write SQL, and in unit tests we replace repositories with fakes (mocks).

**Mapper / DTO** (`dto/`)
Database objects (entities) never leave the backend. Mappers convert them into simple response classes (DTOs). This means we choose exactly what the JSON contains; for example, a user's password hash can never accidentally be sent.

**Interceptor** (frontend, `api/axiosClient.ts`)
One place adds the token to every request and handles every 401, instead of repeating that code in each API call.

---

## 7. The frontend, folder by folder

```
frontend/src/
├── api/          Talking to the backend (Axios instance + one function per endpoint)
├── hooks/        React Query hooks: useProjects, useTasks, useTaskMutations, …
├── context/      AuthContext: who is logged in, login/logout, expiry timer
├── routes/       Which URL shows which page; protected vs public routes
├── pages/        Whole screens: Login, Register, Projects, ProjectBoard, NotFound
├── components/   Building blocks: ui/ (buttons, inputs, modal), tasks/, projects/, layout/
├── types/        TypeScript types matching the backend's JSON exactly
└── utils/        Small helpers: dates, token decoding, validation
```

The rule that keeps it tidy: **components never call the API directly**. A component uses a hook → the hook calls `api/` → `api/` uses Axios.

**Why React Query?** It caches server data, shows loading and error states, and refetches after changes. After you create or move a task, the hooks "invalidate" the task list and summary, and React Query fetches fresh data automatically.

**Moving a task** uses an *optimistic update*: the card jumps to the new column immediately, before the server answers. If the server rejects it, the card jumps back and an error is shown. This makes the board feel instant.

**Drag and drop** uses the browser's built-in drag events (no library). Every card also has a status dropdown, so it works with a keyboard and on phones.

**Routes:**
- `/login`, `/register`: only when logged out (logged-in users are sent to `/projects`).
- `/projects`, `/projects/:id`: only when logged in (others are sent to `/login`, then back afterwards).

---

## 8. Tests

**Backend**, `backend/src/test/kotlin/com/taskflow/`

- `service/*Test.kt`: **unit tests**. They test one service with fake repositories (MockK), so they're fast and test only the business rules, e.g. "creating a task with a past due date is rejected", "another user's task is not found and nothing is saved".
- `repository/TaskRepositoryTest.kt`: runs real queries against an in-memory H2 database to prove filters and sorting work.
- `controller/*IntegrationTest.kt`: **integration tests**. They start the whole app and send real HTTP requests: register → login → create project → create task, plus 401, 404 and 400 cases.

**Frontend**, `*.test.tsx` next to the components

React Testing Library renders a component and interacts with it like a user: types into fields, clicks buttons, then checks what's on screen. For example, `LoginForm.test.tsx` checks that an empty form shows "Email is required" and doesn't submit.

Run them with `.\gradlew.bat test` (backend) and `npm test` (frontend).

---

## 9. Running and deploying

| Where | How | Database |
|---|---|---|
| Your PC, quickest | `bootRun` with the `h2` profile + `npm run dev` | In-memory H2, wiped on restart |
| Your PC, realistic | `docker compose up --build` | PostgreSQL in Docker |
| Online | Render (API + PostgreSQL, from `render.yaml`) + Vercel (frontend, root directory `frontend`) | PostgreSQL on Render |

The **Dockerfiles** build each part in two stages: the first stage compiles the code; the second contains only what's needed to run it, which keeps images small. In Docker, **nginx** serves the frontend and forwards `/api` to the backend container.

**GitHub Actions** (`.github/workflows/ci.yml`) runs all tests, the TypeScript check, the production build and the Docker build on every push, so a broken change shows a red cross on GitHub.

---

## 10. How to demo it (about 5 minutes)

1. **Register** a new account. Point out the password rule and instant validation.
2. **Create a project**, then open its board.
3. **Add 3–4 tasks** with different priorities, due dates and assignees. Try a blank title to show the error.
4. **Drag a task** to another column. Watch the progress bar change.
5. **Filter** by priority, **sort** by due date, then clear the filters.
6. **Edit** and **delete** a task.
7. Open **Swagger** (`/swagger-ui.html`): log in, click **Authorize**, call `GET /api/projects`.
8. Show **ownership**: log in as a second user and open the first user's project URL → "Not found".
9. Show the **tests** passing, and the GitHub Actions run.

---

## 11. Questions you might be asked

**Why JWT instead of sessions?**
The server doesn't have to store logins, so any server instance can check any request. It fits a separate frontend calling an API. The trade-off: a token can't easily be cancelled before it expires, so expiry is kept short (60 minutes).

**Why 404 instead of 403 for someone else's project?**
403 would reveal that the ID exists. 404 reveals nothing.

**Where is the ownership check?**
Inside the database query (`findByIdAndOwnerId`), not after loading the row. So there's no way to forget it, and other users' data never even gets loaded.

**Why DTOs instead of returning entities?**
We control exactly what goes into the JSON, avoid leaking fields like password hashes, and can change the database without breaking the API.

**Why Flyway instead of letting Hibernate create tables?**
Schema changes become versioned, reviewable SQL files that run the same way everywhere. Hibernate only *validates* that the classes match the tables (`ddl-auto: validate`).

**Why is priority sorting special?**
Priorities are stored as text, and alphabetical order (HIGH, LOW, MEDIUM) is wrong. The Strategy class sorts by a numeric rank instead.

**How does auto-logout work?**
A timer set to the token's expiry time, plus a global check that logs out on any 401 response.

**Why validate on both frontend and backend?**
The frontend gives instant feedback; the backend is the real guard, because anyone can call the API directly.

**What would you add next?**
Team membership (so assignees can see projects), refresh tokens, comments on tasks, and real-time updates when teammates change the board.

**What was hardest?**
Good honest answers: getting ownership right everywhere (and testing it), sorting priority correctly, or keeping one consistent error format across validation, security and unexpected errors.

---

## 12. Glossary

| Term | Meaning |
|---|---|
| **API** | The set of URLs the frontend calls to get or change data. |
| **REST** | A style of API using URLs for things (`/projects/1`) and HTTP verbs for actions (GET, POST, PUT, PATCH, DELETE). |
| **DTO** | Data Transfer Object: a simple class describing the JSON sent or received. |
| **Entity** | A class that maps to a database table. |
| **JWT** | A signed token proving who you are, sent with every request. |
| **BCrypt** | A slow, salted password-hashing method. |
| **CORS** | The browser rule that controls which websites may call an API. |
| **Flyway** | A tool that runs versioned SQL files to build and update the database. |
| **Mock** | A fake object used in tests in place of a real dependency. |
| **React Query** | A library that fetches, caches and refreshes server data in React. |
| **Optimistic update** | Updating the screen before the server confirms, and undoing it if the server says no. |
