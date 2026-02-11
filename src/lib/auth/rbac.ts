import { UserRole } from '@prisma/client'
import { getServerSession } from '@/lib/auth/auth'

// ============================================================================
// Permission Definitions
// ============================================================================

export type Permission =
  | 'exercise:create'
  | 'exercise:read'
  | 'exercise:update'
  | 'exercise:delete'
  | 'workout:create'
  | 'workout:read'
  | 'workout:update'
  | 'workout:delete'
  | 'workout:assign'
  | 'plan:create'
  | 'plan:read'
  | 'plan:update'
  | 'plan:delete'
  | 'plan:assign'
  | 'session:create'
  | 'session:read'
  | 'client:manage'
  | 'client:invite'
  | 'client:view'

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  PERSONAL: [
    'exercise:create',
    'exercise:read',
    'exercise:update',
    'exercise:delete',
    'workout:create',
    'workout:read',
    'workout:update',
    'workout:delete',
    'plan:create',
    'plan:read',
    'plan:update',
    'plan:delete',
    'session:create',
    'session:read',
  ],
  PT: [
    'exercise:create',
    'exercise:read',
    'exercise:update',
    'exercise:delete',
    'workout:create',
    'workout:read',
    'workout:update',
    'workout:delete',
    'workout:assign',
    'plan:create',
    'plan:read',
    'plan:update',
    'plan:delete',
    'plan:assign',
    'session:create',
    'session:read',
    'client:manage',
    'client:invite',
    'client:view',
  ],
  CLIENT: ['exercise:read', 'workout:read', 'plan:read', 'session:create', 'session:read'],
  ORG: ['client:manage', 'client:view'],
}

// ============================================================================
// Permission Helpers
// ============================================================================

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

/**
 * Check if a role has a specific permission, returning an error message if not.
 * Returns null if permitted, or an error string if denied.
 */
export function checkPermission(role: UserRole, permission: Permission): string | null {
  if (hasPermission(role, permission)) {
    return null
  }
  return `Your role (${role}) does not have permission to perform this action`
}

type AuthSuccess = { success: true; userId: string; role: UserRole }
type AuthFailure = { success: false; error: string }
export type AuthResult = AuthSuccess | AuthFailure

/**
 * Server action helper: get authenticated session and check permission.
 * Uses `success` boolean as discriminant for proper type narrowing.
 */
export async function requirePermission(permission: Permission): Promise<AuthResult> {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' }
  }

  const role = session.user.role as UserRole
  const denied = checkPermission(role, permission)
  if (denied) {
    return { success: false, error: denied }
  }

  return { success: true, userId: session.user.id, role }
}

/**
 * Server action helper: get authenticated session and check role.
 * Uses `success` boolean as discriminant for proper type narrowing.
 */
export async function requireRole(...roles: UserRole[]): Promise<AuthResult> {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' }
  }

  const role = session.user.role as UserRole
  if (!roles.includes(role)) {
    return {
      success: false,
      error: `This action requires one of the following roles: ${roles.join(', ')}`,
    }
  }

  return { success: true, userId: session.user.id, role }
}
