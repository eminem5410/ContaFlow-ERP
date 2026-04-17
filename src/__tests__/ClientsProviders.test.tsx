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
  userPermissions: [
    'clients.view', 'clients.create', 'clients.edit', 'clients.delete', 'clients.export',
    'providers.view', 'providers.create', 'providers.edit', 'providers.delete', 'providers.export',
  ],
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

import { ClientsView } from '@/components/erp/ClientsView'
import { ProvidersView } from '@/components/erp/ProvidersView'

const mockClients = {
  clients: [
    { id: 'c1', name: 'Juan Perez S.A.', cuit: '20-12345678-9', email: 'juan@email.com', phone: '4700-1234', address: 'Av. Corrientes 500', balance: 150000, city: 'CABA' },
    { id: 'c2', name: 'Maria Garcia S.R.L.', cuit: '30-87654321-0', email: 'maria@email.com', phone: '4800-5678', address: 'Av. Santa Fe 200', balance: 75000, city: 'CABA' },
  ],
  pagination: { total: 2 },
}

const mockProviders = {
  providers: [
    { id: 'p1', name: 'Distribuidora ABC', cuit: '30-11111111-1', email: 'ventas@abc.com', phone: '4500-1111', address: 'Ruta 2 Km 5', balance: 320000, city: 'La Plata' },
  ],
  pagination: { total: 1 },
}

describe('ClientsView', () => {
  beforeEach(() => { queryState.data = undefined })

  it('renders new client button which contains translated text', () => {
    queryState.data = mockClients
    render(React.createElement(ClientsView))
    expect(screen.getByText('Nuevo Cliente')).toBeInTheDocument()
  })

  it('renders client data', () => {
    queryState.data = mockClients
    render(React.createElement(ClientsView))
    expect(screen.getByText('Juan Perez S.A.')).toBeInTheDocument()
    expect(screen.getByText('Maria Garcia S.R.L.')).toBeInTheDocument()
  })

  it('renders search input', () => {
    queryState.data = mockClients
    render(React.createElement(ClientsView))
    expect(screen.getByPlaceholderText('Buscar por nombre o CUIT...')).toBeInTheDocument()
  })

  it('renders new client button', () => {
    queryState.data = mockClients
    render(React.createElement(ClientsView))
    expect(screen.getByText('Nuevo Cliente')).toBeInTheDocument()
  })
})

describe('ProvidersView', () => {
  beforeEach(() => { queryState.data = undefined })

  it('renders new provider button which contains translated text', () => {
    queryState.data = mockProviders
    render(React.createElement(ProvidersView))
    expect(screen.getByText('Nuevo Proveedor')).toBeInTheDocument()
  })

  it('renders provider data', () => {
    queryState.data = mockProviders
    render(React.createElement(ProvidersView))
    expect(screen.getByText('Distribuidora ABC')).toBeInTheDocument()
  })

  it('renders search input', () => {
    queryState.data = mockProviders
    render(React.createElement(ProvidersView))
    expect(screen.getByPlaceholderText('Buscar por nombre o CUIT...')).toBeInTheDocument()
  })

  it('renders new provider button', () => {
    queryState.data = mockProviders
    render(React.createElement(ProvidersView))
    expect(screen.getByText('Nuevo Proveedor')).toBeInTheDocument()
  })
})
