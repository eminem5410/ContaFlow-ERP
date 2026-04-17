import { NextRequest } from "next/server"
import { verifyToken, type TokenPayload } from "./auth"
import { db } from "./db"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SessionUser {
  id: string
  email: string
  name: string
  companyId: string
  roleId: string | null
  role: string
}

// ---------------------------------------------------------------------------
// Helper: extract Bearer token
// ---------------------------------------------------------------------------

function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return null
  return authHeader.slice(7).trim()
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Get the current user session from the request.
 *
 * Returns `null` when there is no valid token (guest / unauthenticated).
 */
export async function getSession(
  request: NextRequest,
): Promise<SessionUser | null> {
  const token = extractBearerToken(request)
  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload?.userId) return null

  // Optionally look up latest user data from the DB (e.g. name may have changed).
  // We keep this lightweight – only fetch when needed.
  try {
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        companyId: true,
        roleId: true,
        role: true,
      },
    })

    if (!user) return null

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      companyId: user.companyId,
      roleId: user.roleId,
      role: user.role,
    }
  } catch {
    return null
  }
}

/**
 * Require authentication – returns the session user or throws a 401.
 */
export async function requireAuth(
  request: NextRequest,
): Promise<SessionUser> {
  const session = await getSession(request)

  if (!session) {
    throw new Response(JSON.stringify({ error: "No autenticado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  return session
}

/**
 * Require a specific permission.
 *
 * Checks authentication first, then queries the user's role permissions
 * from the database to verify access to `module.action`.
 */
export async function requirePermission(
  request: NextRequest,
  module: string,
  action: string,
): Promise<SessionUser> {
  const session = await requireAuth(request)

  // If the user has the legacy "admin" role string and no roleId assigned,
  // grant full access (backward-compatible superuser shortcut).
  if (session.role === "admin" && !session.roleId) {
    return session
  }

  const allowed = await hasPermission(
    session.roleId ?? "",
    module,
    action,
  )

  if (!allowed) {
    throw new Response(
      JSON.stringify({
        error: `Sin permisos: ${module}.${action}`,
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      },
    )
  }

  return session
}

/**
 * Check whether a given role has a specific permission.
 *
 * Queries the pivot table (RolePermission → Permission) to find a match
 * for the module + action combination.
 *
 * Returns `false` if roleId is empty or the permission does not exist.
 */
export async function hasPermission(
  roleId: string,
  module: string,
  action: string,
): Promise<boolean> {
  if (!roleId) return false

  try {
    const count = await db.rolePermission.count({
      where: {
        roleId,
        permission: {
          module,
          action,
        },
      },
    })

    return count > 0
  } catch {
    return false
  }
}
