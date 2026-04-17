import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import esTranslations from '@/i18n/locales/es.json'

const store = vi.hoisted(() => ({
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

vi.mock('@/lib/store', () => ({
  useAppStore: (selector: (s: typeof store) => unknown) => selector(store),
}))

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    loginMutation: { mutate: vi.fn(), isPending: false },
    registerMutation: { mutate: vi.fn(), isPending: false },
    logout: vi.fn(),
    backendAvailable: false,
  }),
}))

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() },
  isBackendConfigured: vi.fn(() => false),
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
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

vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef((props: Record<string, unknown>, ref: React.Ref<HTMLDivElement>) =>
      React.createElement('div', { ...props, ref })
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { AuthScreen } from '@/components/erp/AuthScreen'

describe('AuthScreen', () => {
  it('renders ContaFlow title', () => {
    render(React.createElement(AuthScreen))
    expect(screen.getByText('ContaFlow')).toBeInTheDocument()
  })

  it('shows login form by default', () => {
    render(React.createElement(AuthScreen))
    expect(screen.getByText('Ingresar')).toBeInTheDocument()
  })

  it('renders email and password inputs', () => {
    render(React.createElement(AuthScreen))
    expect(screen.getByLabelText('Correo electronico')).toBeInTheDocument()
    expect(screen.getByLabelText('Contrasena')).toBeInTheDocument()
  })

  it('switches to register mode', () => {
    render(React.createElement(AuthScreen))
    fireEvent.click(screen.getByText('Registrarse'))
    expect(screen.getByText('Crear cuenta')).toBeInTheDocument()
  })

  it('shows company and CUIT fields in register mode', () => {
    render(React.createElement(AuthScreen))
    fireEvent.click(screen.getByText('Registrarse'))
    expect(screen.getByText(/Empresa/)).toBeInTheDocument()
    expect(screen.getByText(/CUIT/)).toBeInTheDocument()
  })

  it('email has demo pre-filled value', () => {
    render(React.createElement(AuthScreen))
    expect((screen.getByLabelText('Correo electronico') as HTMLInputElement).value).toBe('admin@empresademo.com.ar')
  })

  it('password is masked', () => {
    render(React.createElement(AuthScreen))
    expect((screen.getByLabelText('Contrasena') as HTMLInputElement).type).toBe('password')
  })
})
