import { NextRequest, NextResponse } from 'next/server'
import { getSession } from './auth-middleware'
import { logAction } from './audit'

type HttpMethod = 'POST' | 'PUT' | 'DELETE' | 'PATCH'

/**
 * Wraps a Next.js route handler to automatically log successful mutations
 * to the AuditLog table.
 *
 * Usage:
 *   // Before:
 *   export async function POST(request: NextRequest) { ... }
 *
 *   // After:
 *   export const POST = withAudit(async (request: NextRequest) => { ... }, 'client', 'POST')
 *
 * Only logs on 2xx responses. Auth is optional (uses getSession, not requireAuth)
 * so it doesn't force auth on routes that don't currently require it.
 * Failures in audit logging are silently caught to avoid breaking the route.
 */
export function withAudit(
  entity: string,
  method: HttpMethod,
) {
  return function handlerWrapper(
    handler: (req: NextRequest, ctx?: any) => Promise<NextResponse>,
  ) {
    return async (request: NextRequest, context?: any): Promise<NextResponse> => {
      const response = await handler(request, context)

      // Only log successful mutations (2xx)
      if (response.status >= 200 && response.status < 300) {
        // Extract entityId from URL path (e.g., /api/clients/abc123)
        const url = new URL(request.url)
        const pathParts = url.pathname.split('/')
        const entityId = pathParts[pathParts.length - 1]

        // Fire-and-forget — don't block the response
        getSession(request).then((session) => {
          if (session) {
            logAction({
              userId: session.id,
              userName: session.name,
              action: method.toLowerCase(),
              entity,
              entityId: entityId && !entityId.startsWith('[') ? entityId : undefined,
              companyId: session.companyId,
            }).catch(() => {
              // Silently ignore audit failures
            })
          }
        })
      }

      return response
    }
  }
}
