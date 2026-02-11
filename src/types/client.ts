import type { RelationshipStatus } from '@prisma/client'

export type ClientRelationshipWithPT = {
  id: string
  ptId: string
  clientId: string | null
  status: RelationshipStatus
  inviteCode: string
  clientEmail: string | null
  createdAt: Date
  updatedAt: Date
  pt: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

export type ClientRelationshipWithClient = {
  id: string
  ptId: string
  clientId: string | null
  status: RelationshipStatus
  inviteCode: string
  clientEmail: string | null
  createdAt: Date
  updatedAt: Date
  client: {
    id: string
    name: string | null
    email: string
    image: string | null
  } | null
}

export type ClientListItem = {
  id: string
  relationshipId: string
  name: string | null
  email: string
  image: string | null
  status: RelationshipStatus
  joinedAt: Date
}

export type InvitationView = {
  id: string
  inviteCode: string
  status: RelationshipStatus
  clientEmail: string | null
  expiresAt: Date | null
  createdAt: Date
  pt: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}
