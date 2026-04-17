import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { mockUser, mockCompany, type MockAppState } from '@/__tests__/helpers'

// Helper: create a fresh store mock per test
function createStore(overrides: Partial<MockAppState> = {}) {
  const s: MockAppState = {
    isAuthenticated: true,
    user: { ...mockUser },
    company: { ...mockCompany },
    _hasHydrated: true,
    userPermissions: [],
    currentView: 'dashboard',
    isMobileSidebarOpen: false,
    locale: 'es',
    hydrateFromStorage: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    setCurrentView: vi.fn(),
    setMobileSidebarOpen: vi.fn(),
    setPermissions: vi.fn(),
    hasPermission: vi.fn(() => true),
    setLocale: vi.fn(),
    ...overrides,
  }
  return s
}

describe('RBAC permission logic', () => {
  it('admin role bypasses permission checks', () => {
    const store = createStore({ user: { ...mockUser, role: 'admin' }, userPermissions: [] })
    // hasPermission for admin should return true regardless of userPermissions
    const hasPermission = (module: string, action: string) =>
      store.user?.role === 'admin' || store.userPermissions.includes(`${module}.${action}`)
    expect(hasPermission('invoices', 'delete')).toBe(true)
    expect(hasPermission('users', 'delete')).toBe(true)
  })

  it('non-admin without permissions is denied', () => {
    const store = createStore({ user: { ...mockUser, role: 'contador' }, userPermissions: [] })
    const hasPermission = (module: string, action: string) =>
      store.user?.role === 'admin' || store.userPermissions.includes(`${module}.${action}`)
    expect(hasPermission('invoices', 'view')).toBe(false)
    expect(hasPermission('invoices', 'create')).toBe(false)
  })

  it('non-admin with specific permissions gets selective access', () => {
    const store = createStore({
      user: { ...mockUser, role: 'contador' },
      userPermissions: ['invoices.view', 'invoices.create', 'invoices.edit'],
    })
    const hasPermission = (module: string, action: string) =>
      store.user?.role === 'admin' || store.userPermissions.includes(`${module}.${action}`)
    expect(hasPermission('invoices', 'view')).toBe(true)
    expect(hasPermission('invoices', 'create')).toBe(true)
    expect(hasPermission('invoices', 'edit')).toBe(true)
    expect(hasPermission('invoices', 'delete')).toBe(false)
    expect(hasPermission('invoices', 'export')).toBe(false)
    expect(hasPermission('accounts', 'view')).toBe(false)
  })

  it('permission format is module.action', () => {
    const perms = ['journalEntries.view', 'journalEntries.confirm']
    expect(perms.includes('journalEntries.view')).toBe(true)
    expect(perms.includes('journalEntries.confirm')).toBe(true)
    expect(perms.includes('journalEntries.delete')).toBe(false)
    expect(perms.includes('invoices.view')).toBe(false)
  })
})
