'use server'

import { signIn } from '@/lib/auth/auth.config'
import { hashPassword } from '@/lib/auth/auth'
import { sendWelcomeEmail } from '@/lib/email/welcome'
import { prisma } from '@/lib/db/prisma'
import {
  signupSchema,
  loginSchema,
  type SignupInput,
  type LoginInput,
} from '@/lib/validations/auth'
import { AuthError } from 'next-auth'

/**
 * Server action to create a new user account
 * When inviteCode is provided, creates user as CLIENT and activates the PT relationship
 */
export async function signup(data: SignupInput) {
  try {
    // Validate input
    const validatedData = signupSchema.parse(data)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      return {
        success: false,
        error: 'An account with this email already exists',
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password)

    let user

    if (validatedData.inviteCode) {
      // Invite-based signup: validate invite and create user as CLIENT
      const invitation = await prisma.clientRelationship.findUnique({
        where: { inviteCode: validatedData.inviteCode },
      })

      if (!invitation) {
        return { success: false, error: 'Invitation not found' }
      }

      if (invitation.status !== 'PENDING') {
        return { success: false, error: 'This invitation is no longer valid' }
      }

      if (invitation.expiresAt && new Date() > invitation.expiresAt) {
        return { success: false, error: 'This invitation has expired' }
      }

      // Email enforcement: if PT specified a client email, it must match
      if (
        invitation.clientEmail &&
        invitation.clientEmail.toLowerCase() !== validatedData.email.toLowerCase()
      ) {
        return {
          success: false,
          error: 'This invitation is for a different email address',
        }
      }

      // Transaction: create user as CLIENT + activate relationship
      user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: validatedData.email,
            name: validatedData.name,
            password: hashedPassword,
            role: 'CLIENT',
          },
        })

        await tx.clientRelationship.update({
          where: { id: invitation.id },
          data: {
            clientId: newUser.id,
            status: 'ACTIVE',
          },
        })

        return newUser
      })
    } else {
      // Standard signup: create as PERSONAL
      user = await prisma.user.create({
        data: {
          email: validatedData.email,
          name: validatedData.name,
          password: hashedPassword,
          role: 'PERSONAL',
        },
      })
    }

    // Send a best-effort welcome email (covers both standard and invited signups).
    await sendWelcomeEmail({ email: validatedData.email, name: validatedData.name })

    // Auto-login after signup
    try {
      await signIn('credentials', {
        email: validatedData.email,
        password: validatedData.password,
        redirect: false,
      })

      return {
        success: true,
        message: 'Account created successfully',
        userId: user.id,
      }
    } catch {
      // User created but auto-login failed - still consider it a success
      return {
        success: true,
        message: 'Account created successfully. Please log in.',
        userId: user.id,
      }
    }
  } catch (error) {
    console.error('Signup error:', error)

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    }
  }
}

/**
 * Server action to authenticate a user
 */
export async function login(data: LoginInput) {
  try {
    // Validate input
    const validatedData = loginSchema.parse(data)

    // Attempt to sign in
    await signIn('credentials', {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    })

    return {
      success: true,
      message: 'Logged in successfully',
    }
  } catch (error) {
    console.error('Login error:', error)

    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return {
            success: false,
            error: 'Invalid email or password',
          }
        case 'CallbackRouteError':
          return {
            success: false,
            error: 'Invalid email or password',
          }
        default:
          return {
            success: false,
            error: 'An error occurred during login. Please try again.',
          }
      }
    }

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    }
  }
}
