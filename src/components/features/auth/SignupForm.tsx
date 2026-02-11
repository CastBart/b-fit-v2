'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { signupSchema, type SignupInput } from '@/lib/validations/auth'
import { signup } from '@/server/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)

  // Get invite-related params
  const inviteCode = searchParams.get('inviteCode') || undefined
  const prefillEmail = searchParams.get('email') || ''
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  const hasInviteEmail = !!inviteCode && !!prefillEmail

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: prefillEmail,
      name: '',
      password: '',
      inviteCode,
    },
  })

  async function onSubmit(data: SignupInput) {
    setIsLoading(true)

    try {
      const result = await signup(data)

      if (result.success) {
        toast.success(result.message || 'Account created successfully!')
        // For invite signups, always go to dashboard (relationship already activated)
        router.push(inviteCode ? '/dashboard' : callbackUrl)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to create account')
      }
    } catch (error) {
      console.error('Signup error:', error)
      toast.error('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  {...field}
                  disabled={isLoading || hasInviteEmail}
                  readOnly={hasInviteEmail}
                />
              </FormControl>
              {hasInviteEmail && (
                <FormDescription>This invite is for this email address</FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? 'Creating account...' : 'Create account'}
        </Button>
      </form>
    </Form>
  )
}
