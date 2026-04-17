import { Check, Sparkles } from "lucide-react"
import { PLANS } from "@/lib/plan-config"

const planMeta: Record<string, { popular?: boolean; badge?: string | null }> = {
  starter: { badge: null },
  growth: { popular: true, badge: "Popular" },
  profesional: { popular: true, badge: null },
  business: { badge: null },
  enterprise: { badge: null },
}

function formatPrice(price: number) {
  if (price === 0) return "$0"
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(price)
}

const planDescriptions: Record<string, string> = {
  starter: "Ideal para comenzar y conocer la plataforma.",
  growth: "Para PyMEs que necesitan facturacion y gestion de cobros.",
  profesional: "Para contadores y empresas con contabilidad completa.",
  business: "Para organizaciones que necesitan auditoria y roles avanzados.",
  enterprise: "Escalabilidad total con usuarios ilimitados y soporte dedicado.",
}

const planCtas: Record<string, string> = {
  starter: "Comenzar gratis",
  growth: "Comenzar ahora",
  profesional: "Elegir plan",
  business: "Elegir plan",
  enterprise: "Contactar",
}

export default function Pricing() {
  return (
    <section id="pricing" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">Precios</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Planes que crecen <span className="text-emerald-600">con tu negocio</span>
          </h2>
          <p className="mt-4 text-lg text-slate-500">Comenza gratis y escala cuando lo necesites. Sin costos ocultos ni sorpresas.</p>
        </div>
        <div className="mx-auto mt-16 grid max-w-7xl grid-cols-1 items-start gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Object.entries(PLANS).map(([pid, plan]) => {
            const m = planMeta[pid]
            return (
              <div
                key={pid}
                className={"relative rounded-2xl border p-6 transition-shadow " + (
                  m.popular
                    ? "border-emerald-300 bg-gradient-to-b from-emerald-50/80 to-white shadow-xl shadow-emerald-100/50 scale-[1.02]"
                    : "border-slate-200 bg-white shadow-sm hover:shadow-md"
                )}
              >
                {m.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-4 py-1 text-xs font-semibold text-white shadow-md">
                      <Sparkles className="h-3 w-3" />{m.badge}
                    </span>
                  </div>
                )}
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline justify-center">
                    <span className="text-3xl font-extrabold text-slate-900">{formatPrice(plan.price)}</span>
                    {plan.price > 0 && <span className="ml-1 text-base text-slate-500">/mes</span>}
                  </div>
                  <p className="mt-3 text-sm text-slate-500">{planDescriptions[pid]}</p>
                  <p className="mt-1 text-xs text-slate-400">Hasta {plan.maxUsers === -1 ? "ilimitados" : plan.maxUsers} usuarios</p>
                </div>
                <hr className="my-5 border-slate-100" />
                <ul className="space-y-2.5">
                  {plan.modules.map((mod) => (
                    <li key={mod} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      <span className="text-sm text-slate-600">{mod.charAt(0).toUpperCase() + mod.slice(1).replace(/-/g, " ")}</span>
                    </li>
                  ))}
                </ul>
                <a href="/" className={"mt-6 block w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all text-center " + (
                  m.popular
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                )}>
                  {planCtas[pid]}
                </a>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
