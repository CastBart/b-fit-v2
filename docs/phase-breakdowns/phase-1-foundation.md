# Phase 1: Foundation - Detailed Task Breakdown

**Duration**: 2 weeks (Weeks 1-2)
**Goal**: Establish core infrastructure and development environment

---

## Week 1: Project Initialization

**Progress**: 3/5 tasks complete (60%)

- ✅ Task 1.1: Initialize Next.js Project (COMPLETED 2026-01-26)
- ✅ Task 1.2: Configure Tailwind CSS & Shadcn UI (COMPLETED 2026-01-26)
- ✅ Task 1.3: Code Quality Tools Setup (COMPLETED 2026-01-26)
- 🔲 Task 1.4: Project Folder Structure
- 🔲 Task 1.5: Base Layout Components

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

### Task 1.4: Project Folder Structure

**Priority**: High
**Estimated Effort**: 1-2 hours
**Dependencies**: Task 1.1

#### Sub-tasks:

1. **Create Core Directories**
   - [ ] Create folder structure:
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

2. **Configure Path Aliases**
   - [ ] Update `tsconfig.json` paths:
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

3. **Create Placeholder Files**
   - [ ] Add `.gitkeep` files to empty directories
   - [ ] Create basic `README.md` in key folders explaining purpose

**Acceptance Criteria**:

- ✅ All directories created following feature-based architecture
- ✅ Path aliases configured and working
- ✅ Import statements use aliases (`@/components/...`)

---

### Task 1.5: Base Layout Components

**Priority**: Medium
**Estimated Effort**: 3-4 hours
**Dependencies**: Task 1.2, Task 1.4

#### Sub-tasks:

1. **Create Root Layout**
   - [ ] Update `src/app/layout.tsx`:
     - Add HTML structure
     - Include global styles
     - Add metadata
     - Configure fonts (Inter, Geist)
   - File: `src/app/layout.tsx`

2. **Create Dashboard Layout**
   - [ ] Create `src/components/layouts/DashboardLayout.tsx`:
     - Top navigation bar
     - Sidebar (collapsible)
     - Main content area
     - Footer
   - File: `src/components/layouts/DashboardLayout.tsx`

3. **Create Navigation Components**
   - [ ] Create `src/components/layouts/Navbar.tsx`:
     - Logo
     - Navigation links
     - User menu dropdown
   - [ ] Create `src/components/layouts/Sidebar.tsx`:
     - Navigation items
     - Role-based visibility
   - Files: `src/components/layouts/Navbar.tsx`, `src/components/layouts/Sidebar.tsx`

4. **Test Layouts**
   - [ ] Create test pages using layouts
   - [ ] Verify responsive behavior (mobile, tablet, desktop)
   - [ ] Test navigation between pages

**Acceptance Criteria**:

- ✅ Root layout configured with metadata
- ✅ Dashboard layout with navbar and sidebar
- ✅ Responsive design works on all screen sizes
- ✅ Navigation between pages works

---

## Week 2: Database & Auth Foundation

### Task 2.1: Set Up Vercel Postgres

**Priority**: Critical
**Estimated Effort**: 2-3 hours
**Dependencies**: Vercel account

#### Sub-tasks:

1. **Create Vercel Project**
   - [ ] Sign in to Vercel dashboard
   - [ ] Connect GitHub repository
   - [ ] Create new project
   - [ ] Note project ID and team ID

2. **Create Postgres Database**
   - [ ] Navigate to Storage tab in Vercel
   - [ ] Create new Postgres database
   - [ ] Name: `b-fit-dev`
   - [ ] Region: Choose closest to users
   - [ ] Note connection string

3. **Configure Environment Variables Locally**
   - [ ] Create `.env.local`:
     ```env
     # Database
     POSTGRES_URL="postgres://..."
     POSTGRES_PRISMA_URL="postgres://..."
     POSTGRES_URL_NON_POOLING="postgres://..."
     ```
   - [ ] Add `.env.local` to `.gitignore`
   - File: `.env.local`

4. **Test Database Connection**
   - [ ] Install `@vercel/postgres`:
     ```bash
     npm install @vercel/postgres
     ```
   - [ ] Create test connection script in `src/lib/db/test.ts`
   - [ ] Run script to verify connection

**Acceptance Criteria**:

- ✅ Vercel project created and connected
- ✅ Postgres database created
- ✅ Environment variables configured
- ✅ Database connection verified

---

### Task 2.2: Initialize Prisma ORM

**Priority**: Critical
**Estimated Effort**: 3-4 hours
**Dependencies**: Task 2.1

#### Sub-tasks:

1. **Install Prisma**
   - [ ] Install Prisma CLI and client:
     ```bash
     npm install -D prisma
     npm install @prisma/client
     ```

2. **Initialize Prisma**
   - [ ] Run `npx prisma init`
   - [ ] Configure `prisma/schema.prisma`:
     - Set datasource to PostgreSQL
     - Configure URL from env variable
   - File: `prisma/schema.prisma`

3. **Create Initial Schema (User Table)**
   - [ ] Add User model to `schema.prisma`:

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
       PERSONAL
       PT
       CLIENT
       ORG
     }
     ```

   - File: `prisma/schema.prisma`

4. **Run First Migration**
   - [ ] Run `npx prisma migrate dev --name init`
   - [ ] Verify migration created in `prisma/migrations/`
   - [ ] Check database for User table

5. **Generate Prisma Client**
   - [ ] Run `npx prisma generate`
   - [ ] Verify client generated in `node_modules/@prisma/client`

6. **Create Prisma Client Singleton**
   - [ ] Create `src/lib/db/prisma.ts`:

     ```typescript
     import { PrismaClient } from '@prisma/client'

     const globalForPrisma = global as unknown as { prisma: PrismaClient }

     export const prisma =
       globalForPrisma.prisma ||
       new PrismaClient({
         log: ['query', 'error', 'warn'],
       })

     if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
     ```

   - File: `src/lib/db/prisma.ts`

**Acceptance Criteria**:

- ✅ Prisma installed and initialized
- ✅ User model defined in schema
- ✅ First migration run successfully
- ✅ Prisma client singleton created
- ✅ Can query User table from code

---

### Task 2.3: Configure NextAuth.js

**Priority**: Critical
**Estimated Effort**: 4-5 hours
**Dependencies**: Task 2.2

#### Sub-tasks:

1. **Install NextAuth**
   - [ ] Install NextAuth and adapters:
     ```bash
     npm install next-auth@beta @auth/prisma-adapter
     npm install bcryptjs
     npm install -D @types/bcryptjs
     ```

2. **Update Prisma Schema for NextAuth**
   - [ ] Add NextAuth models to `schema.prisma`:

     ```prisma
     model Account {
       id                String  @id @default(cuid())
       userId            String
       type              String
       provider          String
       providerAccountId String
       refresh_token     String?
       access_token      String?
       expires_at        Int?
       token_type        String?
       scope             String?
       id_token          String?
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

   - [ ] Run migration: `npx prisma migrate dev --name add_auth_tables`
   - File: `prisma/schema.prisma`

3. **Create Auth Configuration**
   - [ ] Create `src/lib/auth/auth.config.ts`:
     - Configure NextAuth options
     - Set up Credentials provider
     - Add Prisma adapter
     - Configure JWT and session strategy
   - File: `src/lib/auth/auth.config.ts`

4. **Create API Route Handler**
   - [ ] Create `src/app/api/auth/[...nextauth]/route.ts`:

     ```typescript
     import NextAuth from 'next-auth'
     import { authConfig } from '@/lib/auth/auth.config'

     const handler = NextAuth(authConfig)

     export { handler as GET, handler as POST }
     ```

   - File: `src/app/api/auth/[...nextauth]/route.ts`

5. **Create Auth Helper Functions**
   - [ ] Create `src/lib/auth/auth.ts`:
     - `hashPassword()`
     - `verifyPassword()`
     - `getServerSession()`
   - File: `src/lib/auth/auth.ts`

6. **Add Environment Variables**
   - [ ] Add to `.env.local`:
     ```env
     # NextAuth
     NEXTAUTH_URL="http://localhost:3000"
     NEXTAUTH_SECRET="<generate with: openssl rand -base64 32>"
     ```

**Acceptance Criteria**:

- ✅ NextAuth installed and configured
- ✅ Prisma adapter working
- ✅ Auth API route created
- ✅ Password hashing utilities working
- ✅ Can create user and authenticate

---

### Task 2.4: Implement Signup/Login Flow

**Priority**: Critical
**Estimated Effort**: 5-6 hours
**Dependencies**: Task 2.3

#### Sub-tasks:

1. **Create Auth Pages**
   - [ ] Create `src/app/(auth)/login/page.tsx`:
     - Email/password login form
     - "Sign up" link
     - Form validation with React Hook Form + Zod
   - [ ] Create `src/app/(auth)/signup/page.tsx`:
     - Email, name, password fields
     - Password confirmation
     - Form validation
   - Files: `src/app/(auth)/login/page.tsx`, `src/app/(auth)/signup/page.tsx`

2. **Create Validation Schemas**
   - [ ] Create `src/lib/validations/auth.ts`:

     ```typescript
     import { z } from 'zod'

     export const signupSchema = z.object({
       email: z.string().email(),
       name: z.string().min(2),
       password: z.string().min(8),
     })

     export const loginSchema = z.object({
       email: z.string().email(),
       password: z.string().min(8),
     })
     ```

   - File: `src/lib/validations/auth.ts`

3. **Create Server Actions**
   - [ ] Create `src/server/actions/auth.ts`:
     - `signup()` - Create user account
     - `login()` - Authenticate user
     - Handle errors and return appropriate messages
   - File: `src/server/actions/auth.ts`

4. **Create Auth Components**
   - [ ] Create `src/components/features/auth/SignupForm.tsx`
   - [ ] Create `src/components/features/auth/LoginForm.tsx`
   - [ ] Add loading states
   - [ ] Add error handling
   - Files: `src/components/features/auth/SignupForm.tsx`, `LoginForm.tsx`

5. **Test Auth Flow**
   - [ ] Test signup with new user
   - [ ] Test login with credentials
   - [ ] Test error cases (invalid email, wrong password)
   - [ ] Verify session persists across page refresh

**Acceptance Criteria**:

- ✅ Signup page creates new users
- ✅ Login page authenticates users
- ✅ Form validation works correctly
- ✅ Errors displayed to user
- ✅ Session persists after login

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
- [ ] Folder structure created following best practices

### Database & Auth

- [ ] Vercel Postgres database created
- [ ] Prisma ORM initialized
- [ ] User model and auth tables created
- [ ] First migration run successfully
- [ ] NextAuth.js configured with credentials provider
- [ ] Signup and login flows working
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

**Last Updated**: 2026-01-26
**Next Phase**: Phase 2 - Core Features (Exercise Library, Workout Builder, Live Sessions)
