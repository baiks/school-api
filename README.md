# School Management System API

A RESTful API for managing schools, classrooms, and students — built on the [Axion](https://github.com/qantra-io/axion) template.

---

## Table of Contents

- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Setup & Installation](#setup--installation)
- [Authentication Flow](#authentication-flow)
- [API Endpoints](#api-endpoints)
  - [Auth](#auth)
  - [Schools](#schools)
  - [Classrooms](#classrooms)
  - [Students](#students)
  - [Users](#users)
- [Error Codes](#error-codes)
- [Role-Based Access Control](#role-based-access-control)
- [Rate Limiting](#rate-limiting)
- [Running Tests](#running-tests)
- [Deployment](#deployment)
- [Assumptions](#assumptions)

---

## Architecture

```
school-api/
├── index.js                         # Entry point
├── config/
│   ├── index.config.js              # Loads env vars, validates secrets
│   └── envs/
│       ├── development.js
│       └── production.js
├── connect/
│   └── mongo.js                     # MongoDB connection
├── loaders/
│   └── ManagersLoader.js            # Wires all managers together
├── managers/
│   ├── ResponseDispatcher.manager.js
│   ├── http/
│   │   └── user/
│   │       └── UserServer.manager.js  # Express server + all routes
│   └── entities/
│       ├── token/Token.manager.js     # JWT logic
│       ├── user/                      # User model + manager
│       ├── school/                    # School model + manager
│       ├── classroom/                 # Classroom model + manager
│       └── student/                   # Student model + manager
├── mws/
│   ├── auth.mw.js                   # JWT auth + RBAC middleware
│   └── validate.mw.js               # Required-field validation
├── scripts/
│   └── seed.js                      # Creates initial superadmin
└── tests/
    └── api.test.js                  # Integration tests
```

The architecture follows the Axion pattern: managers handle business logic, the HTTP server wires routes to managers, and middleware enforces auth/validation before any handler runs.

---

## Database Schema

### Users
| Field     | Type     | Notes                              |
|-----------|----------|------------------------------------|
| username  | String   | Unique, required                   |
| email     | String   | Unique, required                   |
| password  | String   | Bcrypt hashed                      |
| role      | String   | `superadmin` \| `school_admin`     |
| schoolId  | ObjectId | FK → School (null for superadmin)  |
| isActive  | Boolean  | Soft delete flag                   |

### Schools
| Field    | Type    | Notes             |
|----------|---------|-------------------|
| name     | String  | Required, unique  |
| address  | String  | Required          |
| phone    | String  | Optional          |
| email    | String  | Optional          |
| website  | String  | Optional          |
| isActive | Boolean | Soft delete flag  |

### Classrooms
| Field     | Type     | Notes                          |
|-----------|----------|--------------------------------|
| name      | String   | Required; unique per school    |
| schoolId  | ObjectId | FK → School, required          |
| capacity  | Number   | Required, min 1                |
| resources | [String] | e.g. ["projector", "whiteboard"]|
| isActive  | Boolean  | Soft delete flag               |

> Compound unique index on `(name, schoolId)` prevents duplicate classroom names within the same school.

### Students
| Field       | Type     | Notes                          |
|-------------|----------|--------------------------------|
| firstName   | String   | Required                       |
| lastName    | String   | Required                       |
| email       | String   | Unique, required               |
| dateOfBirth | Date     | Optional                       |
| schoolId    | ObjectId | FK → School, required          |
| classroomId | ObjectId | FK → Classroom, nullable       |
| isEnrolled  | Boolean  | Soft delete / unenroll flag    |

---

## Setup & Installation

### Prerequisites
- Node.js >= 16
- MongoDB >= 5
- Redis >= 6

### 1. Clone & install

```bash
git clone <your-repo-url>
cd school-api
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Generate the required secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run that 3 times and paste the outputs into `.env` for:
- `LONG_TOKEN_SECRET`
- `SHORT_TOKEN_SECRET`
- `NACL_SECRET`

### 3. Seed the superadmin

```bash
node scripts/seed.js
```

This creates:
- **Email:** `superadmin@school-api.com`
- **Password:** `SuperAdmin@123`

> ⚠️ Change this password immediately in production.

### 4. Start the server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

The API runs on `http://localhost:5111`.

---

## Authentication Flow

```
1. Login  →  POST /api/auth/login
             Returns: longToken (30d) + shortToken (1h)

2. Use API →  Set header:  Authorization: Bearer <shortToken>

3. Refresh → POST /api/auth/refresh  { longToken }
             Returns: new shortToken (1h)
```

Both tokens are JWT-signed with separate secrets. Short tokens are used for every API call to minimize exposure risk.

---

## API Endpoints

All responses follow this envelope:

```json
{
  "ok": true | false,
  "data": { ... } | null,
  "errors": null | "error description",
  "message": "success" | "error description"
}
```

### Auth

#### POST `/api/auth/login`
Login and receive tokens.

**Request:**
```json
{ "email": "user@example.com", "password": "yourpassword" }
```

**Response `200`:**
```json
{
  "ok": true,
  "data": {
    "user": { "_id": "...", "email": "...", "role": "superadmin" },
    "longToken": "eyJ...",
    "shortToken": "eyJ..."
  }
}
```

---

#### POST `/api/auth/register`
Create a new `school_admin` user. **Superadmin only.**

**Request:**
```json
{
  "username": "admin_john",
  "email": "john@school.com",
  "password": "securepass",
  "role": "school_admin",
  "schoolId": "64abc123..."
}
```

**Response `200`:**
```json
{ "ok": true, "data": { "_id": "...", "username": "admin_john", "role": "school_admin" } }
```

---

#### POST `/api/auth/refresh`
Exchange a long token for a fresh short token.

**Request:**
```json
{ "longToken": "eyJ..." }
```

**Response `200`:**
```json
{ "ok": true, "data": { "shortToken": "eyJ..." } }
```

---

#### GET `/api/auth/me`
Get the authenticated user's profile.

**Headers:** `Authorization: Bearer <shortToken>`

**Response `200`:**
```json
{ "ok": true, "data": { "_id": "...", "email": "...", "role": "..." } }
```

---

### Schools

> All school routes require authentication. Write operations are superadmin-only.

#### GET `/api/schools`
List all active schools. Supports pagination.

**Query params:** `page` (default 1), `limit` (default 20)

**Response `200`:**
```json
{
  "ok": true,
  "data": {
    "schools": [ { "_id": "...", "name": "...", "address": "..." } ],
    "total": 5,
    "page": 1,
    "limit": 20
  }
}
```

---

#### POST `/api/schools` *(superadmin only)*
Create a new school.

**Request:**
```json
{
  "name": "Greenwood High",
  "address": "123 Oak Street, Nairobi",
  "phone": "+254700000000",
  "email": "info@greenwood.ac.ke",
  "website": "https://greenwood.ac.ke"
}
```

**Response `201`:**
```json
{ "ok": true, "data": { "_id": "...", "name": "Greenwood High", ... } }
```

---

#### GET `/api/schools/:id`
Get a school by ID. School admins are restricted to their own school.

---

#### PUT `/api/schools/:id` *(superadmin only)*
Update school fields.

**Request:** Any subset of `{ name, address, phone, email, website }`

---

#### DELETE `/api/schools/:id` *(superadmin only)*
Soft-delete a school (sets `isActive: false`).

---

### Classrooms

> School admins can only manage classrooms within their assigned school.

#### GET `/api/classrooms`
List classrooms. School admins see only their school's classrooms.

**Query params:** `schoolId` (superadmin only), `page`, `limit`

---

#### POST `/api/classrooms`
Create a classroom.

**Request:**
```json
{
  "name": "Room 101",
  "schoolId": "64abc...",
  "capacity": 30,
  "resources": ["projector", "whiteboard", "air conditioning"]
}
```

> School admins do not need to supply `schoolId` — it's inferred from their token.

**Response `201`:**
```json
{ "ok": true, "data": { "_id": "...", "name": "Room 101", "capacity": 30, ... } }
```

---

#### GET `/api/classrooms/:id`
Get a classroom by ID.

---

#### PUT `/api/classrooms/:id`
Update classroom fields. School admins restricted to their school's classrooms.

**Request:** Any subset of `{ name, capacity, resources }`

---

#### DELETE `/api/classrooms/:id`
Soft-delete a classroom.

---

### Students

> School admins can only manage students enrolled in their school.

#### GET `/api/students`
List enrolled students.

**Query params:** `schoolId` (superadmin only), `classroomId`, `page`, `limit`

---

#### POST `/api/students`
Enroll a new student.

**Request:**
```json
{
  "firstName": "Alice",
  "lastName": "Kamau",
  "email": "alice@example.com",
  "dateOfBirth": "2010-03-15",
  "schoolId": "64abc...",
  "classroomId": "64def..."
}
```

**Response `201`:**
```json
{ "ok": true, "data": { "_id": "...", "firstName": "Alice", ... } }
```

---

#### GET `/api/students/:id`
Get a student by ID.

---

#### PUT `/api/students/:id`
Update student profile. Cannot change `schoolId` via this endpoint — use `/transfer` instead.

---

#### POST `/api/students/:id/transfer`
Transfer a student to a different school/classroom.

**Request:**
```json
{
  "targetSchoolId": "64xyz...",
  "targetClassroomId": "64uvw..."
}
```

> School admins can only transfer students from their own school.

**Response `200`:**
```json
{ "ok": true, "data": { "_id": "...", "schoolId": "64xyz...", ... } }
```

---

#### DELETE `/api/students/:id`
Unenroll a student (sets `isEnrolled: false`).

---

### Users

#### GET `/api/users` *(superadmin only)*
List all users. Supports `?role=school_admin&schoolId=...` filter.

---

#### DELETE `/api/users/:id` *(superadmin only)*
Deactivate a user account.

---

## Error Codes

| HTTP Status | Meaning                                      |
|-------------|----------------------------------------------|
| 400         | Bad request / missing required fields        |
| 401         | Unauthenticated (missing or invalid token)   |
| 403         | Forbidden (insufficient role)                |
| 404         | Resource not found                           |
| 409         | Conflict (duplicate name/email)              |
| 429         | Rate limit exceeded                          |
| 500         | Internal server error                        |

---

## Role-Based Access Control

| Action                        | Superadmin | School Admin        |
|-------------------------------|:----------:|:-------------------:|
| Create / delete schools       | ✅          | ❌                  |
| View schools                  | ✅          | Own school only     |
| Update schools                | ✅          | ❌                  |
| Create school admins          | ✅          | ❌                  |
| Manage classrooms             | ✅          | Own school only     |
| Manage students               | ✅          | Own school only     |
| Transfer students             | ✅          | From own school     |
| List all users                | ✅          | ❌                  |

---

## Rate Limiting

- **Development:** 100 requests per IP per 15 minutes
- **Production:** 60 requests per IP per 15 minutes

Exceeding the limit returns:
```json
{ "ok": false, "message": "Too many requests, please try again later." }
```

---

## Running Tests

Ensure MongoDB is running, then:

```bash
npm test
```

Tests cover:
- Authentication (login, refresh, profile)
- School CRUD
- Classroom CRUD
- Student CRUD + transfer
- RBAC enforcement (superadmin-only routes, school isolation)
- 401/403 responses for unauthenticated/unauthorized requests

---

## Deployment

### Using Railway / Render / Fly.io

1. Push to a public GitHub repository
2. Connect your repo to your hosting provider
3. Set all environment variables from `.env.example`
4. Set `ENV=production`
5. Use a hosted MongoDB (e.g. MongoDB Atlas) and Redis (e.g. Upstash)

### Docker (optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5111
CMD ["node", "index.js"]
```

```bash
docker build -t school-api .
docker run -p 5111:5111 --env-file .env school-api
```

---

## Assumptions

1. **Soft deletes** — Schools, classrooms, and students are never hard-deleted. `isActive: false` / `isEnrolled: false` flags are used so historical data is preserved.
2. **Token strategy** — Long tokens (30d) are for refresh only; short tokens (1h) are for all API calls. This minimizes damage from a leaked token.
3. **Student uniqueness** — A student is identified by email globally. If the same person transfers schools, their record is updated rather than duplicated.
4. **Classroom uniqueness** — Classroom names must be unique per school (not globally), enforced by a compound MongoDB index.
5. **School admin isolation** — School admins can only read/write resources belonging to their `schoolId`. This is enforced server-side regardless of what they pass in the request body.
6. **Superadmin creation** — The first superadmin is created via the seed script. Subsequent admins are created via `POST /api/auth/register` by an authenticated superadmin.
