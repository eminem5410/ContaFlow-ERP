/**
 * Cliente HTTP tipado para comunicarse con el backend .NET de ContaFlow.
 * 
 * Estrategia de fallback: si la variable BACKEND_URL está configurada, envía
 * las solicitudes al backend .NET. Si no, falla silenciosamente y el frontend
 * usa sus propias API routes de Next.js.
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || ''

interface BackendRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
  params?: Record<string, string | number | boolean | undefined>
  token?: string
}

interface BackendResponse<T> {
  success: boolean
  data?: T
  message?: string
  errorCode?: string
  errors?: string[]
}

class BackendClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
  }

  get isAvailable(): boolean {
    return this.baseUrl.length > 0
  }

  private getToken(): string {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem('erp_access_token') || '""')
      } catch {
        return ''
      }
    }
    return ''
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(`${this.baseUrl}${path}`)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value))
        }
      })
    }
    return url.toString()
  }

  async request<T>(path: string, options: BackendRequestOptions = {}): Promise<BackendResponse<T>> {
    const { method = 'GET', body, headers = {}, params, token } = options
    const authToken = token || this.getToken()

    const fetchHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    }

    if (authToken) {
      fetchHeaders['Authorization'] = `Bearer ${authToken}`
    }

    try {
      const response = await fetch(this.buildUrl(path, params), {
        method,
        headers: fetchHeaders,
        body: body ? JSON.stringify(body) : undefined,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          success: false,
          message: errorData.message || `Error ${response.status}`,
          errorCode: errorData.errorCode || `HTTP_${response.status}`,
          errors: errorData.errors || [],
        }
      }

      return await response.json()
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error de conexión con el backend',
        errorCode: 'CONNECTION_ERROR',
      }
    }
  }

  // Métodos de conveniencia
  async get<T>(path: string, params?: Record<string, string | number | boolean | undefined>, token?: string): Promise<BackendResponse<T>> {
    return this.request<T>(path, { method: 'GET', params, token })
  }

  async post<T>(path: string, body?: unknown, token?: string): Promise<BackendResponse<T>> {
    return this.request<T>(path, { method: 'POST', body, token })
  }

  async put<T>(path: string, body?: unknown, token?: string): Promise<BackendResponse<T>> {
    return this.request<T>(path, { method: 'PUT', body, token })
  }

  async del<T>(path: string, token?: string): Promise<BackendResponse<T>> {
    return this.request<T>(path, { method: 'DELETE', token })
  }

  // ── Auth endpoints ──────────────────────────────────────────────────
  async login(email: string, password: string) {
    return this.post<{
      token: string
      tokenType: string
      expiresIn: number
      refreshToken: string
      user: { id: string; email: string; name: string; role: string; companyId: string; companyName: string }
    }>('/api/auth/login', { email, password })
  }

  async register(data: { name: string; email: string; password: string; companyName: string; cuit?: string }) {
    return this.post<{
      token: string
      tokenType: string
      expiresIn: number
      refreshToken: string
      user: { id: string; email: string; name: string; role: string; companyId: string; companyName: string }
    }>('/api/auth/register', data)
  }

  async refreshToken(refreshToken: string) {
    return this.post<{
      token: string
      tokenType: string
      expiresIn: number
      refreshToken: string
      user: { id: string; email: string; name: string; role: string; companyId: string; companyName: string }
    }>('/api/auth/refresh', { refreshToken })
  }

  // ── Cuentas ────────────────────────────────────────────────────────
  async getAccounts(page = 1, pageSize = 50, search?: string) {
    return this.get('/api/accounts', { pageNumber: page, pageSize, searchTerm: search })
  }

  async getAccountTree() {
    return this.get('/api/accounts/tree')
  }

  // ── Asientos Contables ──────────────────────────────────────────────
  async getJournalEntries(page = 1, pageSize = 20, status?: string) {
    return this.get('/api/journal-entries', { pageNumber: page, pageSize, status })
  }

  // ── Facturas ────────────────────────────────────────────────────────
  async getInvoices(page = 1, pageSize = 20, status?: string, type?: string) {
    return this.get('/api/invoices', { pageNumber: page, pageSize, status, type })
  }

  // ── Pagos/Cobros ────────────────────────────────────────────────────
  async getPayments(page = 1, pageSize = 20, type?: string) {
    return this.get('/api/payments', { pageNumber: page, pageSize, type })
  }

  // ── Clientes ────────────────────────────────────────────────────────
  async getClients(page = 1, pageSize = 20, search?: string) {
    return this.get('/api/clients', { pageNumber: page, pageSize, searchTerm: search })
  }

  // ── Proveedores ─────────────────────────────────────────────────────
  async getProviders(page = 1, pageSize = 20, search?: string) {
    return this.get('/api/providers', { pageNumber: page, pageSize, searchTerm: search })
  }

  // ── Cuentas Bancarias ───────────────────────────────────────────────
  async getBankAccounts(page = 1, pageSize = 20) {
    return this.get('/api/bank-accounts', { pageNumber: page, pageSize })
  }

  // ── Roles y Permisos ────────────────────────────────────────────────
  async getRoles() {
    return this.get('/api/roles')
  }

  async getPermissions() {
    return this.get('/api/permissions')
  }

  async getPermissionsGrouped() {
    return this.get('/api/permissions/grouped')
  }

  // ── Reportes ────────────────────────────────────────────────────────
  async getBalanceSheet(fromDate?: string, toDate?: string) {
    return this.get('/api/reports/balance-sheet', { fromDate, toDate })
  }

  async getIncomeStatement(fromDate?: string, toDate?: string) {
    return this.get('/api/reports/income-statement', { fromDate, toDate })
  }

  async getIvaSales(fromDate?: string, toDate?: string) {
    return this.get('/api/reports/iva-sales', { fromDate, toDate })
  }

  async getIvaPurchases(fromDate?: string, toDate?: string) {
    return this.get('/api/reports/iva-purchases', { fromDate, toDate })
  }

  // ── Configuración ───────────────────────────────────────────────────
  async getSettings() {
    return this.get('/api/settings')
  }

  async updateSettings(data: Record<string, unknown>) {
    return this.put('/api/settings', data)
  }

  // ── Health ──────────────────────────────────────────────────────────
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health/ready`)
      return response.ok
    } catch {
      return false
    }
  }
}

export const backendClient = new BackendClient(BACKEND_URL)
export default backendClient
