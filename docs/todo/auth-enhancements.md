# Authentication Enhancements - TODO

**Created**: 2026-01-27
**Status**: Planned for Future Implementation
**Priority**: Medium
**Estimated Effort**: 6-8 hours total

This document outlines planned enhancements to the B-Fit authentication system, including forgot password functionality and Google OAuth integration.

---

## Table of Contents

1. [Forgot Password Feature](#forgot-password-feature)
2. [Google OAuth Authentication](#google-oauth-authentication)
3. [Implementation Order](#implementation-order)
4. [Testing Requirements](#testing-requirements)

---

## Forgot Password Feature

### Overview

Allow users to reset their password via email when they forget it. This feature will use email verification tokens and provide a secure password reset flow.

### User Flow

1. User clicks "Forgot Password?" link on login page
2. User enters their email address
3. System sends password reset email with token
4. User clicks link in email (valid for 1 hour)
5. User enters new password (must meet strength requirements)
6. Password is updated, user is redirected to login
7. User logs in with new password

### Technical Requirements

#### 1. Email Service Setup

**Options:**

- **Resend** (Recommended for B-Fit)
  - Simple API, good DX
  - Free tier: 3,000 emails/month
  - Good Next.js integration
  - https://resend.com

- **SendGrid** (Alternative)
  - Free tier: 100 emails/day
  - More established
  - https://sendgrid.com

- **Amazon SES** (Alternative)
  - Very cheap: $0.10 per 1,000 emails
  - Requires AWS account
  - More setup complexity

**Recommended**: Start with Resend for simplicity.

#### 2. Database Changes

**Add to Prisma Schema:**

```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  email     String
  token     String   @unique
  expires   DateTime
  createdAt DateTime @default(now())

  @@unique([email, token])
  @@index([token])
  @@index([email])
}
```

**Migration Command:**

```bash
npx prisma migrate dev --name add_password_reset_tokens
```

#### 3. Environment Variables

Add to `.env.local`:

```env
# Email Service (Resend)
RESEND_API_KEY="re_xxxxxxxxxxxxx"
FROM_EMAIL="noreply@b-fit.app"
APP_URL="http://localhost:3000"  # Change to production URL in prod
```

#### 4. Server Actions

**Create: `src/server/actions/password-reset.ts`**

```typescript
'use server'

import { prisma } from '@/lib/db/prisma'
import { hashPassword } from '@/lib/auth/auth'
import { randomBytes } from 'crypto'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Generate password reset token
export async function requestPasswordReset(email: string) {
  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    })

    // Always return success to prevent email enumeration
    if (!user) {
      return {
        success: true,
        message: 'If an account exists, you will receive a password reset email',
      }
    }

    // Delete any existing tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { email },
    })

    // Generate secure token
    const token = randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 3600000) // 1 hour

    // Save token to database
    await prisma.passwordResetToken.create({
      data: {
        email,
        token,
        expires,
      },
    })

    // Send email
    const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}`

    await resend.emails.send({
      from: process.env.FROM_EMAIL!,
      to: email,
      subject: 'Reset Your B-Fit Password',
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested to reset your password. Click the link below to proceed:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    })

    return {
      success: true,
      message: 'If an account exists, you will receive a password reset email',
    }
  } catch (error) {
    console.error('Password reset request error:', error)
    return {
      success: false,
      error: 'Failed to process password reset request',
    }
  }
}

// Verify token and reset password
export async function resetPassword(token: string, newPassword: string) {
  try {
    // Find valid token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    })

    if (!resetToken || resetToken.expires < new Date()) {
      return {
        success: false,
        error: 'Invalid or expired reset token',
      }
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword)

    // Update user password
    await prisma.user.update({
      where: { email: resetToken.email },
      data: { password: hashedPassword },
    })

    // Delete used token
    await prisma.passwordResetToken.delete({
      where: { token },
    })

    return {
      success: true,
      message: 'Password reset successfully',
    }
  } catch (error) {
    console.error('Password reset error:', error)
    return {
      success: false,
      error: 'Failed to reset password',
    }
  }
}
```

#### 5. New Pages & Components

**Pages to Create:**

1. **`src/app/(auth)/forgot-password/page.tsx`**
   - Form to request password reset
   - Email input field
   - Submit button
   - Link back to login

2. **`src/app/(auth)/reset-password/page.tsx`**
   - Form to reset password with token
   - New password input (with strength requirements)
   - Confirm password input
   - Submit button
   - Token verification on page load

**Components to Create:**

1. **`src/components/features/auth/ForgotPasswordForm.tsx`**
   - Email input with validation
   - Submit handler calling `requestPasswordReset`
   - Success/error toast notifications

2. **`src/components/features/auth/ResetPasswordForm.tsx`**
   - Password inputs with validation
   - Token verification
   - Submit handler calling `resetPassword`
   - Redirect to login on success

#### 6. UI Updates

**Update Login Page:**

Add "Forgot Password?" link below the login form:

```tsx
// src/app/(auth)/login/page.tsx
<div className="text-sm text-center">
  <Link href="/forgot-password" className="text-primary hover:underline">
    Forgot your password?
  </Link>
</div>
```

#### 7. Validation Schema

**Create: `src/lib/validations/password-reset.ts`**

```typescript
import { z } from 'zod'

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain uppercase, lowercase, and number'
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
```

### Security Considerations

1. **Token Expiry**: Tokens expire after 1 hour
2. **One-Time Use**: Tokens are deleted after use
3. **Rate Limiting**: Consider adding rate limiting to prevent abuse
4. **Email Enumeration Prevention**: Always return success message regardless of email existence
5. **Secure Tokens**: Use cryptographically secure random tokens
6. **HTTPS Only**: Password reset links must use HTTPS in production

### Testing Checklist

- [ ] User can request password reset with valid email
- [ ] User receives email with reset link
- [ ] Reset link contains valid token
- [ ] Token expires after 1 hour
- [ ] User can set new password meeting requirements
- [ ] Old password no longer works after reset
- [ ] New password works for login
- [ ] Token is deleted after successful reset
- [ ] Invalid token shows error message
- [ ] Expired token shows error message
- [ ] Used token cannot be reused

---

## Google OAuth Authentication

### Overview

Allow users to sign up and log in using their Google account. This provides a faster, more convenient authentication method and eliminates the need for users to remember another password.

### User Flow

**Signup/Login with Google:**

1. User clicks "Continue with Google" button
2. Redirected to Google consent screen
3. User authorizes B-Fit to access basic profile info
4. Redirected back to B-Fit
5. If new user: Account created automatically
6. If existing user: Logged in directly
7. Redirected to dashboard or callback URL

### Technical Requirements

#### 1. Google Cloud Console Setup

**Steps:**

1. Go to https://console.cloud.google.com
2. Create new project or select existing one
3. Enable Google+ API
4. Go to "Credentials" section
5. Create OAuth 2.0 Client ID
6. Configure OAuth consent screen:
   - App name: B-Fit
   - User support email: Your email
   - Authorized domains: b-fit.app (and localhost for dev)
   - Scopes: email, profile, openid
7. Create credentials:
   - Application type: Web application
   - Authorized JavaScript origins:
     - http://localhost:3000 (development)
     - https://b-fit.app (production)
   - Authorized redirect URIs:
     - http://localhost:3000/api/auth/callback/google (development)
     - https://b-fit.app/api/auth/callback/google (production)
8. Copy Client ID and Client Secret

#### 2. Environment Variables

Add to `.env.local`:

```env
# Google OAuth
GOOGLE_CLIENT_ID="xxxxxxxxxxxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxxxxxxxxxx"
```

Add to `.env.example`:

```env
# Google OAuth (optional - for social login)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

#### 3. NextAuth Configuration

**Update: `src/lib/auth/auth.config.ts`**

```typescript
import GoogleProvider from 'next-auth/providers/google'

export const authConfig = {
  // ... existing config ...
  providers: [
    // Existing credentials provider
    CredentialsProvider({
      // ... existing credentials config ...
    }),

    // Add Google provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // For Google OAuth
      if (account?.provider === 'google') {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
        })

        // If user exists with email but no Google account linked
        if (existingUser && !existingUser.image) {
          // Link Google account to existing user
          // This allows users who signed up with email to later use Google
          return true
        }

        // Create new user or link existing Google account
        return true
      }

      return true
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.role = user.role as UserRole
      }

      // Store OAuth provider info in token
      if (account?.provider) {
        token.provider = account.provider
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
      }
      return session
    },
  },
}
```

#### 4. Database Schema Update

The existing NextAuth tables (Account, Session) already support OAuth providers. No schema changes needed, but verify the Account model has all required fields:

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
```

#### 5. UI Components

**Update Login Page:**

Add Google button to `src/app/(auth)/login/page.tsx`:

```tsx
import { signIn } from 'next-auth/react'

// Add this button above or below the LoginForm
<div className="relative">
  <div className="absolute inset-0 flex items-center">
    <span className="w-full border-t" />
  </div>
  <div className="relative flex justify-center text-xs uppercase">
    <span className="bg-background px-2 text-muted-foreground">
      Or continue with
    </span>
  </div>
</div>

<Button
  variant="outline"
  type="button"
  className="w-full"
  onClick={() => signIn('google', { callbackUrl: callbackUrl })}
>
  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
    {/* Google icon SVG */}
  </svg>
  Continue with Google
</Button>
```

**Update Signup Page:**

Add same Google button to `src/app/(auth)/signup/page.tsx`.

**Create Google Button Component:**

`src/components/features/auth/GoogleSignInButton.tsx`:

```tsx
'use client'

import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { useSearchParams } from 'next/navigation'

export function GoogleSignInButton() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  return (
    <Button
      variant="outline"
      type="button"
      className="w-full"
      onClick={() => signIn('google', { callbackUrl })}
    >
      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
      Continue with Google
    </Button>
  )
}
```

#### 6. Handle Account Linking

**Scenario**: User signs up with email/password, later tries to sign in with Google using the same email.

**Options:**

1. **Auto-link accounts** (Recommended)
   - If email matches, automatically link Google account to existing user
   - User can then use either method to login

2. **Show error and prompt to login with original method**
   - More secure but less convenient
   - User must use original signup method

**Implement auto-linking in signIn callback (shown above).**

### Security Considerations

1. **Email Verification**: Google-authenticated users have verified emails
2. **Account Linking**: Carefully handle linking Google accounts to existing email accounts
3. **Token Storage**: OAuth tokens are stored securely in database
4. **Scope Minimization**: Only request necessary permissions (email, profile)
5. **HTTPS Required**: OAuth callbacks must use HTTPS in production
6. **CSRF Protection**: NextAuth handles this automatically

### User Experience Improvements

1. **Fast Signup**: No password required, instant account creation
2. **No Password Management**: Users don't need to remember another password
3. **Trust Factor**: Users trust Google authentication
4. **Profile Picture**: Auto-populate user avatar from Google profile

### Testing Checklist

- [ ] Google sign-in button appears on login page
- [ ] Google sign-in button appears on signup page
- [ ] Clicking button redirects to Google consent screen
- [ ] User can authorize B-Fit to access profile
- [ ] New user: Account created with Google info
- [ ] Existing user: Logged in successfully
- [ ] Profile picture imported from Google (optional)
- [ ] Email from Google matches user email
- [ ] Callback URL works correctly
- [ ] User can access protected routes after Google login
- [ ] Account linking works for existing email accounts
- [ ] User can log out and log back in with Google
- [ ] Session persists after Google login

---

## Implementation Order

**Recommended sequence:**

### Phase 1: Google OAuth (Estimated: 3-4 hours)

Implement first because:

- Faster user onboarding
- Better user experience
- Less complex than email-based password reset
- No email service dependency

**Steps:**

1. Set up Google Cloud Console project
2. Add Google provider to NextAuth config
3. Create GoogleSignInButton component
4. Update login and signup pages
5. Test OAuth flow
6. Handle account linking

### Phase 2: Forgot Password (Estimated: 3-4 hours)

Implement second because:

- Depends on email service setup
- More steps involved (email, tokens, forms)
- Complements Google OAuth (users who sign up with email need this)

**Steps:**

1. Choose and set up email service (Resend)
2. Add PasswordResetToken model to Prisma
3. Create password reset server actions
4. Create forgot-password and reset-password pages
5. Create form components
6. Send test emails
7. Test complete flow

---

## Dependencies to Install

### For Google OAuth:

```bash
# NextAuth already installed, just need to add provider config
# No additional packages needed
```

### For Forgot Password:

```bash
# Email service (Resend - recommended)
npm install resend

# OR SendGrid (alternative)
npm install @sendgrid/mail

# Crypto is built into Node.js (no install needed)
```

---

## Environment Variables Summary

**Add to `.env.local`:**

```env
# Google OAuth
GOOGLE_CLIENT_ID="xxxxxxxxxxxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxxxxxxxxxx"

# Email Service (Resend)
RESEND_API_KEY="re_xxxxxxxxxxxxx"
FROM_EMAIL="noreply@b-fit.app"
APP_URL="http://localhost:3000"
```

**Add to `.env.example`:**

```env
# Google OAuth (optional - for social login)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Email Service (optional - for password reset)
RESEND_API_KEY=""
FROM_EMAIL="noreply@b-fit.app"
APP_URL="http://localhost:3000"
```

---

## Future Enhancements (Post-MVP)

### Additional OAuth Providers

- **GitHub OAuth**: Good for developer audience
- **Apple Sign-In**: Required for iOS app (future)
- **Microsoft/Azure AD**: Good for enterprise customers (Org role)
- **Facebook OAuth**: Wide user base (optional)

### Two-Factor Authentication (2FA)

- **TOTP (Time-based OTP)**: Using apps like Google Authenticator
- **SMS OTP**: Phone number verification
- **Email OTP**: Fallback option
- **Backup Codes**: For account recovery

### Email Verification

- **Verify Email on Signup**: Send verification email after registration
- **Unverified User Limitations**: Restrict features until email verified
- **Resend Verification Email**: Allow users to request new verification email

### Account Security Features

- **Login History**: Show recent login attempts
- **Active Sessions**: View and revoke active sessions
- **Security Notifications**: Email on password change, new device login
- **Account Deletion**: Allow users to delete their account

---

## Notes

- Google OAuth should be implemented before forgot password (better UX, simpler)
- Email service (Resend) needed for both password reset and future email verification
- Consider implementing email verification in same phase as forgot password
- All OAuth callbacks must use HTTPS in production
- Test thoroughly on both localhost and production domains
- Consider rate limiting for password reset to prevent abuse

---

## Related Documentation

- [Phase 1 Foundation](../phase-breakdowns/phase-1-foundation.md) - Current authentication setup
- [User Testing Guide](../USER-TESTING-GUIDE.md) - Testing authentication flows
- [NextAuth.js Documentation](https://next-auth.js.org/) - NextAuth v5 reference
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2) - Google OAuth setup
- [Resend Documentation](https://resend.com/docs) - Email service API

---

**Last Updated**: 2026-01-27
**Estimated Total Effort**: 6-8 hours
**Priority**: Medium (Post-Phase 1)
**Status**: Ready for Implementation
