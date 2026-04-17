import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Receipt,
  CreditCard,
  BookCopy,
  BookMarked,
  Scale,
  BarChart3,
  ShieldCheck,
  ClipboardCheck,
  Users,
  Settings,
} from "lucide-react"

const modules = [
  { icon: LayoutDashboard, name: "Dashboard", description: "Vista general de la empresa" },
  { icon: BookOpen, name: "Plan de Cuentas", description: "Estructura contable" },
  { icon: FileText, name: "Asientos Contables", description: "Registro de movimientos" },
  { icon: Receipt, name: "Facturacion", description: "Facturas AFIP electronicas" },
  { icon: CreditCard, name: "Pagos / Cobros", description: "Gestion de cobros y pagos" },
  { icon: BookCopy, name: "Libro Diario", description: "Registro cronologico" },
  { icon: BookMarked, name: "Libro Mayor", description: "Saldos por cuenta" },
  { icon: Scale, name: "Balance General", description: "Estado de situacion patrimonial" },
  { icon: BarChart3, name: "Reportes", description: "Informes y exportaciones" },
  { icon: ShieldCheck, name: "Roles / Permisos", description: "Control de accesos" },
  { icon: ClipboardCheck, name: "Auditoria", description: "Historial de cambios" },
  { icon: Users, name: "Usuarios", description: "Administracion de accesos" },
  { icon: Settings, name: "Configuracion", description: "Ajustes generales" },
]

export default function Modules() {
  return (
    <section id="modules" className="bg-slate-50 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">
            Modulos
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            13 modulos para cubrir{" "}
            <span className="text-emerald-600">toda tu operacion</span>
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            Desde la configuracion inicial hasta la emision de facturas y la
            generacion de balances, ContaFlow lo tiene todo.
          </p>
        </div>

        {/* Module grid */}
        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
          {modules.map((mod) => {
            const Icon = mod.icon
            return (
              <div
                key={mod.name}
                className="flex items-start gap-4 rounded-xl border border-slate-200/80 bg-white p-5 transition-colors hover:border-emerald-200 hover:bg-emerald-50/30"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-emerald-100 hover:text-emerald-600">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {mod.name}
                  </h3>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {mod.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
