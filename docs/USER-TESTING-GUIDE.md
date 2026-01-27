# B-Fit User Testing Guide - Protected Routes & Authentication

**Last Updated**: 2026-01-27
**Testing Task 2.5**: Protected Route Middleware & Authentication Flow

This guide provides step-by-step testing scenarios to verify that authentication and route protection are working correctly.

---

## Prerequisites

Before you begin testing, ensure:

1. ✅ Dev server is running: `npm run dev`
2. ✅ Database connection is working
3. ✅ You have access to: http://localhost:3000

---

## Test Scenario 1: Unauthenticated Access (Middleware Protection)

**Purpose**: Verify that middleware blocks access to protected routes and redirects to login.

### Steps:

1. **Open your browser in Incognito/Private mode** (to ensure no existing session)
   - Chrome: `Ctrl + Shift + N` (Windows) or `Cmd + Shift + N` (Mac)
   - Firefox: `Ctrl + Shift + P` (Windows) or `Cmd + Shift + P` (Mac)

2. **Navigate to the home page**

   ```
   http://localhost:3000
   ```

   - ✅ **Expected**: Home page loads successfully

3. **Try to access the dashboard directly**

   ```
   http://localhost:3000/dashboard
   ```

   - ✅ **Expected**: You are immediately redirected to:
     ```
     http://localhost:3000/login?callbackUrl=%2Fdashboard
     ```
   - ✅ **Expected**: Login page displays with the form

4. **Try to access the protected test page**

   ```
   http://localhost:3000/dashboard/test-protected
   ```

   - ✅ **Expected**: You are immediately redirected to:
     ```
     http://localhost:3000/login?callbackUrl=%2Fdashboard%2Ftest-protected
     ```
   - ✅ **Expected**: Notice the callback URL in the address bar

5. **Check the URL carefully**
   - ✅ **Expected**: The `callbackUrl` parameter contains the encoded path you tried to access
   - This is important for post-login redirect

### What This Tests:

- Middleware runs on protected routes
- Unauthenticated users cannot access protected pages
- Original URL is preserved for redirect after login

---

## Test Scenario 2: User Signup Flow

**Purpose**: Test account creation, password validation, and auto-login.

### Steps:

1. **Navigate to the signup page**

   ```
   http://localhost:3000/signup
   ```

   - ✅ **Expected**: Signup form displays with email, name, and password fields

2. **Try to submit with empty fields**
   - Click "Create Account" button without filling anything
   - ✅ **Expected**: Validation errors appear below each field:
     - "Please enter a valid email address"
     - "Name must be at least 2 characters"
     - Password error message

3. **Test email validation**
   - Enter an invalid email: `notanemail`
   - Try to submit
   - ✅ **Expected**: Error message: "Please enter a valid email address"

4. **Test password validation**
   - Enter email: `test@example.com`
   - Enter name: `Test User`
   - Try different passwords:
     - `short` → ✅ **Expected**: Error about minimum 8 characters
     - `alllowercase123` → ✅ **Expected**: Error about uppercase letter required
     - `ALLUPPERCASE123` → ✅ **Expected**: Error about lowercase letter required
     - `NoNumbers` → ✅ **Expected**: Error about number required

5. **Create a valid account**
   - Email: `yourname@example.com` (use your own test email)
   - Name: `Your Name`
   - Password: `Test1234!` (meets all requirements)
   - Click "Create Account"
   - ✅ **Expected**: Button shows "Creating account..." with spinner
   - ✅ **Expected**: Green toast notification: "Account created successfully!"
   - ✅ **Expected**: You are automatically redirected to:
     ```
     http://localhost:3000/dashboard
     ```
   - ✅ **Expected**: Dashboard page loads showing your workout stats

6. **Check the navbar**
   - Look at the top-right corner of the dashboard
   - ✅ **Expected**: You see a user avatar (with your initials)
   - Click on the avatar
   - ✅ **Expected**: Dropdown menu shows:
     - Your name: "Your Name"
     - Your email: "yourname@example.com"
     - Your role: "PERSONAL"
     - Profile, Settings, and Log out options

### What This Tests:

- Signup form validation works correctly
- Password strength requirements are enforced
- Account is created in the database
- User is auto-logged in after signup
- Session data is available in the navbar
- Redirect to dashboard after successful signup

---

## Test Scenario 3: Duplicate Email Prevention

**Purpose**: Verify that duplicate email addresses are rejected.

### Steps:

1. **Open the signup page again**

   ```
   http://localhost:3000/signup
   ```

2. **Try to sign up with the same email**
   - Email: `yourname@example.com` (the one you just used)
   - Name: `Another Name`
   - Password: `Test1234!`
   - Click "Create Account"
   - ✅ **Expected**: Red toast notification: "Email already in use"
   - ✅ **Expected**: You remain on the signup page (no redirect)
   - ✅ **Expected**: No new account is created

### What This Tests:

- Duplicate email detection works
- Appropriate error message is displayed
- Database integrity is maintained

---

## Test Scenario 4: Login Flow with Callback URL

**Purpose**: Test login functionality and post-login redirect to original page.

### Steps:

1. **Log out from your current session**
   - Click the user avatar in the top-right
   - Click "Log out"
   - ✅ **Expected**: Toast notification: "Logged out successfully"
   - ✅ **Expected**: You are redirected to:
     ```
     http://localhost:3000/login
     ```

2. **Try to access the protected test page directly**

   ```
   http://localhost:3000/dashboard/test-protected
   ```

   - ✅ **Expected**: Redirected to:
     ```
     http://localhost:3000/login?callbackUrl=%2Fdashboard%2Ftest-protected
     ```

3. **Test invalid login credentials**
   - Email: `wrong@example.com`
   - Password: `WrongPass123`
   - Click "Sign In"
   - ✅ **Expected**: Red toast notification: "Invalid email or password"
   - ✅ **Expected**: You remain on the login page

4. **Log in with correct credentials**
   - Email: `yourname@example.com` (your account)
   - Password: `Test1234!` (your password)
   - Click "Sign In"
   - ✅ **Expected**: Button shows "Signing in..." with spinner
   - ✅ **Expected**: Green toast notification: "Logged in successfully!"
   - ✅ **Expected**: You are redirected to the original page you tried to access:
     ```
     http://localhost:3000/dashboard/test-protected
     ```
   - ✅ **Expected**: Test protected page displays with your session information

5. **Check the session information displayed**
   - ✅ **Expected**: Page shows:
     - "✓ Middleware protection working - you are authenticated!"
     - User ID (a long string starting with 'c')
     - Your email
     - Your name
     - Your role: PERSONAL
     - Session expiry timestamp

### What This Tests:

- Login form validation
- Invalid credentials are rejected
- Correct credentials allow login
- Callback URL functionality works
- User is redirected to the originally requested page
- Session data is available on protected pages

---

## Test Scenario 5: Authenticated User Redirects

**Purpose**: Verify that logged-in users cannot access login/signup pages.

### Steps:

1. **Ensure you are logged in**
   - Check that you see your avatar in the top-right navbar
   - If not logged in, complete Test Scenario 4 first

2. **Try to access the login page**

   ```
   http://localhost:3000/login
   ```

   - ✅ **Expected**: You are immediately redirected to:
     ```
     http://localhost:3000/dashboard
     ```
   - ✅ **Expected**: Dashboard page loads

3. **Try to access the signup page**

   ```
   http://localhost:3000/signup
   ```

   - ✅ **Expected**: You are immediately redirected to:
     ```
     http://localhost:3000/dashboard
     ```
   - ✅ **Expected**: Dashboard page loads

4. **Verify you can access protected pages**

   ```
   http://localhost:3000/dashboard
   ```

   - ✅ **Expected**: Dashboard loads without redirect

   ```
   http://localhost:3000/dashboard/test-protected
   ```

   - ✅ **Expected**: Test page loads showing your session

### What This Tests:

- Middleware prevents logged-in users from accessing auth pages
- Logged-in users are redirected to dashboard
- Logged-in users can freely access protected routes

---

## Test Scenario 6: Session Persistence Across Page Refreshes

**Purpose**: Verify that sessions persist and don't require re-login.

### Steps:

1. **Ensure you are logged in and on a protected page**

   ```
   http://localhost:3000/dashboard/test-protected
   ```

2. **Refresh the page**
   - Press `F5` or `Ctrl+R` (Windows) or `Cmd+R` (Mac)
   - ✅ **Expected**: Page refreshes and loads without redirect
   - ✅ **Expected**: Session information is still displayed
   - ✅ **Expected**: No "loading" or "authenticating" messages

3. **Close the browser tab and open a new one**
   - Close the current tab
   - Open a new tab
   - Navigate to:
     ```
     http://localhost:3000/dashboard
     ```
   - ✅ **Expected**: Dashboard loads immediately
   - ✅ **Expected**: You are still logged in (avatar shows in navbar)
   - ✅ **Expected**: No login required

4. **Check session data in navbar**
   - Click the user avatar
   - ✅ **Expected**: Your name, email, and role are still displayed correctly

### What This Tests:

- JWT tokens persist in cookies
- Sessions survive page refreshes
- Sessions survive new tabs/windows
- No unnecessary re-authentication

---

## Test Scenario 7: Logout and Session Cleanup

**Purpose**: Verify that logout clears session and blocks protected access.

### Steps:

1. **Ensure you are logged in**
   - Navigate to:
     ```
     http://localhost:3000/dashboard
     ```
   - ✅ **Expected**: Dashboard loads

2. **Click the user avatar in top-right**
   - ✅ **Expected**: Dropdown menu appears

3. **Click "Log out"**
   - ✅ **Expected**: Button/menu item is clickable
   - ✅ **Expected**: Green toast notification: "Logged out successfully"
   - ✅ **Expected**: You are redirected to:
     ```
     http://localhost:3000/login
     ```

4. **Verify session is cleared**
   - Look at the navbar
   - ✅ **Expected**: No user avatar visible (or generic avatar)

5. **Try to access a protected page**

   ```
   http://localhost:3000/dashboard
   ```

   - ✅ **Expected**: Immediately redirected to:
     ```
     http://localhost:3000/login?callbackUrl=%2Fdashboard
     ```
   - ✅ **Expected**: Cannot access protected pages

6. **Try using browser back button**
   - Click the browser back button
   - ✅ **Expected**: Still redirected to login
   - ✅ **Expected**: Cannot access protected pages via back button

### What This Tests:

- Logout functionality works correctly
- Session is properly cleared
- Protected pages become inaccessible after logout
- Back button doesn't bypass authentication

---

## Test Scenario 8: Navigation Within Protected Area

**Purpose**: Verify that logged-in users can navigate freely within protected routes.

### Steps:

1. **Log in if not already logged in**
   - Use credentials: `yourname@example.com` / `Test1234!`

2. **Navigate between protected pages**
   - Start at:
     ```
     http://localhost:3000/dashboard
     ```
   - ✅ **Expected**: Dashboard loads

3. **Click "View Dashboard" button (if on home page) or navigate to test page**

   ```
   http://localhost:3000/dashboard/test-protected
   ```

   - ✅ **Expected**: Test page loads without redirect
   - ✅ **Expected**: No login prompt
   - ✅ **Expected**: Session data displayed

4. **Use browser navigation**
   - Click the browser back button
   - ✅ **Expected**: Navigate back to previous protected page
   - ✅ **Expected**: No login prompt
   - Click the browser forward button
   - ✅ **Expected**: Navigate forward
   - ✅ **Expected**: No login prompt

5. **Click the logo to go home**
   - Click "B-Fit" logo in navbar
   - ✅ **Expected**: Navigate to home page
   - ✅ **Expected**: Still logged in (avatar visible in navbar)

### What This Tests:

- Navigation between protected pages works seamlessly
- Session persists during navigation
- Browser history navigation works correctly
- Users remain logged in across different pages

---

## Quick Checklist - Run All Tests

Use this checklist to quickly verify all functionality:

- [ ] **Test 1**: Unauthenticated access blocked → redirects to login
- [ ] **Test 2**: Signup creates account and auto-logs in
- [ ] **Test 3**: Duplicate email is rejected
- [ ] **Test 4**: Login works and redirects to callback URL
- [ ] **Test 5**: Logged-in users redirected from auth pages
- [ ] **Test 6**: Session persists across page refreshes
- [ ] **Test 7**: Logout clears session and blocks access
- [ ] **Test 8**: Navigation within protected area works

---

## Common Issues & Troubleshooting

### Issue: "Cannot connect to database"

**Solution**:

- Check that `.env.local` has correct `DATABASE_URL`
- Verify Vercel Postgres is running
- Run: `npm run dev` and check for database connection errors

### Issue: "Middleware not running"

**Solution**:

- Restart dev server: Stop with `Ctrl+C`, then `npm run dev`
- Clear browser cache and cookies
- Check `src/middleware.ts` exists

### Issue: "Session not persisting"

**Solution**:

- Check that `NEXTAUTH_SECRET` is set in `.env.local`
- Verify `SessionProvider` is in root layout
- Clear browser cookies and try again

### Issue: "Redirects not working"

**Solution**:

- Clear browser cache
- Use incognito mode for fresh test
- Check browser console for errors (F12)

### Issue: "Toast notifications not showing"

**Solution**:

- Verify `<Toaster />` is in root layout
- Check that `sonner` package is installed
- Look for JavaScript errors in console

---

## Test Results Template

Use this template to record your test results:

```
Date: _______________
Tester: _______________

Test Scenario 1 - Unauthenticated Access: [ ] PASS  [ ] FAIL
Notes: _______________________________________________

Test Scenario 2 - User Signup: [ ] PASS  [ ] FAIL
Notes: _______________________________________________

Test Scenario 3 - Duplicate Email: [ ] PASS  [ ] FAIL
Notes: _______________________________________________

Test Scenario 4 - Login with Callback: [ ] PASS  [ ] FAIL
Notes: _______________________________________________

Test Scenario 5 - Authenticated Redirects: [ ] PASS  [ ] FAIL
Notes: _______________________________________________

Test Scenario 6 - Session Persistence: [ ] PASS  [ ] FAIL
Notes: _______________________________________________

Test Scenario 7 - Logout & Cleanup: [ ] PASS  [ ] FAIL
Notes: _______________________________________________

Test Scenario 8 - Protected Navigation: [ ] PASS  [ ] FAIL
Notes: _______________________________________________

Overall Result: [ ] ALL PASS  [ ] SOME FAILURES

Issues Found:
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________
```

---

## Next Steps After Testing

Once all tests pass:

1. ✅ Mark Task 2.5 as complete in Phase 1 documentation
2. ✅ Commit changes to Git with message: "feat: implement protected route middleware (Task 2.5)"
3. ✅ Proceed to Task 2.6: Deploy to Vercel Development
4. ✅ Test the same scenarios on the deployed app

---

**Happy Testing! 🧪**

If you encounter any issues not covered in this guide, check:

- Browser console (F12) for JavaScript errors
- Terminal output for server errors
- `src/lib/auth/test-protected-routes.md` for additional technical details
