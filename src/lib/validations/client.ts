import { z } from 'zod'
import { RelationshipStatus } from '@prisma/client'

export const inviteClientSchema = z.object({
  clientEmail: z.string().email().optional(),
  confirmUpgrade: z.boolean().optional(),
})

export const acceptInvitationSchema = z.object({
  inviteCode: z.string().min(1, 'Invite code is required'),
})

export const rejectInvitationSchema = z.object({
  inviteCode: z.string().min(1, 'Invite code is required'),
})

export const endRelationshipSchema = z.object({
  relationshipId: z.string().cuid('Invalid relationship ID'),
})

export const clientFiltersSchema = z.object({
  search: z.string().max(100).optional(),
  status: z.nativeEnum(RelationshipStatus).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
})

export const assignWorkoutToClientSchema = z.object({
  workoutId: z.string().cuid('Invalid workout ID'),
  clientId: z.string().cuid('Invalid client ID'),
  name: z.string().min(1).max(100).optional(),
})

export const assignPlanToClientSchema = z.object({
  planId: z.string().cuid('Invalid plan ID'),
  clientId: z.string().cuid('Invalid client ID'),
  name: z.string().min(1).max(100).optional(),
})

// Type exports
export type InviteClientInput = z.infer<typeof inviteClientSchema>
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>
export type RejectInvitationInput = z.infer<typeof rejectInvitationSchema>
export type EndRelationshipInput = z.infer<typeof endRelationshipSchema>
export type ClientFiltersInput = z.infer<typeof clientFiltersSchema>
export type AssignWorkoutToClientInput = z.infer<typeof assignWorkoutToClientSchema>
export type AssignPlanToClientInput = z.infer<typeof assignPlanToClientSchema>
