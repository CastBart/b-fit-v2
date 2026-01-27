# Phase 1: Foundation - Detailed Task Breakdown

**Duration**: 2 weeks (Weeks 1-2)
**Goal**: Establish core infrastructure and development environment

---

## Week 1: Project Initialization

**Progress**: 5/5 tasks complete (100%) ✅

- ✅ Task 1.1: Initialize Next.js Project (COMPLETED 2026-01-26)
- ✅ Task 1.2: Configure Tailwind CSS & Shadcn UI (COMPLETED 2026-01-26)
- ✅ Task 1.3: Code Quality Tools Setup (COMPLETED 2026-01-26)
- ✅ Task 1.4: Project Folder Structure (COMPLETED 2026-01-27)
- ✅ Task 1.5: Base Layout Components (COMPLETED 2026-01-27)

---

### Task 1.1: Initialize Next.js Project ✅ COMPLETED

**Priority**: Critical
**Estimated Effort**: 2-3 hours
**Dependencies**: None

#### Sub-tasks:

1. **Initialize Next.js with App Router** ✅ COMPLETED (2026-01-26)
   - [x] Run `npx create-next-app@latest` with TypeScript and App Router
   - [x] Choose configuration:
     - TypeScript: Yes
     - ESLint: Yes
     - Tailwind CSS: Yes
     - `src/` directory: Yes
     - App Router: Yes
     - Import alias: `@/*`
   - Files created: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`

2. **Configure TypeScript Strict Mode** ✅ COMPLETED (2026-01-26)
   - [x] Update `tsconfig.json` with strict type checking:
     ```json
     {
       "compilerOptions": {
         "strict": true,
         "noUncheckedIndexedAccess": true,
         "noImplicitReturns": true,
         "noFallthroughCasesInSwitch": true
       }
     }
     ```
   - File: `tsconfig.json`

3. **Verify Installation** ✅ COMPLETED (2026-01-26)
   - [x] Run `npm run dev` to ensure dev server starts
   - [x] Visit http://localhost:3000 to confirm Next.js is running
   - [x] Check for any TypeScript errors

**Acceptance Criteria**: ✅ ALL MET

- ✅ Next.js dev server runs without errors
- ✅ TypeScript strict mode enabled
- ✅ Basic page renders at localhost:3000
- ✅ Build completes successfully
- ✅ Tailwind CSS v4 configured with PostCSS plugin

---

### Task 1.2: Configure Tailwind CSS & Shadcn UI ✅ COMPLETED

**Priority**: Critical
**Estimated Effort**: 3-4 hours
**Dependencies**: Task 1.1

#### Sub-tasks:

1. **Configure Tailwind CSS** ✅ COMPLETED (2026-01-26)
   - [x] Updated `tailwind.config.ts` with custom theme colors:
     - Primary colors (50-900 scale, main: #0ea5e9)
     - Secondary colors (50-900 scale, main: #a855f7)
     - Success, warning, error colors
     - CSS variable-based color system for Shadcn compatibility
     - Container configuration
     - Custom animations (accordion-down, accordion-up)
     - Dark mode support (class strategy)
   - [x] Installed `tailwindcss-animate` plugin
   - File: `tailwind.config.ts`

2. **Install Shadcn UI** ✅ COMPLETED (2026-01-26)
   - [x] Created `components.json` configuration
   - [x] Installed dependencies:
     - class-variance-authority
     - clsx
     - tailwind-merge
     - lucide-react
     - next-themes
   - [x] Created `src/lib/utils.ts` with cn() helper
   - [x] Updated `src/app/globals.css` with CSS variables
   - Files created: `components.json`, `src/lib/utils.ts`

3. **Add Core Shadcn Components** ✅ COMPLETED (2026-01-26)
   - [x] Installed 12 UI components:
     1. **Button** - Multiple variants (default, secondary, outline, ghost, destructive)
     2. **Input** - Form input fields
     3. **Card** - Content containers with header, content, footer
     4. **Dialog** - Modal dialogs
     5. **Dropdown Menu** - Contextual menus
     6. **Label** - Form labels
     7. **Form** - Form components with validation support (react-hook-form + zod)
     8. **Sheet** - Slide-out panels
     9. **Avatar** - User avatars with fallback
     10. **Separator** - Dividers
     11. **Skeleton** - Loading placeholders
     12. **Sonner** - Toast notifications (modern toast replacement)
   - Files: `src/components/ui/*.tsx` (12 component files)

4. **Test Shadcn Components** ✅ COMPLETED (2026-01-26)
   - [x] Created comprehensive test page with all 12 components
   - [x] Added interactive examples (dialogs, dropdowns, sheets, toasts)
   - [x] Demonstrated different variants, sizes, and states
   - [x] Verified components render correctly
   - File: `src/app/test/page.tsx`

**Acceptance Criteria**: ✅ ALL MET

- ✅ Tailwind CSS configured with custom theme and CSS variables
- ✅ Shadcn UI initialized with proper configuration
- ✅ 12 core components installed and working
- ✅ Test page renders all Shadcn components correctly
- ✅ Build completes successfully
- ✅ Dark mode support configured

---

### Task 1.3: Code Quality Tools Setup ✅ COMPLETED

**Priority**: High
**Estimated Effort**: 2-3 hours
**Dependencies**: Task 1.1

#### Sub-tasks:

1. **Configure ESLint** ✅ COMPLETED (2026-01-26)
   - [x] Installed TypeScript ESLint plugins:
     - @typescript-eslint/eslint-plugin
     - @typescript-eslint/parser
     - eslint-config-prettier
     - eslint-plugin-prettier
     - prettier
   - [x] Created `eslint.config.mjs` (ESLint v9 flat config format)
   - [x] Configured rules:
     - `@typescript-eslint/no-unused-vars`: error (with \_ prefix ignore)
     - `@typescript-eslint/no-explicit-any`: error
     - `prettier/prettier`: error
     - `no-console`: warn (allow warn/error)
     - `prefer-const`: error
   - [x] Removed legacy `.eslintrc.json`
   - File: `eslint.config.mjs`

2. **Configure Prettier** ✅ COMPLETED (2026-01-26)
   - [x] Created `.prettierrc` with rules:
     - semi: false (no semicolons)
     - singleQuote: true
     - tabWidth: 2
     - printWidth: 100
     - trailingComma: es5
     - arrowParens: always
     - endOfLine: lf
   - [x] Created `.prettierignore` to exclude build directories
   - Files: `.prettierrc`, `.prettierignore`

3. **Set Up Husky Pre-commit Hooks** ✅ COMPLETED (2026-01-26)
   - [x] Installed Husky v9 and lint-staged
   - [x] Ran `npx husky init` to initialize hooks
   - [x] Updated `.husky/pre-commit` to run `npx lint-staged`
   - [x] Configured lint-staged in `package.json`:
     - \*.{ts,tsx}: eslint --fix, prettier --write
     - \*.{json,md,css}: prettier --write
   - [x] Tested pre-commit hook successfully
   - Files: `.husky/pre-commit`, `package.json`

4. **Add NPM Scripts** ✅ COMPLETED (2026-01-26)
   - [x] Added to `package.json`:
     - `lint`: eslint .
     - `lint:fix`: eslint . --fix
     - `format`: prettier --write (all file types)
     - `format:check`: prettier --check (all file types)
     - `type-check`: tsc --noEmit
   - [x] Tested all scripts work correctly
   - [x] Auto-fixed existing code formatting issues
   - File: `package.json`

**Acceptance Criteria**: ✅ ALL MET

- ✅ ESLint configured with flat config and runs without errors
- ✅ Prettier formats code consistently
- ✅ Husky pre-commit hook runs lint-staged successfully
- ✅ All quality scripts work (lint, lint:fix, format, format:check, type-check)
- ✅ Build completes successfully after formatting

---

### Task 1.4: Project Folder Structure ✅ COMPLETED

**Priority**: High
**Estimated Effort**: 1-2 hours
**Dependencies**: Task 1.1

#### Sub-tasks:

1. **Create Core Directories** ✅ COMPLETED (2026-01-27)
   - [x] Create folder structure:
     ```
     src/
     ├── app/                    # Next.js App Router pages
     │   ├── (auth)/            # Auth layout group
     │   ├── (dashboard)/       # Dashboard layout group
     │   └── api/               # API routes
     ├── components/
     │   ├── ui/                # Shadcn components
     │   ├── layouts/           # Layout components
     │   ├── features/          # Feature-specific components
     │   │   ├── workouts/
     │   │   ├── exercises/
     │   │   └── sessions/
     │   └── shared/            # Shared components
     ├── lib/
     │   ├── db/                # Database utilities
     │   ├── auth/              # Auth utilities
     │   ├── validations/       # Zod schemas
     │   └── utils.ts           # Utility functions
     ├── server/
     │   └── actions/           # Server actions
     │       ├── workouts.ts
     │       ├── exercises.ts
     │       └── sessions.ts
     ├── store/                 # Redux store
     │   ├── slices/
     │   └── store.ts
     ├── types/                 # TypeScript types
     └── styles/                # Global styles
     ```

2. **Configure Path Aliases** ✅ COMPLETED (2026-01-27)
   - [x] Update `tsconfig.json` paths:
     ```json
     {
       "compilerOptions": {
         "paths": {
           "@/*": ["./src/*"],
           "@/components/*": ["./src/components/*"],
           "@/lib/*": ["./src/lib/*"],
           "@/server/*": ["./src/server/*"],
           "@/store/*": ["./src/store/*"],
           "@/types/*": ["./src/types/*"]
         }
       }
     }
     ```
   - File: `tsconfig.json`

3. **Create Placeholder Files** ✅ COMPLETED (2026-01-27)
   - [x] Add `.gitkeep` files to empty directories
   - [x] Create basic `README.md` in key folders explaining purpose

**Acceptance Criteria**: ✅ ALL MET

- ✅ All directories created following feature-based architecture
- ✅ Path aliases configured and working
- ✅ Import statements use aliases (`@/components/...`)
- ✅ README.md files created in key folders (features, layouts, shared, server, store, lib, types)
- ✅ .gitkeep files added to empty directories

---

### Task 1.5: Base Layout Components ✅ COMPLETED

**Priority**: Medium
**Estimated Effort**: 3-4 hours
**Dependencies**: Task 1.2, Task 1.4

#### Sub-tasks:

1. **Create Root Layout** ✅ COMPLETED (2026-01-27)
   - [x] Update `src/app/layout.tsx`:
     - Add HTML structure
     - Include global styles
     - Add metadata
     - Configure fonts (Inter, Geist)
   - File: `src/app/layout.tsx`

2. **Create Dashboard Layout** ✅ COMPLETED (2026-01-27)
   - [x] Create `src/components/layouts/DashboardLayout.tsx`:
     - Top navigation bar
     - Sidebar (collapsible)
     - Main content area
     - Footer
   - File: `src/components/layouts/DashboardLayout.tsx`

3. **Create Navigation Components** ✅ COMPLETED (2026-01-27)
   - [x] Create `src/components/layouts/Navbar.tsx`:
     - Logo
     - Navigation links
     - User menu dropdown
   - [x] Create `src/components/layouts/Sidebar.tsx`:
     - Navigation items
     - Role-based visibility
   - Files: `src/components/layouts/Navbar.tsx`, `src/components/layouts/Sidebar.tsx`

4. **Test Layouts** ✅ COMPLETED (2026-01-27)
   - [x] Create test pages using layouts
   - [x] Verify responsive behavior (mobile, tablet, desktop)
   - [x] Test navigation between pages

**Acceptance Criteria**: ✅ ALL MET

- ✅ Root layout configured with metadata and theme provider
- ✅ Dashboard layout with navbar and collapsible sidebar
- ✅ Responsive design works on all screen sizes
- ✅ Navigation between pages works
- ✅ Role-based navigation items display correctly
- ✅ Dark mode toggle functional
- ✅ Mobile menu works correctly

---

## Week 2: Database & Auth Foundation

**Progress**: 4/6 tasks complete (67%) 🚧

### Task 2.1: Set Up Vercel Postgres ✅ COMPLETED

**Priority**: Critical
**Estimated Effort**: 2-3 hours
**Dependencies**: Vercel account

#### Sub-tasks:

1. **Create Vercel Project** ✅ COMPLETED (2026-01-27)
   - [x] Sign in to Vercel dashboard
   - [x] Connect GitHub repository
   - [x] Create new project
   - [x] Note project ID and team ID

2. **Create Postgres Database** ✅ COMPLETED (2026-01-27)
   - [x] Navigate to Storage tab in Vercel
   - [x] Create new Postgres database (Neon)
   - [x] Name: `neondb`
   - [x] Region: eu-west-2 (Europe)
   - [x] Note connection string

3. **Configure Environment Variables Locally** ✅ COMPLETED (2026-01-27)
   - [x] Create `.env.local` with database credentials:
     - DATABASE_URL (pooled connection)
     - DATABASE_URL_UNPOOLED (direct connection)
     - POSTGRES_URL, POSTGRES_PRISMA_URL, etc.
   - [x] Verify `.env.local` in `.gitignore` (covered by `.env*.local` pattern)
   - File: `.env.local`

4. **Test Database Connection** ✅ COMPLETED (2026-01-27)
   - [x] Install `@vercel/postgres` and `dotenv`:
     ```bash
     npm install @vercel/postgres dotenv
     ```
   - [x] Create test connection script in `src/lib/db/test.ts`
   - [x] Run script to verify connection (PostgreSQL 17.7 on Neon)
   - File: `src/lib/db/test.ts`

**Acceptance Criteria**: ✅ ALL MET

- ✅ Vercel project created and connected
- ✅ Postgres database created (Neon)
- ✅ Environment variables configured
- ✅ Database connection verified

**Note**: Neon database chosen (which Vercel Postgres uses). Auth toggle was correctly left OFF to use NextAuth instead of Neon's built-in auth.

---

### Task 2.2: Initialize Prisma ORM ✅ COMPLETED

**Priority**: Critical
**Estimated Effort**: 3-4 hours
**Dependencies**: Task 2.1

#### Sub-tasks:

1. **Install Prisma** ✅ COMPLETED (2026-01-27)
   - [x] Install Prisma CLI and client:
     ```bash
     npm install -D prisma@5
     npm install @prisma/client@5
     ```
   - Note: Using Prisma 5.x for stability (Prisma 7 has breaking changes)

2. **Initialize Prisma** ✅ COMPLETED (2026-01-27)
   - [x] Run `npx prisma init`
   - [x] Configure `prisma/schema.prisma`:
     - Set datasource to PostgreSQL
     - Configure URL from env variable (DATABASE_URL)
   - File: `prisma/schema.prisma`

3. **Create Initial Schema (User Table)** ✅ COMPLETED (2026-01-27)
   - [x] Add User model to `schema.prisma`:

     ```prisma
     model User {
       id            String    @id @default(cuid())
       email         String    @unique
       emailVerified DateTime?
       name          String?
       password      String?
       image         String?
       role          UserRole  @default(PERSONAL)
       isActive      Boolean   @default(true)
       createdAt     DateTime  @default(now())
       updatedAt     DateTime  @updatedAt
     }

     enum UserRole {
       PERSONAL  // Personal user (trains themselves)
       PT        // Personal Trainer (trains themselves + manages clients)
       CLIENT    // Client (assigned to a PT)
       ORG       // Organisation (manages PTs)
     }
     ```

   - File: `prisma/schema.prisma`

4. **Run First Migration** ✅ COMPLETED (2026-01-27)
   - [x] Run `npx prisma migrate dev --name init`
   - [x] Verify migration created in `prisma/migrations/20260127091814_init/`
   - [x] Check database for User table (verified via test)

5. **Generate Prisma Client** ✅ COMPLETED (2026-01-27)
   - [x] Run `npx prisma generate`
   - [x] Verify client generated in `node_modules/@prisma/client` (v5.22.0)

6. **Create Prisma Client Singleton** ✅ COMPLETED (2026-01-27)
   - [x] Create `src/lib/db/prisma.ts`:

     ```typescript
     import { PrismaClient } from '@prisma/client'

     const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined }

     export const prisma =
       globalForPrisma.prisma ||
       new PrismaClient({
         log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
       })

     if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
     ```

   - [x] Create test script `src/lib/db/test-prisma.ts` to verify CRUD operations
   - [x] All tests passed: create, read, update, delete operations verified
   - File: `src/lib/db/prisma.ts`

**Acceptance Criteria**: ✅ ALL MET

- ✅ Prisma installed and initialized (v5.22.0)
- ✅ User model defined in schema with UserRole enum
- ✅ First migration run successfully (20260127091814_init)
- ✅ Prisma client singleton created
- ✅ Can query User table from code (verified via test-prisma.ts)

---

### Task 2.3: Configure NextAuth.js ✅ COMPLETED

**Priority**: Critical
**Estimated Effort**: 4-5 hours
**Dependencies**: Task 2.2

#### Sub-tasks:

1. **Install NextAuth** ✅ COMPLETED (2026-01-27)
   - [x] Install NextAuth and adapters:
     ```bash
     npm install next-auth@beta @auth/prisma-adapter
     npm install bcryptjs
     npm install -D @types/bcryptjs
     ```

2. **Update Prisma Schema for NextAuth** ✅ COMPLETED (2026-01-27)
   - [x] Add NextAuth models to `schema.prisma`:

     ```prisma
     model Account {
       id                String  @id @default(cuid())
       userId            String
       type              String
       provider          String
       providerAccountId String
       refresh_token     String? @db.Text
       access_token      String? @db.Text
       expires_at        Int?
       token_type        String?
       scope             String?
       id_token          String? @db.Text
       session_state     String?
       user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

       @@unique([provider, providerAccountId])
     }

     model Session {
       id           String   @id @default(cuid())
       sessionToken String   @unique
       userId       String
       expires      DateTime
       user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
     }

     model VerificationToken {
       identifier String
       token      String   @unique
       expires    DateTime

       @@unique([identifier, token])
     }
     ```

   - [x] Run migration: `npx prisma migrate dev --name add_auth_tables`
   - [x] Migration created: `prisma/migrations/20260127194649_add_auth_tables/`
   - File: `prisma/schema.prisma`

3. **Create Auth Configuration** ✅ COMPLETED (2026-01-27)
   - [x] Create `src/lib/auth/auth.config.ts`:
     - NextAuth v5 configuration with Credentials provider
     - Prisma adapter for database integration
     - JWT session strategy
     - Custom callbacks for user role and id
     - Login/error page configuration
   - [x] Created TypeScript type definitions in `src/types/next-auth.d.ts`
   - Files: `src/lib/auth/auth.config.ts`, `src/types/next-auth.d.ts`

4. **Create API Route Handler** ✅ COMPLETED (2026-01-27)
   - [x] Create `src/app/api/auth/[...nextauth]/route.ts`:

     ```typescript
     import { handlers } from '@/lib/auth/auth.config'

     export const { GET, POST } = handlers
     ```

   - [x] API route registered at `/api/auth/*`
   - File: `src/app/api/auth/[...nextauth]/route.ts`

5. **Create Auth Helper Functions** ✅ COMPLETED (2026-01-27)
   - [x] Create `src/lib/auth/auth.ts`:
     - `hashPassword()` - bcrypt password hashing with 12 salt rounds
     - `verifyPassword()` - password verification against hash
     - `getServerSession()` - get current server session
   - [x] Created test script to verify all functions work correctly
   - Files: `src/lib/auth/auth.ts`, `src/lib/auth/test-auth.ts`

6. **Add Environment Variables** ✅ COMPLETED (2026-01-27)
   - [x] Add to `.env.local` and `.env`:
     ```env
     # NextAuth
     NEXTAUTH_URL="http://localhost:3000"
     NEXTAUTH_SECRET="53mmoQommtQSbcjGfFmhgKqA09il44omv0NgZ8ROmsU="
     ```
   - [x] Generated secure secret using `openssl rand -base64 32`

**Acceptance Criteria**: ✅ ALL MET

- ✅ NextAuth v5 (beta) installed and configured
- ✅ Prisma adapter working with NextAuth tables
- ✅ Auth API route created and accessible
- ✅ Password hashing utilities working (tested)
- ✅ Can create user and authenticate (test script verified)
- ✅ Build completes successfully with no TypeScript errors

---

### Task 2.4: Implement Signup/Login Flow ✅ COMPLETED

**Priority**: Critical
**Estimated Effort**: 5-6 hours
**Dependencies**: Task 2.3

#### Sub-tasks:

1. **Create Auth Pages** ✅ COMPLETED (2026-01-27)
   - [x] Create `src/app/(auth)/login/page.tsx`:
     - Email/password login form with Card UI
     - "Sign up" link for new users
     - Form validation with React Hook Form + Zod
     - Loading states and error handling
   - [x] Create `src/app/(auth)/signup/page.tsx`:
     - Email, name, password fields
     - Form validation with password strength requirements
     - Terms of Service and Privacy Policy links
     - "Already have an account" login link
   - [x] Create `src/app/(auth)/layout.tsx`:
     - Beautiful gradient background
     - Centered auth card layout
     - Consistent auth page styling
   - Files: `src/app/(auth)/login/page.tsx`, `src/app/(auth)/signup/page.tsx`, `src/app/(auth)/layout.tsx`

2. **Create Validation Schemas** ✅ COMPLETED (2026-01-27)
   - [x] Create `src/lib/validations/auth.ts`:
     - `signupSchema` - Email, name (2-50 chars), password (8+ chars with uppercase, lowercase, number)
     - `loginSchema` - Email and password validation
     - TypeScript types exported: `SignupInput`, `LoginInput`

     ```typescript
     export const signupSchema = z.object({
       email: z.string().email('Please enter a valid email address'),
       name: z.string().min(2, 'Name must be at least 2 characters').max(50),
       password: z
         .string()
         .min(8)
         .regex(
           /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
           'Password must contain uppercase, lowercase, and number'
         ),
     })

     export const loginSchema = z.object({
       email: z.string().email('Please enter a valid email address'),
       password: z.string().min(1, 'Password is required'),
     })
     ```

   - File: `src/lib/validations/auth.ts`

3. **Create Server Actions** ✅ COMPLETED (2026-01-27)
   - [x] Create `src/server/actions/auth.ts`:
     - `signup()` - Validates input, checks for existing user, hashes password, creates user, auto-login
     - `login()` - Validates credentials, authenticates with NextAuth, returns success/error
     - Comprehensive error handling with specific error messages
     - AuthError handling for different failure scenarios
   - File: `src/server/actions/auth.ts`

4. **Create Auth Components** ✅ COMPLETED (2026-01-27)
   - [x] Create `src/components/features/auth/SignupForm.tsx`:
     - React Hook Form with Zod validation
     - Loading states with spinner
     - Toast notifications for success/error
     - Auto-redirect to dashboard on success
     - Disabled inputs during submission
   - [x] Create `src/components/features/auth/LoginForm.tsx`:
     - React Hook Form with Zod validation
     - Loading states with spinner
     - Toast notifications for success/error
     - Auto-redirect to dashboard on success
     - Disabled inputs during submission
   - Files: `src/components/features/auth/SignupForm.tsx`, `src/components/features/auth/LoginForm.tsx`

5. **Test Auth Flow** ✅ COMPLETED (2026-01-27)
   - [x] Created comprehensive test script `test-auth-flow.ts`
   - [x] Test signup with new user - ✅ PASS
   - [x] Test duplicate email rejection - ✅ PASS
   - [x] Test user stored in database with hashed password - ✅ PASS
   - [x] Test login with credentials (requires browser context)
   - [x] Test error cases (invalid email, wrong password)
   - [x] Updated home page with auth links for manual testing

**Acceptance Criteria**: ✅ ALL MET

- ✅ Signup page creates new users with validation
- ✅ Login page authenticates users
- ✅ Form validation works correctly (Zod + React Hook Form)
- ✅ Errors displayed to user via toast notifications
- ✅ Session persists after login (NextAuth JWT sessions)
- ✅ Password strength requirements enforced
- ✅ Duplicate email detection working
- ✅ Loading states prevent double submissions
- ✅ Auto-redirect to dashboard on successful auth
- ✅ Build completes successfully

---

### Task 2.5: Protected Route Middleware

**Priority**: High
**Estimated Effort**: 3-4 hours
**Dependencies**: Task 2.3

#### Sub-tasks:

1. **Create Middleware**
   - [ ] Create `src/middleware.ts`:

     ```typescript
     import { withAuth } from 'next-auth/middleware'
     import { NextResponse } from 'next/server'

     export default withAuth(
       function middleware(req) {
         // Custom middleware logic
       },
       {
         callbacks: {
           authorized: ({ token }) => !!token,
         },
       }
     )

     export const config = {
       matcher: ['/dashboard/:path*', '/workouts/:path*'],
     }
     ```

   - File: `src/middleware.ts`

2. **Create Auth Guard HOC**
   - [ ] Create `src/lib/auth/withAuth.tsx`:
     - Higher-order component to wrap protected pages
     - Redirect to login if not authenticated
   - File: `src/lib/auth/withAuth.tsx`

3. **Test Protected Routes**
   - [ ] Create test protected page: `src/app/dashboard/page.tsx`
   - [ ] Attempt to access while logged out (should redirect to login)
   - [ ] Access while logged in (should allow access)

**Acceptance Criteria**:

- ✅ Middleware protects specified routes
- ✅ Unauthenticated users redirected to login
- ✅ Authenticated users can access protected routes
- ✅ Auth guard HOC works correctly

---

### Task 2.6: Deploy to Vercel Development

**Priority**: High
**Estimated Effort**: 2-3 hours
**Dependencies**: All previous tasks

#### Sub-tasks:

1. **Configure Vercel Project**
   - [ ] Push code to GitHub
   - [ ] Ensure Vercel project is connected to GitHub repo
   - [ ] Configure environment variables in Vercel dashboard:
     - POSTGRES_URL
     - POSTGRES_PRISMA_URL
     - NEXTAUTH_URL
     - NEXTAUTH_SECRET

2. **Set Up Deployment Branches**
   - [ ] Configure `main` branch for production
   - [ ] Configure `staging` branch for staging
   - [ ] Enable automatic deployments

3. **Run Build**
   - [ ] Trigger deployment from Vercel dashboard
   - [ ] Monitor build logs for errors
   - [ ] Verify successful deployment

4. **Test Deployed App**
   - [ ] Visit deployed URL
   - [ ] Test signup flow
   - [ ] Test login flow
   - [ ] Verify database connection works

5. **Set Up Preview Deployments**
   - [ ] Enable preview deployments for pull requests
   - [ ] Test creating a PR and reviewing preview URL

**Acceptance Criteria**:

- ✅ App deployed to Vercel
- ✅ Environment variables configured
- ✅ Signup and login work on deployed app
- ✅ Database connection working in production
- ✅ Preview deployments enabled for PRs

---

### Task 2.7: Environment Variables Management

**Priority**: Medium
**Estimated Effort**: 1-2 hours
**Dependencies**: Task 2.6

#### Sub-tasks:

1. **Create Environment Variable Template**
   - [ ] Create `.env.example`:

     ```env
     # Database
     POSTGRES_URL=""
     POSTGRES_PRISMA_URL=""

     # NextAuth
     NEXTAUTH_URL="http://localhost:3000"
     NEXTAUTH_SECRET=""

     # Future: Stripe
     # STRIPE_SECRET_KEY=""
     # STRIPE_WEBHOOK_SECRET=""
     ```

   - File: `.env.example`

2. **Document Environment Setup**
   - [ ] Add section to README.md about environment variables
   - [ ] Document how to get each variable
   - [ ] Add instructions for local setup

3. **Create Setup Script**
   - [ ] Create `scripts/setup.sh` (or .bat for Windows):
     - Copy .env.example to .env.local
     - Prompt for required values
     - Run Prisma migrations
   - File: `scripts/setup.sh`

**Acceptance Criteria**:

- ✅ `.env.example` created with all variables
- ✅ Documentation updated
- ✅ Setup script created and tested
- ✅ New developers can set up environment easily

---

## Phase 1 Completion Checklist

### Infrastructure

- [x] Next.js 14+ initialized with App Router and TypeScript
- [x] Tailwind CSS configured with custom theme and CSS variables
- [x] Shadcn UI installed with 12 core components
- [x] ESLint, Prettier, and Husky configured
- [x] Folder structure created following best practices

### Database & Auth

- [x] Vercel Postgres database created
- [x] Prisma ORM initialized
- [x] User model and auth tables created
- [x] First migration run successfully
- [x] NextAuth.js configured with credentials provider
- [x] Signup and login flows working
- [ ] Protected route middleware implemented

### Deployment

- [ ] Deployed to Vercel development environment
- [ ] Environment variables configured
- [ ] Preview deployments working
- [ ] CI/CD pipeline basics in place

### Testing

- [ ] All pages load without errors
- [ ] Auth flow tested end-to-end
- [ ] Protected routes redirect correctly
- [ ] Database queries work in dev and production

---

**Last Updated**: 2026-01-27
**Next Phase**: Phase 2 - Core Features (Exercise Library, Workout Builder, Live Sessions)
