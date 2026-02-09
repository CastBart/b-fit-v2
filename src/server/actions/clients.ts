'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { getServerSession } from '@/lib/auth/auth'
import { requireRole } from '@/lib/auth/rbac'
import {
  inviteClientSchema,
  acceptInvitationSchema,
  rejectInvitationSchema,
  endRelationshipSchema,
  clientFiltersSchema,
  type InviteClientInput,
  type AcceptInvitationInput,
  type RejectInvitationInput,
  type EndRelationshipInput,
  type ClientFiltersInput,
} from '@/lib/validations/client'
import type { ClientRelationshipWithClient, ClientListItem, InvitationView } from '@/types/client'
import type { TrainingSessionWithDetails } from '@/types/session'

// ============================================================================
// Types
// ============================================================================

type ActionResponse<T = void> = {
  success: boolean
  data?: T
  error?: string
}

// ============================================================================
// PT-Facing Actions
// ============================================================================

/**
 * Get all clients for the current PT with optional filters
 */
export async function getMyClients(filters?: ClientFiltersInput): Promise<
  ActionResponse<{
    clients: ClientListItem[]
    total: number
    page: number
    totalPages: number
  }>
> {
  try {
    const auth = await requireRole('PT')
    if (!auth.success) {
      return { success: false, error: auth.error }
    }

    const validated = filters ? clientFiltersSchema.parse(filters) : { page: 1, limit: 20 }
    const { search, status, page = 1, limit = 20 } = validated

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      ptId: auth.userId,
    }

    if (status) {
      where.status = status
    } else {
      // By default, show ACTIVE and PENDING (not ENDED)
      where.status = { in: ['ACTIVE', 'PENDING'] }
    }

    if (search) {
      where.client = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }
    }

    const total = await prisma.clientRelationship.count({ where })

    const relationships = await prisma.clientRelationship.findMany({
      where,
      include: {
        client: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    const clients: ClientListItem[] = relationships.map((r) => ({
      id: r.client?.id ?? r.id,
      relationshipId: r.id,
      name: r.client?.name ?? null,
      email: r.client?.email ?? r.clientEmail ?? 'Pending invite',
      image: r.client?.image ?? null,
      status: r.status,
      joinedAt: r.createdAt,
    }))

    return {
      success: true,
      data: {
        clients,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    }
  } catch (error) {
    console.error('Failed to get clients:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get clients',
    }
  }
}

/**
 * Get detailed info about a specific client relationship
 */
export async function getClientDetail(
  clientId: string
): Promise<ActionResponse<ClientRelationshipWithClient>> {
  try {
    const auth = await requireRole('PT')
    if (!auth.success) {
      return { success: false, error: auth.error }
    }

    const relationship = await prisma.clientRelationship.findFirst({
      where: {
        ptId: auth.userId,
        clientId,
        status: 'ACTIVE',
      },
      include: {
        client: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    })

    if (!relationship) {
      return { success: false, error: 'Client relationship not found' }
    }

    return { success: true, data: relationship }
  } catch (error) {
    console.error('Failed to get client detail:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get client detail',
    }
  }
}

/**
 * Get sessions for a specific client (PT read access)
 */
export async function getClientSessions(
  clientId: string,
  page = 1,
  limit = 10
): Promise<
  ActionResponse<{
    sessions: TrainingSessionWithDetails[]
    total: number
    page: number
    totalPages: number
  }>
> {
  try {
    const auth = await requireRole('PT')
    if (!auth.success) {
      return { success: false, error: auth.error }
    }

    // Verify active relationship
    const relationship = await prisma.clientRelationship.findFirst({
      where: {
        ptId: auth.userId,
        clientId,
        status: 'ACTIVE',
      },
    })

    if (!relationship) {
      return { success: false, error: 'No active relationship with this client' }
    }

    const where = { userId: clientId }
    const total = await prisma.trainingSession.count({ where })

    const sessions = await prisma.trainingSession.findMany({
      where,
      include: {
        exercises: {
          include: {
            exercise: true,
            sets: true,
          },
          orderBy: { order: 'asc' },
        },
        sets: true,
      },
      orderBy: { startedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    return {
      success: true,
      data: {
        sessions,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    }
  } catch (error) {
    console.error('Failed to get client sessions:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get client sessions',
    }
  }
}

/**
 * Generate an invite link for a new client
 */
export async function inviteClient(
  input?: InviteClientInput
): Promise<ActionResponse<{ inviteCode: string }>> {
  try {
    const auth = await requireRole('PT')
    if (!auth.success) {
      return { success: false, error: auth.error }
    }

    const validated = input ? inviteClientSchema.parse(input) : {}

    // Deduplicate: if there's already a PENDING invite for this email, return it
    if (validated.clientEmail) {
      const existing = await prisma.clientRelationship.findFirst({
        where: {
          ptId: auth.userId,
          clientEmail: validated.clientEmail,
          status: 'PENDING',
        },
      })

      if (existing) {
        return { success: true, data: { inviteCode: existing.inviteCode } }
      }
    }

    // Generate unique invite code
    const inviteCode = crypto.randomUUID().replace(/-/g, '').substring(0, 12)

    await prisma.clientRelationship.create({
      data: {
        ptId: auth.userId,
        status: 'PENDING',
        inviteCode,
        clientEmail: validated.clientEmail ?? null,
      },
    })

    return { success: true, data: { inviteCode } }
  } catch (error) {
    console.error('Failed to invite client:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create invitation',
    }
  }
}

// ============================================================================
// Invitation Actions (accessible by any authenticated user)
// ============================================================================

/**
 * Get invitation details by invite code (for the acceptance page)
 */
export async function getInvitation(inviteCode: string): Promise<ActionResponse<InvitationView>> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    const relationship = await prisma.clientRelationship.findUnique({
      where: { inviteCode },
      include: {
        pt: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    })

    if (!relationship) {
      return { success: false, error: 'Invitation not found' }
    }

    if (relationship.status !== 'PENDING') {
      return { success: false, error: 'This invitation is no longer valid' }
    }

    return {
      success: true,
      data: {
        id: relationship.id,
        inviteCode: relationship.inviteCode,
        status: relationship.status,
        clientEmail: relationship.clientEmail,
        createdAt: relationship.createdAt,
        pt: relationship.pt,
      },
    }
  } catch (error) {
    console.error('Failed to get invitation:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get invitation',
    }
  }
}

/**
 * Accept an invitation - sets clientId, updates status, changes user role to CLIENT
 */
export async function acceptInvitation(input: AcceptInvitationInput): Promise<ActionResponse> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    const validated = acceptInvitationSchema.parse(input)

    // Find the invitation
    const invitation = await prisma.clientRelationship.findUnique({
      where: { inviteCode: validated.inviteCode },
    })

    if (!invitation) {
      return { success: false, error: 'Invitation not found' }
    }

    if (invitation.status !== 'PENDING') {
      return { success: false, error: 'This invitation is no longer valid' }
    }

    // Can't accept your own invitation
    if (invitation.ptId === session.user.id) {
      return { success: false, error: 'You cannot accept your own invitation' }
    }

    // Check if user already has an active PT relationship
    const existingActive = await prisma.clientRelationship.findFirst({
      where: {
        clientId: session.user.id,
        status: 'ACTIVE',
      },
    })

    if (existingActive) {
      return {
        success: false,
        error: 'You already have an active trainer. End your current relationship first.',
      }
    }

    // Transaction: accept invite + update user role
    await prisma.$transaction(async (tx) => {
      // Update the relationship
      await tx.clientRelationship.update({
        where: { id: invitation.id },
        data: {
          clientId: session.user.id,
          status: 'ACTIVE',
        },
      })

      // Update user role to CLIENT
      await tx.user.update({
        where: { id: session.user.id },
        data: { role: 'CLIENT' },
      })
    })

    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error('Failed to accept invitation:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to accept invitation',
    }
  }
}

/**
 * Reject an invitation
 */
export async function rejectInvitation(input: RejectInvitationInput): Promise<ActionResponse> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    const validated = rejectInvitationSchema.parse(input)

    const invitation = await prisma.clientRelationship.findUnique({
      where: { inviteCode: validated.inviteCode },
    })

    if (!invitation) {
      return { success: false, error: 'Invitation not found' }
    }

    if (invitation.status !== 'PENDING') {
      return { success: false, error: 'This invitation is no longer valid' }
    }

    // Set status to ENDED
    await prisma.clientRelationship.update({
      where: { id: invitation.id },
      data: { status: 'ENDED' },
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to reject invitation:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reject invitation',
    }
  }
}

/**
 * End a relationship (either party can initiate)
 * If client has no other active relationships, revert to PERSONAL role
 */
export async function endRelationship(input: EndRelationshipInput): Promise<ActionResponse> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    const validated = endRelationshipSchema.parse(input)

    const relationship = await prisma.clientRelationship.findUnique({
      where: { id: validated.relationshipId },
    })

    if (!relationship) {
      return { success: false, error: 'Relationship not found' }
    }

    if (relationship.status !== 'ACTIVE') {
      return { success: false, error: 'Relationship is not active' }
    }

    // Check that the current user is either the PT or the client
    if (relationship.ptId !== session.user.id && relationship.clientId !== session.user.id) {
      return { success: false, error: 'You are not part of this relationship' }
    }

    await prisma.$transaction(async (tx) => {
      // End the relationship
      await tx.clientRelationship.update({
        where: { id: validated.relationshipId },
        data: { status: 'ENDED' },
      })

      // If there's a client, check if they have other active relationships
      if (relationship.clientId) {
        const otherActive = await tx.clientRelationship.count({
          where: {
            clientId: relationship.clientId,
            status: 'ACTIVE',
            id: { not: validated.relationshipId },
          },
        })

        // If no other active relationships, revert client to PERSONAL
        if (otherActive === 0) {
          await tx.user.update({
            where: { id: relationship.clientId },
            data: { role: 'PERSONAL' },
          })
        }
      }
    })

    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error('Failed to end relationship:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to end relationship',
    }
  }
}

// ============================================================================
// Client-Facing Actions
// ============================================================================

/**
 * Get the current user's PT (for CLIENT role)
 */
export async function getMyPT(): Promise<
  ActionResponse<{
    relationshipId: string
    pt: { id: string; name: string | null; email: string; image: string | null }
  } | null>
> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    const relationship = await prisma.clientRelationship.findFirst({
      where: {
        clientId: session.user.id,
        status: 'ACTIVE',
      },
      include: {
        pt: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    })

    if (!relationship) {
      return { success: true, data: null }
    }

    return {
      success: true,
      data: {
        relationshipId: relationship.id,
        pt: relationship.pt,
      },
    }
  } catch (error) {
    console.error('Failed to get PT:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get trainer info',
    }
  }
}

/**
 * Get pending invitations for the current user
 */
export async function getPendingInvitations(): Promise<ActionResponse<InvitationView[]>> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    // Find pending invitations where the email matches
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    const invitations = await prisma.clientRelationship.findMany({
      where: {
        clientEmail: user.email,
        status: 'PENDING',
      },
      include: {
        pt: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return {
      success: true,
      data: invitations.map((inv) => ({
        id: inv.id,
        inviteCode: inv.inviteCode,
        status: inv.status,
        clientEmail: inv.clientEmail,
        createdAt: inv.createdAt,
        pt: inv.pt,
      })),
    }
  } catch (error) {
    console.error('Failed to get pending invitations:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get pending invitations',
    }
  }
}
