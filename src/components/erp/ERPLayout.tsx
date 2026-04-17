'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Users,
  Building2,
  Landmark,
  BarChart3,
  LogOut,
  Menu,
  ChevronRight,
  Building,
  Receipt,
  Wallet,
  Shield,
  ShieldCheck,
  Settings,
  UserCog,
  PanelLeftClose,
  PanelLeftOpen,
  HelpCircle,
  CreditCard,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useAppStore, type ViewType } from '@/lib/store'
import { getPlan } from '@/lib/plan-config'
import { useTranslation } from '@/i18n'
import { LanguageSwitcher } from '@/components/ui/language-switcher'

const navItems: { icon: typeof LayoutDashboard; labelKey: string; view: ViewType }[] = [
  { icon: LayoutDashboard, labelKey: 'nav.dashboard', view: 'dashboard' },
  { icon: BookOpen, labelKey: 'nav.accounts', view: 'accounts' },
  { icon: FileText, labelKey: 'nav.journalEntries', view: 'journal-entries' },
  { icon: Users, labelKey: 'nav.clients', view: 'clients' },
  { icon: Building2, labelKey: 'nav.providers', view: 'providers' },
  { icon: Receipt, labelKey: 'nav.invoices', view: 'invoices' },
  { icon: Wallet, labelKey: 'nav.payments', view: 'payments' },
  { icon: Landmark, labelKey: 'nav.bankAccounts', view: 'bank-accounts' },
  { icon: CreditCard, labelKey: 'nav.cheques', view: 'cheques' },
  { icon: Shield, labelKey: 'nav.auditLog', view: 'audit-log' },
  { icon: BarChart3, labelKey: 'nav.reports', view: 'reports' },
  { icon: UserCog, labelKey: 'nav.users', view: 'users' },
  { icon: ShieldCheck, labelKey: 'nav.roles', view: 'roles' },
  { icon: Settings, labelKey: 'nav.settings', view: 'settings' },
  { icon: CreditCard, labelKey: 'nav.pricing', view: 'pricing' },
  { icon: HelpCircle, labelKey: 'nav.help', view: 'help' },
]

function SidebarContent({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const currentView = useAppStore((s) => s.currentView)
  const setCurrentView = useAppStore((s) => s.setCurrentView)
  const user = useAppStore((s) => s.user)
  const company = useAppStore((s) => s.company)
  const logout = useAppStore((s) => s.logout)
  const { t } = useTranslation()
  const plan = getPlan(company?.plan || 'starter')
  const alwaysAllowed = ['dashboard','users','roles','settings','pricing','help']
  const allowedNav = navItems.filter(i => alwaysAllowed.includes(i.view) || plan.modules.includes(i.view))

  const handleNav = (view: ViewType) => {
    setCurrentView(view)
    onNavigate?.()
  }

  return (
    <div className="flex h-full flex-col bg-slate-900">
      {/* Logo */}
      <div className={`flex h-16 items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-6'}`}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 shadow-lg shadow-emerald-500/20">
          <Building className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white tracking-tight">ContaFlow</span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest">ERP Contable</span>
          </div>
        )}
      </div>

      <Separator className="bg-slate-800" />

      {/* Company badge */}
      <div className={collapsed ? 'px-2 py-3' : 'px-4 py-3'}>
        {collapsed ? (
          <div className="flex justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/50">
              <Building2 className="h-3.5 w-3.5 text-slate-300" />
            </div>
          </div>
        ) : (
          <Badge variant="outline" className="w-full justify-center border-slate-700 text-slate-300 text-xs font-normal bg-slate-800/50 hover:bg-slate-800">
            <Building2 className="mr-1.5 h-3 w-3" />
            {company?.name || 'Empresa'} · {plan.name}
          </Badge>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3">
        <nav className="space-y-1 py-2">
          {allowedNav.map((item) => {
            const isActive = currentView === item.view
            return (
              <button
                key={item.view}
                onClick={() => handleNav(item.view)}
                title={collapsed ? t(item.labelKey) : undefined}
                className={`group flex w-full items-center gap-3 rounded-lg ${collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'} text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <item.icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                {!collapsed && (
                  <span className="flex-1 text-left">{t(item.labelKey)}</span>
                )}
                {!collapsed && isActive && (
                  <motion.div
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </motion.div>
                )}
              </button>
            )
          })}
        </nav>
      </ScrollArea>

      <Separator className="bg-slate-800" />

      {/* User section */}
      <div className={collapsed ? 'p-2' : 'p-4'}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <Avatar className="h-8 w-8 border border-slate-700">
              <AvatarFallback className="bg-emerald-600 text-white text-xs font-semibold">
                {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
              </AvatarFallback>
            </Avatar>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
              aria-label="Cerrar sesion"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-lg bg-slate-800/50 p-2.5">
            <Avatar className="h-8 w-8 border border-slate-700">
              <AvatarFallback className="bg-emerald-600 text-white text-xs font-semibold">
                {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name || 'Usuario'}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email || ''}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10 shrink-0"
              aria-label="Cerrar sesion"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function MobileSidebar() {
  const isMobileSidebarOpen = useAppStore((s) => s.isMobileSidebarOpen)
  const setMobileSidebarOpen = useAppStore((s) => s.setMobileSidebarOpen)

  return (
    <Sheet open={isMobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
      <SheetContent side="left" className="p-0 w-72 bg-slate-900 border-slate-800">
        <SidebarContent onNavigate={() => setMobileSidebarOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}

const viewTitleKeys: Record<ViewType, string> = {
  dashboard: 'nav.dashboard',
  accounts: 'nav.accounts',
  'journal-entries': 'nav.journalEntries',
  clients: 'nav.clients',
  providers: 'nav.providers',
  invoices: 'nav.invoices',
  payments: 'nav.payments',
  'bank-accounts': 'nav.bankAccounts',
  cheques: 'nav.cheques',
  'audit-log': 'nav.auditLog',
  reports: 'nav.reports',
  users: 'nav.users',
  roles: 'nav.roles',
  settings: 'nav.settings',
  help: 'nav.help',
  pricing: 'nav.pricing',
}

export function ERPLayout({ children }: { children: React.ReactNode }) {
  const currentView = useAppStore((s) => s.currentView)
  const setMobileSidebarOpen = useAppStore((s) => s.setMobileSidebarOpen)
  const company = useAppStore((s) => s.company)
  const user = useAppStore((s) => s.user)
  const { t } = useTranslation()
  const plan = getPlan(company?.plan || 'starter')
  const alwaysAllowed = ['dashboard','users','roles','settings','pricing','help']
  const allowedNav = navItems.filter(i => alwaysAllowed.includes(i.view) || plan.modules.includes(i.view))
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex lg:shrink-0 lg:flex-col lg:fixed lg:inset-y-0 transition-all duration-300 ${sidebarCollapsed ? 'lg:w-[70px]' : 'lg:w-64'}`}>
        <SidebarContent collapsed={sidebarCollapsed} />
      </aside>

      {/* Mobile Sidebar */}
      <MobileSidebar />

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-[70px]' : 'lg:pl-64'}`}>
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white/80 backdrop-blur-md px-4 md:px-6">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Abrir menu de navegacion"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Sidebar collapse toggle — desktop only */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-4.5 w-4.5" /> : <PanelLeftClose className="h-4.5 w-4.5" />}
          </Button>

          {/* Page title */}
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-slate-900">{t(viewTitleKeys[currentView])}</h1>
          </div>

          {/* Company badge */}
          <Badge variant="outline" className="hidden sm:flex border-slate-200 text-slate-600 bg-slate-50">
            <Building2 className="mr-1.5 h-3 w-3" />
            {company?.name || 'Empresa'}
          </Badge>

          {/* Language switcher */}
          <LanguageSwitcher />

          {/* User avatar */}
          <Avatar className="h-8 w-8 border border-slate-200">
            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">
              {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
            </AvatarFallback>
          </Avatar>
        </header>

        {/* Page content */}
        <main className="p-4 md:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
