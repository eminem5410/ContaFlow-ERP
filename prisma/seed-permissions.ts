/**
 * Default permissions for ContaFlow ERP
 *
 * Modules: accounts, journal-entries, clients, providers, invoices,
 *          payments, bank-accounts, reports, users, roles, settings, audit-log
 * Actions: view, create, edit, delete (all modules)
 *          confirm (journal-entries), export (reports)
 */

export interface SeedPermission {
  module: string
  action: string
  description: string
}

// Base CRUD actions for every module
const BASE_ACTIONS = ["view", "create", "edit", "delete"] as const

const MODULES: { module: string; extraActions?: string[] }[] = [
  { module: "accounts" },
  { module: "journal-entries", extraActions: ["confirm"] },
  { module: "clients" },
  { module: "providers" },
  { module: "invoices" },
  { module: "payments" },
  { module: "bank-accounts" },
  { module: "reports", extraActions: ["export"] },
  { module: "users" },
  { module: "roles" },
  { module: "settings" },
  { module: "audit-log" },
]

const ACTION_DESCRIPTIONS: Record<string, string> = {
  view: "Ver/consultar",
  create: "Crear/nuevo",
  edit: "Editar/modificar",
  delete: "Eliminar",
  confirm: "Confirmar/asentar",
  export: "Exportar/descargar",
}

const MODULE_DISPLAY_NAMES: Record<string, string> = {
  accounts: "Plan de Cuentas",
  "journal-entries": "Asientos Contables",
  clients: "Clientes",
  providers: "Proveedores",
  invoices: "Facturación",
  payments: "Pagos/Cobros",
  "bank-accounts": "Cuentas Bancarias",
  reports: "Reportes",
  users: "Usuarios",
  roles: "Roles y Permisos",
  settings: "Configuración",
  "audit-log": "Registro de Auditoría",
}

function buildPermissions(): SeedPermission[] {
  const permissions: SeedPermission[] = []

  for (const { module, extraActions } of MODULES) {
    const actions = [...BASE_ACTIONS, ...(extraActions ?? [])]

    for (const action of actions) {
      const moduleDisplay = MODULE_DISPLAY_NAMES[module] ?? module
      const actionDisplay = ACTION_DESCRIPTIONS[action] ?? action

      permissions.push({
        module,
        action,
        description: `${moduleDisplay} – ${actionDisplay}`,
      })
    }
  }

  return permissions
}

export const DEFAULT_PERMISSIONS: SeedPermission[] = buildPermissions()

// Convenience: total count for verification
export const PERMISSION_COUNT = DEFAULT_PERMISSIONS.length
