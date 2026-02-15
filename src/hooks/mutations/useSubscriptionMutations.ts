/**
 * React Query mutation hooks for subscription operations
 */

import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createCheckoutSession, createPortalSession } from '@/server/actions/stripe'
import type { CreateCheckoutInput } from '@/lib/validations/subscription'

// ============================================================================
// Create Checkout
// ============================================================================

export function useCreateCheckout() {
  return useMutation({
    mutationFn: async (input: CreateCheckoutInput) => {
      const result = await createCheckoutSession(input)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create checkout session')
      }
      return result.data
    },
    onSuccess: (data) => {
      // Redirect to Stripe Checkout
      window.location.href = data.url
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ============================================================================
// Manage Billing (Portal)
// ============================================================================

export function useManageBilling() {
  return useMutation({
    mutationFn: async () => {
      const result = await createPortalSession()
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to open billing portal')
      }
      return result.data
    },
    onSuccess: (data) => {
      window.location.href = data.url
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
