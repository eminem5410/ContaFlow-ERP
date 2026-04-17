import { vi, type Mock } from 'vitest'
import React from 'react'

export const mockUser = {
  id: 'usr-1', name: 'Admin Demo', email: 'admin@empresademo.com.ar',
  role: 'admin', companyId: 'cmp-1', roleId: 'rol-1',
  accessToken: 'fake-token', refreshToken: 'fake-refresh', permissions: [],
}

export const mockCompany = {
  id: 'cmp-1', name: 'Empresa Demo S.R.L.', cuit: '30-12345678-9',
}

export interface MockAppState {
  isAuthenticated: boolean
  user: typeof mockUser | null
  company: typeof mockCompany | null
  _hasHydrated: boolean
  userPermissions: string[]
  currentView: string
  isMobileSidebarOpen: boolean
  locale: 'es' | 'pt' | 'en'
  hydrateFromStorage: Mock
  login: Mock
  logout: Mock
  setCurrentView: Mock
  setMobileSidebarOpen: Mock
  setPermissions: Mock
  hasPermission: Mock
  setLocale: Mock
}
