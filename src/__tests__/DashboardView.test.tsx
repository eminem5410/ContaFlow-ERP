import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import esTranslations from '@/i18n/locales/es.json'

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.')
  let current: unknown = obj
  for (const key of keys) {
    if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[key]
    } else {
      return path
    }
  }
  return typeof current === 'string' ? current : path
}

const appStore = vi.hoisted(() => ({
  isAuthenticated: true,
  user: {
    id: 'usr-1', name: 'Admin Demo', email: 'admin@empresademo.com.ar',
    role: 'admin', companyId: 'cmp-1', roleId: 'rol-1',
    accessToken: 'fake-token', refreshToken: 'fake-refresh', permissions: [],
  },
  company: { id: 'cmp-1', name: 'Empresa Demo S.R.L.', cuit: '30-12345678-9' },
  _hasHydrated: true,
  userPermissions: [],
  currentView: 'dashboard',
  isMobileSidebarOpen: false,
  locale: 'es' as const,
  hydrateFromStorage: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  setCurrentView: vi.fn(),
  setMobileSidebarOpen: vi.fn(),
  setPermissions: vi.fn(),
  hasPermission: vi.fn(() => true),
  setLocale: vi.fn(),
}))

const queryState = vi.hoisted(() => ({ data: undefined as unknown }))

vi.mock('@/lib/store', () => ({
  useAppStore: (selector: (s: typeof appStore) => unknown) => selector(appStore),
}))

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() },
  isBackendConfigured: vi.fn(() => false),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: queryState.data, isLoading: false }),
  useMutation: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'rc' }, children),
  LineChart: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'lc' }, children),
  Line: () => null,
  BarChart: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'bc' }, children),
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}))

vi.mock('@/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, string | number>) => {
      let val = getNestedValue(esTranslations as unknown as Record<string, unknown>, key)
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          val = val.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v))
        }
      }
      return val
    },
    locale: 'es',
    setLocale: vi.fn(),
    getLocaleLabel: vi.fn(() => 'Espanol'),
    formatCurrency: (n: number) => `$${n.toLocaleString('es-AR')}`,
    formatDate: (d: string) => new Date(d).toLocaleDateString('es-AR'),
  }),
}))

import { DashboardView } from '@/components/erp/DashboardView'

const dashboardData = {
  totalAssets: 1500000, totalLiabilities: 800000, totalEquity: 700000,
  totalRevenue: 2500000, totalExpenses: 1800000, netIncome: 700000,
  totalClients: 42, totalProviders: 15,
  pendingEntries: 8, pendingInvoices: 5,
  totalInvoiced: 3200000, totalCollected: 2800000,
  recentEntries: [
    { id: 'e1', number: 1001, date: '2025-04-10', description: 'Venta de mercaderia', status: 'confirmado', total: 250000 },
    { id: 'e2', number: 1002, date: '2025-04-11', description: 'Compra de insumos', status: 'borrador', total: 85000 },
  ],
  monthlyData: [{ month: 'Ene', year: 2025, ingresos: 500000, egresos: 300000 }],
  accountBalances: [{ id: '1', code: '1.1.1', name: 'Caja', type: 'activo', balance: 500000 }],
}

const emptyData = {
  totalAssets: 0, totalLiabilities: 0, totalEquity: 0,
  totalRevenue: 0, totalExpenses: 0, netIncome: 0,
  totalClients: 0, totalProviders: 0,
  pendingEntries: 0, pendingInvoices: 0,
  totalInvoiced: 0, totalCollected: 0,
  recentEntries: [], monthlyData: [], accountBalances: [],
}

describe('DashboardView', () => {
  beforeEach(() => { queryState.data = undefined })

  it('renders no data when empty', () => {
    render(React.createElement(DashboardView))
    expect(screen.getByText('No hay datos disponibles')).toBeInTheDocument()
  })

  it('renders KPI cards', () => {
    queryState.data = dashboardData
    render(React.createElement(DashboardView))
    expect(screen.getByText('Ingresos Totales')).toBeInTheDocument()
    expect(screen.getAllByText('Balance').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Egresos Totales')).toBeInTheDocument()
    expect(screen.getByText('Facturas Vencidas')).toBeInTheDocument()
  })

  it('renders recent entries', () => {
    queryState.data = dashboardData
    render(React.createElement(DashboardView))
    expect(screen.getByText('Venta de mercaderia')).toBeInTheDocument()
    expect(screen.getByText('#1001')).toBeInTheDocument()
  })

  it('renders quick stats', () => {
    queryState.data = dashboardData
    render(React.createElement(DashboardView))
    expect(screen.getByText('Total Clientes')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
  })

  it('shows no data when entries are empty', () => {
    queryState.data = emptyData
    render(React.createElement(DashboardView))
    expect(screen.getAllByText('No hay datos disponibles').length).toBeGreaterThanOrEqual(1)
  })
})
