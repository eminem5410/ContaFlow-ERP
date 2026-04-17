'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { AuthScreen } from '@/components/erp/AuthScreen'
import { ERPLayout } from '@/components/erp/ERPLayout'
import { DashboardView } from '@/components/erp/DashboardView'
import { AccountsView } from '@/components/erp/AccountsView'
import { JournalEntriesView } from '@/components/erp/JournalEntriesView'
import { ClientsView } from '@/components/erp/ClientsView'
import { ProvidersView } from '@/components/erp/ProvidersView'
import { InvoicesView } from '@/components/erp/InvoicesView'
import { PaymentsView } from '@/components/erp/PaymentsView'
import { BankAccountsView } from '@/components/erp/BankAccountsView'
import { ChequesView } from '@/components/erp/ChequesView'
import { ReportsView } from '@/components/erp/ReportsView'
import { AuditLogView } from '@/components/erp/AuditLogView'
import { UsersView } from '@/components/erp/UsersView'
import { SettingsView } from '@/components/erp/SettingsView'
import { RolesView } from '@/components/erp/RolesView'
import HelpView from '@/components/erp/HelpView'
import { PricingPage } from '@/components/erp/PricingPage'
import LandingPage from './landing/page'

export default function Home() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated)
  const currentView = useAppStore((s) => s.currentView)
  const hydrateFromStorage = useAppStore((s) => s.hydrateFromStorage)
  const _hasHydrated = useAppStore((s) => s._hasHydrated)
  const [hasMounted, setHasMounted] = useState(false)
  const [showLogin, setShowLogin] = useState(false)

  // Reset to landing when user logs out
  useEffect(() => {
    if (!isAuthenticated) setShowLogin(false)
  }, [isAuthenticated])

  // Hydrate auth state from localStorage on client mount only
  useEffect(() => {
    hydrateFromStorage()
    setHasMounted(true)
  }, [hydrateFromStorage])

  // Before client hydration completes, show branded loading screen
  if (!hasMounted || !_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 shadow-lg shadow-emerald-500/25 animate-pulse">
            <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
              <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
              <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
              <path d="M10 6h4" />
              <path d="M10 10h4" />
              <path d="M10 14h4" />
              <path d="M10 18h4" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-900 tracking-tight">ContaFlow</p>
            <p className="text-xs text-slate-400 mt-0.5">Cargando...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    if (showLogin) {
      return <AuthScreen onBack={() => setShowLogin(false)} />
    }
    return <LandingPage onLoginClick={() => setShowLogin(true)} />
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />
      case 'accounts':
        return <AccountsView />
      case 'journal-entries':
        return <JournalEntriesView />
      case 'clients':
        return <ClientsView />
      case 'providers':
        return <ProvidersView />
      case 'invoices':
        return <InvoicesView />
      case 'payments':
        return <PaymentsView />
      case 'bank-accounts':
        return <BankAccountsView />
      case 'cheques':
        return <ChequesView />
      case 'audit-log':
        return <AuditLogView />
      case 'reports':
        return <ReportsView />
      case 'users':
        return <UsersView />
      case 'roles':
        return <RolesView />
      case 'settings':
        return <SettingsView />
      case 'pricing':
        return <PricingPage />
      case 'help':
        return <HelpView />
      default:
        return <DashboardView />
    }
  }

  return (
    <ERPLayout>
      {renderView()}
    </ERPLayout>
  )
}
