'use server'

import { signIn } from '@/lib/auth/auth.config'
import { hashPassword } from '@/lib/auth/auth'
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

    // Create user
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        name: validatedData.name,
        password: hashedPassword,
        role: 'PERSONAL', // Default role
      },
    })

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
