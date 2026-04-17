/**
 * ContaFlow Unified API Layer
 *
 * Capa centralizada que enruta las solicitudes de los componentes del frontend
 * ya sea al backend .NET (vía proxy) o a las API routes locales de Next.js.
 *
 * Estrategia:
 * - Si BACKEND_URL está configurado → usa /api/proxy/... → backend .NET
 * - Si no → usa /api/... local (Prisma + Next.js API routes)
 *
 * Manejo automático de JWT tokens (access + refresh).
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || ''

// ══════════════════════════════════════════════════════════════════
// TOKEN MANAGEMENT
// ══════════════════════════════════════════════════════════════════

export function getAccessToken(): string {
  if (typeof window === 'undefined') return ''
  try {
    return JSON.parse(localStorage.getItem('erp_access_token') || '""')
  } catch {
    return ''
  }
}

export function getRefreshToken(): string {
  if (typeof window === 'undefined') return ''
  try {
    return JSON.parse(localStorage.getItem('erp_refresh_token') || '""')
  } catch {
    return ''
  }
}

export function setTokens(accessToken: string, refreshToken?: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem('erp_access_token', JSON.stringify(accessToken))
  if (refreshToken) {
    localStorage.setItem('erp_refresh_token', JSON.stringify(refreshToken))
  }
}

export function clearTokens() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('erp_access_token')
  localStorage.removeItem('erp_refresh_token')
}

/** Check if .NET backend is configured and available */
export function isBackendConfigured(): boolean {
  return BACKEND_URL.length > 0
}

// ══════════════════════════════════════════════════════════════════
// API ERROR
// ══════════════════════════════════════════════════════════════════

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errorCode?: string,
    public errors?: string[]
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// ══════════════════════════════════════════════════════════════════
// REFRESH TOKEN LOGIC
// ══════════════════════════════════════════════════════════════════

let refreshPromise: Promise<boolean> | null = null

async function tryRefreshToken(): Promise<boolean> {
  // Deduplicate concurrent refresh attempts
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      const refreshToken = getRefreshToken()
      if (!refreshToken) return false

      const refreshUrl = BACKEND_URL
        ? `/api/proxy/api/auth/refresh`
        : '/api/auth/refresh'

      const res = await fetch(refreshUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })

      if (!res.ok) return false

      const data = await res.json()
      const token = data.accessToken || data.token
      const newRefresh = data.refreshToken

      if (token) {
        setTokens(token, newRefresh)
        return true
      }
      return false
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

// ══════════════════════════════════════════════════════════════════
// BACKEND RESPONSE NORMALIZATION
// ══════════════════════════════════════════════════════════════════

/**
 * Mapping of API base paths to the collection key expected by the frontend.
 * Used to convert .NET paginated responses into the format consumed by local routes.
 */
const PATH_TO_COLLECTION_KEY: Record<string, string> = {
  '/api/accounts': 'accounts',
  '/api/journal-entries': 'journalEntries',
  '/api/invoices': 'invoices',
  '/api/payments': 'payments',
  '/api/clients': 'clients',
  '/api/providers': 'providers',
  '/api/bank-accounts': 'bankAccounts',
  '/api/users': 'users',
  '/api/roles': 'roles',
  '/api/audit-logs': 'auditLogs',
  '/api/permissions': 'permissions',
  '/api/cheques': 'cheques',
}

/**
 * Normalizes a .NET backend wrapped response into the format expected by the frontend.
 *
 * .NET paginated list format:
 *   { success: true, data: { items: [...], totalCount: N, pageNumber: P, pageSize: S } }
 * .NET single item format:
 *   { success: true, data: { ...singleItem } }
 *
 * This transforms paginated responses to match local route format:
 *   { accounts: [...], totalCount: N, pageNumber: P, pageSize: S }
 * And unwraps single items to just the data payload.
 */
export function normalizeBackendResponse<T = unknown>(
  url: string,
  wrapped: { success: boolean; data: unknown; message?: string; errorCode?: string; errors?: string[] }
): T {
  const data = wrapped.data

  // Non-object or null data – return as-is
  if (!data || typeof data !== 'object') {
    return data as T
  }

  const dataObj = data as Record<string, unknown>

  // Check if data is a paginated response (has `items` array)
  if (Array.isArray(dataObj.items)) {
    // Reports endpoint – return data as-is (preserves full structure)
    if (url.startsWith('/api/reports/')) {
      return data as T
    }

    // Strip query string to get the base path for matching
    const basePath = url.split('?')[0]
    const collectionKey = PATH_TO_COLLECTION_KEY[basePath]

    if (collectionKey) {
      const result: Record<string, unknown> = { [collectionKey]: dataObj.items }
      // Forward pagination metadata when available
      if (typeof dataObj.totalCount === 'number') result.totalCount = dataObj.totalCount
      if (typeof dataObj.pageNumber === 'number') result.pageNumber = dataObj.pageNumber
      if (typeof dataObj.pageSize === 'number') result.pageSize = dataObj.pageSize
      return result as T
    }

    // Unknown paginated path – return data as-is
    return data as T
  }

  // Reports endpoint (non-paginated) – return data as-is
  if (url.startsWith('/api/reports/')) {
    return data as T
  }

  // Non-paginated single-item response – unwrap and return the data directly
  return data as T
}

// ══════════════════════════════════════════════════════════════════
// CORE API FETCH
// ══════════════════════════════════════════════════════════════════

interface ApiFetchOptions extends Omit<RequestInit, 'headers'> {
  params?: Record<string, string | number | boolean | undefined>
  headers?: Record<string, string>
  token?: string
  /** Skip automatic token refresh on 401 */
  noRetry?: boolean
  /** Skip adding auth header (e.g., for login/register) */
  noAuth?: boolean
}

/**
 * Central API fetch function.
 *
 * Automatically:
 * - Routes to /api/proxy/... when backend is configured
 * - Attaches JWT Authorization header
 * - Retries with refresh token on 401
 * - Normalizes error responses
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { params, headers = {}, token, noRetry, noAuth, ...fetchOptions } = options

  // Build URL with query params
  let url = path
  if (params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.set(key, String(value))
      }
    })
    const qs = searchParams.toString()
    if (qs) url += (path.includes('?') ? '&' : '?') + qs
  }

  // Build headers
  const fetchHeaders: Record<string, string> = {
    ...(fetchOptions.body ? { 'Content-Type': 'application/json' } : {}),
    ...headers,
  }

  // Auth header
  if (!noAuth) {
    const authToken = token || getAccessToken()
    if (authToken) {
      fetchHeaders['Authorization'] = `Bearer ${authToken}`
    }
  }

  // Route to proxy or local
  const targetUrl = BACKEND_URL && !noAuth
    ? `/api/proxy/${url.replace(/^\//, '')}`
    : url

  const response = await fetch(targetUrl, {
    ...fetchOptions,
    headers: fetchHeaders,
  })

  // Handle 401 - try refresh token
  if (response.status === 401 && !noRetry && !noAuth) {
    const refreshed = await tryRefreshToken()
    if (refreshed) {
      // Retry with new token
      const newToken = getAccessToken()
      if (newToken) {
        fetchHeaders['Authorization'] = `Bearer ${newToken}`
      }
      const retryResponse = await fetch(targetUrl, {
        ...fetchOptions,
        headers: fetchHeaders,
      })
      if (retryResponse.ok) {
        return retryResponse.json()
      }
      // If retry also fails, throw error below
      const retryData = await retryResponse.json().catch(() => ({}))
      throw new ApiError(
        retryData.message || retryData.error || `Error ${retryResponse.status}`,
        retryResponse.status,
        retryData.errorCode,
        retryData.errors
      )
    }

    // Refresh failed - redirect to login
    clearTokens()
    if (typeof window !== 'undefined') {
      // Use Zustand store to logout
      const { useAppStore } = await import('@/lib/store')
      useAppStore.getState().logout()
    }
    throw new ApiError('Sesión expirada', 401, 'SESSION_EXPIRED')
  }

  // Parse response
  const data = await response.json().catch(() => ({}))

  // ── .NET wrapped response normalization ──
  // If the response has a `success` property it came from the .NET backend
  // (either directly or via the proxy). Normalize it to match the local route
  // format that the rest of the frontend expects.
  if ('success' in data) {
    if (!data.success) {
      throw new ApiError(
        data.message || data.error || `Error ${response.status}`,
        response.status,
        data.errorCode,
        data.errors
      )
    }
    return normalizeBackendResponse<T>(url, data)
  }

  // ── Local route response (no `success` wrapper) ──
  if (!response.ok) {
    throw new ApiError(
      data.message || data.error || `Error ${response.status}`,
      response.status,
      data.errorCode,
      data.errors
    )
  }

  return data as T
}

// ══════════════════════════════════════════════════════════════════
// CONVENIENCE METHODS
// ══════════════════════════════════════════════════════════════════

export const api = {
  /** GET request */
  get<T = unknown>(path: string, params?: Record<string, string | number | boolean | undefined>) {
    return apiFetch<T>(path, { method: 'GET', params })
  },

  /** POST request */
  post<T = unknown>(path: string, body?: unknown) {
    return apiFetch<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined })
  },

  /** PUT request */
  put<T = unknown>(path: string, body?: unknown) {
    return apiFetch<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined })
  },

  /** DELETE request */
  del<T = unknown>(path: string) {
    return apiFetch<T>(path, { method: 'DELETE' })
  },

  /** PATCH request */
  patch<T = unknown>(path: string, body?: unknown) {
    return apiFetch<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined })
  },
}

export default api
