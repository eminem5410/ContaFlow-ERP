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
  userPermissions: ['invoices.view', 'invoices.create', 'invoices.edit', 'invoices.delete', 'invoices.export'],
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

vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef((props: Record<string, unknown>, ref: React.Ref<HTMLDivElement>) =>
      React.createElement('div', { ...props, ref })
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/lib/export-excel', () => ({
  exportInvoicesToExcel: vi.fn(),
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

import { InvoicesView } from '@/components/erp/InvoicesView'

const mockInvoices = {
  invoices: [
    {
      id: 'inv-1', number: 'FA-0001', type: 'A', date: '2025-04-10T00:00:00',
      dueDate: '2025-05-10T00:00:00', total: 121000, tax: 21000, netTotal: 100000,
      amountPaid: 0, status: 'pendiente', notes: null,
      clientId: 'c1', client: { id: 'c1', name: 'Juan Perez S.A.' },
    },
    {
      id: 'inv-2', number: 'FA-0002', type: 'B', date: '2025-04-12T00:00:00',
      dueDate: null, total: 242000, tax: 42000, netTotal: 200000,
      amountPaid: 242000, status: 'pagada', notes: null,
      clientId: 'c2', client: { id: 'c2', name: 'Maria Garcia S.R.L.' },
    },
  ],
  pagination: { total: 2 },
}

describe('InvoicesView', () => {
  beforeEach(() => { queryState.data = undefined })

  it('renders new invoice button with translated text', () => {
    queryState.data = mockInvoices
    render(React.createElement(InvoicesView))
    expect(screen.getByText('Nueva Factura')).toBeInTheDocument()
  })

  it('renders invoice numbers', () => {
    queryState.data = mockInvoices
    render(React.createElement(InvoicesView))
    expect(screen.getByText('FA-0001')).toBeInTheDocument()
    expect(screen.getByText('FA-0002')).toBeInTheDocument()
  })

  it('renders client names', () => {
    queryState.data = mockInvoices
    render(React.createElement(InvoicesView))
    expect(screen.getByText('Juan Perez S.A.')).toBeInTheDocument()
    expect(screen.getByText('Maria Garcia S.R.L.')).toBeInTheDocument()
  })

  it('renders translated status badges', () => {
    queryState.data = mockInvoices
    render(React.createElement(InvoicesView))
    expect(screen.getByText('Pendiente')).toBeInTheDocument()
    expect(screen.getByText('Pagada')).toBeInTheDocument()
  })

  it('renders search input', () => {
    queryState.data = mockInvoices
    render(React.createElement(InvoicesView))
    expect(screen.getByPlaceholderText('Buscar por Nro o cliente...')).toBeInTheDocument()
  })

  it('renders new invoice button', () => {
    queryState.data = mockInvoices
    render(React.createElement(InvoicesView))
    expect(screen.getByText('Nueva Factura')).toBeInTheDocument()
  })

  it('renders export excel button', () => {
    queryState.data = mockInvoices
    render(React.createElement(InvoicesView))
    expect(screen.getByText('Exportar Excel')).toBeInTheDocument()
  })

  it('renders no results when empty', () => {
    queryState.data = { invoices: [], pagination: { total: 0 } }
    render(React.createElement(InvoicesView))
    expect(screen.getByText('Sin resultados')).toBeInTheDocument()
  })
})
