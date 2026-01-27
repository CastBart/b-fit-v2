# Protected Routes Testing Guide

This guide explains how to test the protected routes middleware implementation (Task 2.5).

## What Was Implemented

### 1. Middleware (`src/middleware.ts`)

- Protects routes: `/dashboard`, `/workouts`, `/exercises`, `/sessions`, `/plans`
- Redirects unauthenticated users to `/login` with callback URL
- Redirects authenticated users away from `/login` and `/signup` to `/dashboard`
- Uses NextAuth v5's `auth` function for session checking

### 2. Auth Guard HOC (`src/lib/auth/withAuth.tsx`)

- Client-side protection layer (fallback)
- Shows loading skeleton while checking auth status
- Redirects to login if not authenticated
- Can be used to wrap any page component

### 3. SessionProvider (`src/components/providers/SessionProvider.tsx`)

- Wraps the app in NextAuth's SessionProvider
- Enables `useSession` hook throughout the app
- Added to root layout

## Testing Steps

### Test 1: Unauthenticated Access to Protected Routes

**Expected**: Redirect to login with callback URL

1. Open browser in incognito/private mode
2. Navigate to: `http://localhost:3000/dashboard`
3. **Expected Result**: Redirected to `/login?callbackUrl=%2Fdashboard`
4. Try other protected routes:
   - `/dashboard/test-protected`
   - `/workouts` (when created)
   - `/exercises` (when created)
5. **Expected**: All redirect to login

### Test 2: Signup and Auto-Redirect

**Expected**: After signup, redirect to dashboard

1. Go to: `http://localhost:3000/signup`
2. Create a new account:
   - Email: `test@example.com`
   - Name: `Test User`
   - Password: `Test1234!`
3. Submit the form
4. **Expected Result**: Auto-login and redirect to `/dashboard`

### Test 3: Login with Callback URL

**Expected**: After login, redirect back to original page

1. Log out (if logged in)
2. Try to access: `http://localhost:3000/dashboard/test-protected`
3. **Expected**: Redirected to `/login?callbackUrl=%2Fdashboard%2Ftest-protected`
4. Log in with credentials
5. **Expected Result**: Redirected back to `/dashboard/test-protected`
6. Page should show session information

### Test 4: Authenticated Access to Auth Pages

**Expected**: Redirect to dashboard

1. Log in to your account
2. Try to access: `http://localhost:3000/login`
3. **Expected Result**: Immediately redirected to `/dashboard`
4. Try to access: `http://localhost:3000/signup`
5. **Expected Result**: Immediately redirected to `/dashboard`

### Test 5: Session Persistence

**Expected**: Session persists across page refreshes

1. Log in to your account
2. Navigate to: `http://localhost:3000/dashboard/test-protected`
3. Refresh the page (F5)
4. **Expected Result**: Page loads without redirect, session data displayed

### Test 6: Logout and Protection

**Expected**: After logout, cannot access protected routes

1. While logged in, open DevTools Console
2. Run: `signOut()` (from next-auth/react)
3. Or implement a logout button in the UI
4. Try to access: `http://localhost:3000/dashboard`
5. **Expected Result**: Redirected to `/login`

## Test Pages

### Protected Test Page

- URL: `http://localhost:3000/dashboard/test-protected`
- Purpose: Displays session information to verify authentication
- Shows: User ID, email, name, role, session expiry

### Dashboard Page

- URL: `http://localhost:3000/dashboard`
- Purpose: Main dashboard with workout stats
- Protected by middleware

## Manual Testing Checklist

- [ ] Unauthenticated users cannot access `/dashboard`
- [ ] Unauthenticated users cannot access `/dashboard/test-protected`
- [ ] Redirect includes correct callback URL
- [ ] After login, redirected to callback URL (or dashboard if no callback)
- [ ] Authenticated users redirected away from `/login` and `/signup`
- [ ] Session persists across page refreshes
- [ ] Test page displays correct user information
- [ ] Middleware shows in build output as "Proxy (Middleware)"

## Common Issues & Solutions

### Issue: Middleware not running

**Solution**: Check `next.config.ts` - ensure no conflicting middleware config

### Issue: Session not available in withAuth HOC

**Solution**: Ensure SessionProvider wraps the app in root layout

### Issue: Infinite redirect loop

**Solution**: Check that login page is NOT in the protected routes matcher

### Issue: Types error with PrismaAdapter

**Solution**: Use `as any` type assertion for adapter (NextAuth v5 beta compatibility)

## Implementation Details

### Middleware Flow

```
1. User requests protected route (e.g., /dashboard)
2. Middleware checks session with auth()
3. If no session → redirect to /login?callbackUrl=/dashboard
4. If session exists → allow access
```

### Auth Routes Flow

```
1. Logged-in user tries to access /login
2. Middleware checks session with auth()
3. If session exists → redirect to /dashboard
4. If no session → allow access to /login
```

## Next Steps

After verifying these tests pass:

1. Update Phase 1 document to mark Task 2.5 as complete
2. Add logout functionality to dashboard
3. Proceed to Task 2.6: Deploy to Vercel Development
