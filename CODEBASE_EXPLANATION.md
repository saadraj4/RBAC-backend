# Complete Architectural & Codebase Guide: RBAC-backend

Yeh document **RBAC-backend** codebase ka mukammal, step-by-step aur gehrayi se tajziya (deep-dive analysis) hai. Is me har aik file, architectural design decision, security practice, data flow, aur Zod validation architecture tafseel se bayan ki gayi hai.

---

## 1. Project Overview & Core Philosophy

Yeh project aik **Role-Based Access Control (RBAC) Authentication & User Management Backend** hai jo **Node.js, Express, PostgreSQL, Prisma ORM, aur Zod** par mabni hai.

### Hum ne is architecture ko is tarah kyun banaya?
Is codebase ko **Clean Architecture / Layered Architecture (Route -> Middleware -> Controller -> Service -> Data Access pattern)** par design kiya gaya hai:
1. **Separation of Concerns (Zimmedariyon ki taqseem):**
   - **Routes:** URLs aur HTTP methods ko middleware aur controllers ke sath map karte hain.
   - **Validators (`validators/`):** Zod schemas jo incoming request body, query params, ya route params ke rules define karte hain.
   - **Validation Middleware (`middleware/validate.js`):** Controller chalne se pehle data sanitize aur validate karta hai. Agar koi error ho toh controller tak request pohanchti hi nahi.
   - **Controllers:** Request aane par Service layer ko call karte hain aur HTTP response send karte hain.
   - **Services:** Sari business logic, calculations, database queries (Prisma), aur cryptography (Bcrypt, JWT, SHA-256) perform karte hain.
   - **Middleware:** Request verification, token validation aur authentication handle karta hai.
   - **Utils & Config:** Reusable helpers (response formatter, error wrapper, db connection, environment validation).
2. **Defensive Security & Data Integrity:**
   - Soft Deletes (data kabhi permanently delete nahi hota taake audit trail aur foreign key relations kharab na hon).
   - Refresh Token Rotation (replay attack se bachao).
   - Hashing tokens at rest (DB me refresh token plaintext nahi balke SHA-256 hash ki shakal me save hota hai).
   - Sensitive data stripping (User ka `passwordHash` kabhi bhi API response me bahar nahi jata).

---

## 2. Directory Structure & File Breakdown (ESM & Barrel Architecture)

```
RBAC-backend/
├── config/
│   ├── db.js                 # Singleton Prisma Client instance
│   ├── validateEnv.js        # Startup environment variables validation (Fail-fast)
│   ├── cors.js               # Dynamic CORS allowlist parser from .env
│   └── index.js              # Barrel export for config
├── controllers/
│   ├── authController.js     # Register, Login, Refresh, Logout, Me
│   ├── roleController.js     # Role CRUD operations & soft-delete
│   ├── userController.js     # User CRUD operations, status toggle, soft-delete
│   └── index.js              # Barrel export for all controllers
├── errors/
│   ├── AppError.js           # Domain AppError classes (BadRequest, NotFound, etc.)
│   └── index.js              # Barrel export for errors
├── middleware/
│   ├── authenticate.js       # JWT Access Token verification middleware
│   ├── validate.js           # Reusable Zod validation middleware (Route level)
│   ├── rateLimiter.js        # General & Auth rate limiters (express-rate-limit)
│   └── index.js              # Barrel export for middleware
├── prisma/
│   ├── schema.prisma         # Database models (Role, User, RefreshToken)
│   ├── seed.js               # Initial seeding in ESM (roles & super admin)
│   └── migrations/           # PostgreSQL migration history
├── routes/
│   ├── authRoutes.js         # /api/auth endpoints with Zod validation
│   ├── roleRoutes.js         # /api/roles endpoints with Zod validation
│   ├── userRoutes.js         # /api/users endpoints with Zod validation
│   └── index.js              # Barrel export & combined apiRouter
├── services/
│   ├── authService.js        # Auth logic, JWT generation, password/token hashing
│   ├── roleService.js        # Role database operations
│   ├── userService.js        # User database operations & projection
│   └── index.js              # Barrel export for all services
├── utils/
│   ├── asyncHandler.js       # Async error forwarding helper (No try/catch boilerplate)
│   ├── response.js           # Standardized API response & pagination helper
│   └── index.js              # Barrel export for utils
├── validators/
│   ├── authValidator.js      # Zod schemas for register, login, refresh, logout
│   ├── roleValidator.js      # Zod schemas for role create, update, id param
│   ├── userValidator.js      # Zod schemas for user create, update, status, id param
│   └── index.js              # Barrel export for validators
├── .env                      # Environment configuration
├── .env.example              # Template environment configuration
├── package.json              # Project dependencies & scripts ("type": "module")
└── server.js                 # Main entry point & Express app configuration
```

---

## 3. Request Flow With Zod Validation Middleware

```
Incoming Request
      │
      ▼
Express Route (e.g., POST /api/auth/register)
      │
      ▼
1. validate(registerSchema) [Zod Middleware]
      ├─ ❌ Invalid input -> Return 400 Bad Request immediately (Controller skip)
      └─ ✅ Valid input -> req.body sanitized & passed to next()
      │
      ▼
2. authenticate middleware (agar protected route ho)
      ├─ ❌ No token / Expired -> Return 401 Unauthorized
      └─ ✅ Valid Bearer token -> Attach req.user & pass to next()
      │
      ▼
3. asyncHandler(controller)
      │
      ▼
4. Controller calls Service Layer
      │
      ▼
5. Service interacts with Prisma ORM (Database)
      │
      ▼
6. sendSuccess / sendError formats consistent JSON response
```

---

## 4. Endpoints Ki Complete List

| Method | Endpoint | Auth Required | Validation (Zod) | Description |
|---|---|---|---|---|
| **POST** | `/api/auth/register` | No | `name`, `email`, `password >= 6`, `role?` | New user registration |
| **POST** | `/api/auth/login` | No | `email`, `password` | User login (returns access & refresh tokens) |
| **POST** | `/api/auth/refresh` | No | `refreshToken` | Rotates refresh token & issues new access token |
| **POST** | `/api/auth/logout` | No | `refreshToken?` | Revokes refresh token in database |
| **GET** | `/api/auth/me` | Yes (Bearer) | None | Fetches logged in user's profile |
| **GET** | `/api/roles/get-all` | Yes (Bearer) | Query (optional pagination) | List all roles (supports `?page=&limit=` or `?all=true`) |
| **GET** | `/api/roles/get/:id` | Yes (Bearer) | `id` (integer) | Get role by ID |
| **POST** | `/api/roles/create` | Yes (Bearer) | `name` | Create a new role |
| **PUT** | `/api/roles/update/:id` | Yes (Bearer) | `id` (integer), `name` | Update role name |
| **DELETE**| `/api/roles/delete/:id` | Yes (Bearer) | `id` (integer) | Soft-delete a role |
| **POST** | `/api/users/create` | Yes (Bearer) | `name`, `email`, `password >= 6`, `roleId?/role?`, `isActive?` | Create a user |
| **GET** | `/api/users/get-all` | Yes (Bearer) | Query (optional pagination & `?isActive=`) | List users |
| **GET** | `/api/users/get/:id` | Yes (Bearer) | `id` (integer) | Get user by ID |
| **PUT** | `/api/users/update/:id` | Yes (Bearer) | `id` (integer), at least one update field | Update user details |
| **PATCH**| `/api/users/status/:id` | Yes (Bearer) | `id` (integer), `isActive` (boolean) | Toggle user active/inactive status |
| **DELETE**| `/api/users/delete/:id` | Yes (Bearer) | `id` (integer) | Soft-delete a user |
| **GET** | `/api/health` | No | None | Server health check |

---

## 5. Security & Best Practices Summary

1. **Multiple Roles per User (`UserRole` Junction Model):** Aik user ke pass multiple roles (e.g. `admin`, `manager`, `user`) ho sakte hain. Database me explicit `UserRole` table lagaya gaya hai with composite primary key `@@id([userId, roleId])`.
2. **Database Performance Indexing (2A):** `User` par `@@index([isDeleted, isActive])` aur `@@index([createdAt(sort: Desc)])`, `RefreshToken` par `@@index([userId])` aur `@@index([expiresAt])`, aur `Role` par `@@index([isDeleted])` lagaye gaye hain taake baray datasets par queries lightning fast hon.
3. **Custom Domain Error Classes (3):** `AppError`, `NotFoundError`, `ConflictError`, `BadRequestError`, `ForbiddenError`, `UnauthorizedError` banaye gaye hain. Services aur controllers direct errors throw karte hain aur centralized error handler status codes aur codes automatically manage karta hai.
4. **Database Transactions (4):** Critical database operations jaise Refresh Token Rotation aur User Creation with multiple roles ko `prisma.$transaction` me wrap kiya gaya hai taake atomicity (All-or-Nothing) guarantee ho.
5. **Production Hardening & Configurable Rate Limiting (5):** `helmet()` ke zariye HTTP headers secure kiye gaye hain. Rate limiting ke parameters (`RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_GENERAL`, `RATE_LIMIT_MAX_AUTH`) `.env` se dynamically control hote hain. Auth endpoints par brute-force attacks block kiye gaye hain.
6. **Pure Named Exports Architecture:** Redundant dual exports (`export default`) khatam kar ke pure named exports standardize kiye gaye hain jo barrel files (`index.js`) ke sath perfectly integrate hote hain.
7. **Zod Validation Middleware (`middleware/validate.js`):** Controllers se pehle request sanitize hoti hai. Ghalat data database tak kabhi nahi pohanchta.
8. **PostgreSQL Connection Pooling (`pg.Pool` & `@prisma/adapter-pg`):** Prisma ko raw `pg.Pool` ke sath jora gaya hai. Connections pool me reuse hote hain aur server health check (`/api/health`) par pool stats (`total`, `idle`, `waiting`) monitor kiye ja sakte hain.
9. **Token Rotation & Hashing at Rest:** Refresh tokens DB me SHA-256 hash me save hote hain aur har refresh par purana token revoke ho jata hai.
10. **Soft Delete (`isDeleted`):** Accidental data deletion se bachao aur relational data intact rehta hai.
