export interface PlanDef {
  name: string
  price: number
  maxUsers: number
  modules: string[]
  permissions: Array<{ module: string; actions: string[] }>
}

export const PLANS: Record<string, PlanDef> = {
  starter: {
    name: 'Starter', price: 0, maxUsers: 1,
    modules: ['clients', 'invoices'],
    permissions: [
      { module: 'clients', actions: ['view', 'create', 'edit'] },
      { module: 'invoices', actions: ['view', 'create', 'edit'] },
    ],
  },
  growth: {
    name: 'Growth', price: 25000, maxUsers: 3,
    modules: ['clients', 'invoices', 'providers', 'payments', 'bank-accounts', 'cheques', 'users'],
    permissions: [
      { module: 'clients', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'invoices', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'providers', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'payments', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'bank-accounts', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'cheques', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'users', actions: ['view', 'create', 'edit'] },
    ],
  },
  profesional: {
    name: 'Profesional', price: 70000, maxUsers: 10,
    modules: ['clients', 'invoices', 'providers', 'payments', 'bank-accounts', 'cheques', 'users', 'accounts', 'journal-entries', 'reports'],
    permissions: [
      { module: 'clients', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'invoices', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'providers', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'payments', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'bank-accounts', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'cheques', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'users', actions: ['view', 'create', 'edit'] },
      { module: 'accounts', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'journal-entries', actions: ['view', 'create', 'edit', 'delete', 'confirm'] },
      { module: 'reports', actions: ['view', 'create', 'edit', 'export'] },
    ],
  },
  business: {
    name: 'Business', price: 140000, maxUsers: 25,
    modules: ['clients', 'invoices', 'providers', 'payments', 'bank-accounts', 'cheques', 'users', 'accounts', 'journal-entries', 'reports', 'audit-log', 'roles', 'settings'],
    permissions: [
      { module: 'clients', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'invoices', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'providers', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'payments', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'bank-accounts', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'cheques', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'users', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'accounts', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'journal-entries', actions: ['view', 'create', 'edit', 'delete', 'confirm'] },
      { module: 'reports', actions: ['view', 'create', 'edit', 'export'] },
      { module: 'audit-log', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'roles', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'settings', actions: ['view', 'create', 'edit', 'delete'] },
    ],
  },
  enterprise: {
    name: 'Enterprise', price: 250000, maxUsers: -1,
    modules: ['clients', 'invoices', 'providers', 'payments', 'bank-accounts', 'cheques', 'users', 'accounts', 'journal-entries', 'reports', 'audit-log', 'roles', 'settings'],
    permissions: [
      { module: 'clients', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'invoices', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'providers', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'payments', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'bank-accounts', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'cheques', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'users', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'accounts', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'journal-entries', actions: ['view', 'create', 'edit', 'delete', 'confirm'] },
      { module: 'reports', actions: ['view', 'create', 'edit', 'export'] },
      { module: 'audit-log', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'roles', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'settings', actions: ['view', 'create', 'edit', 'delete'] },
    ],
  },
}

export function getPlan(planId: string): PlanDef {
  if (planId === 'basico') return PLANS.starter
  return PLANS[planId] || PLANS.starter
}

export function isPermAllowed(planId: string, mod: string, act: string): boolean {
  const plan = getPlan(planId)
  const p = plan.permissions.find(x => x.module === mod)
  return p ? p.actions.includes(act) : false
}
