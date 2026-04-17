import { create } from 'zustand'

interface User {
  id: string
  name: string
  email: string
  role: string
  companyId: string
  roleId: string | null
  accessToken?: string
  refreshToken?: string
  permissions?: string[]
}

interface Company {
  id: string
  name: string
  cuit?: string
  plan?: string
}

export type ViewType =
  | 'dashboard'
  | 'accounts'
  | 'journal-entries'
  | 'clients'
  | 'providers'
  | 'invoices'
  | 'payments'
  | 'bank-accounts'
  | 'cheques'
  | 'audit-log'
  | 'reports'
  | 'users'
  | 'roles'
  | 'settings'
  | 'pricing'
  | 'help'

interface AppState {
  // Auth
  isAuthenticated: boolean
  user: User | null
  company: Company | null
  _hasHydrated: boolean

  // Permissions
  userPermissions: string[]

  // Navigation
  currentView: ViewType
  isMobileSidebarOpen: boolean

  // i18n
  locale: 'es' | 'pt' | 'en'

  // Actions
  hydrateFromStorage: () => void
  login: (user: User, company: Company) => void
  logout: () => void
  setCurrentView: (view: ViewType) => void
  setMobileSidebarOpen: (open: boolean) => void
  setPermissions: (permissions: string[]) => void
  hasPermission: (module: string, action: string) => boolean
  setLocale: (locale: 'es' | 'pt' | 'en') => void
}

export const useAppStore = create<AppState>((set, get) => ({
  // Auth — always start unauthenticated to match SSR
  isAuthenticated: false,
  user: null,
  company: null,
  _hasHydrated: false,

  // Permissions
  userPermissions: [],

  // Navigation
  currentView: 'dashboard',
  isMobileSidebarOpen: false,

  // i18n
  locale: 'es' as 'es' | 'pt' | 'en',

  // Hydrate from localStorage (called from useEffect on client only)
  hydrateFromStorage: () => {
    try {
      const storedUser = localStorage.getItem('erp_user')
      const storedCompany = localStorage.getItem('erp_company')
      const storedLocale = localStorage.getItem('erp_locale')
      const user = storedUser ? JSON.parse(storedUser) : null
      const company = storedCompany ? JSON.parse(storedCompany) : null
      const locale = (storedLocale === 'es' || storedLocale === 'pt' || storedLocale === 'en') ? storedLocale : 'es'
      const currentView = (localStorage.getItem('erp_currentView') as ViewType) || 'dashboard'
      set({
        isAuthenticated: !!user,
        user,
        company,
        userPermissions: user?.permissions || [],
        locale,
        currentView,
        _hasHydrated: true,
      })
    } catch {
      set({ _hasHydrated: true })
    }
  },

  login: (user: User, company: Company) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('erp_user', JSON.stringify(user))
      localStorage.setItem('erp_company', JSON.stringify(company))
      if (user.accessToken) {
        localStorage.setItem('erp_access_token', JSON.stringify(user.accessToken))
      }
      if (user.refreshToken) {
        localStorage.setItem('erp_refresh_token', JSON.stringify(user.refreshToken))
      }
    }
    set({
      isAuthenticated: true,
      user,
      company,
      userPermissions: user.permissions || [],
    })
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('erp_user')
      localStorage.removeItem('erp_company')
      localStorage.removeItem('erp_access_token')
      localStorage.removeItem('erp_refresh_token')
    }
    set({
      isAuthenticated: false,
      user: null,
      company: null,
      userPermissions: [],
      currentView: 'dashboard',
    })
  },

  setCurrentView: (view: ViewType) => {
    if (typeof window !== 'undefined') localStorage.setItem('erp_currentView', view)
    set({ currentView: view, isMobileSidebarOpen: false })
  },

  setMobileSidebarOpen: (open: boolean) => {
    set({ isMobileSidebarOpen: open })
  },

  setPermissions: (permissions: string[]) => {
    set({ userPermissions: permissions })
  },

  hasPermission: (module: string, action: string) => {
    return (
      get().userPermissions.includes(`${module}.${action}`) ||
      get().user?.role === 'admin'
    )
  },

  setLocale: (locale: 'es' | 'pt' | 'en') => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('erp_locale', locale)
    }
    set({ locale })
  },
}))
