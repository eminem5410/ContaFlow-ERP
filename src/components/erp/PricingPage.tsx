'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { PLANS } from '@/lib/plan-config'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Loader2, CreditCard, Zap, Building2, ShieldCheck, Rocket, Sparkles } from 'lucide-react'

const moduleLabels: Record<string, string> = {
  clients: 'Clientes', invoices: 'Facturacion', providers: 'Proveedores',
  payments: 'Pagos y Cobros', 'bank-accounts': 'Cuentas Bancarias',
  users: 'Gestion de Usuarios', accounts: 'Plan Contable',
  'journal-entries': 'Asientos Contables', reports: 'Reportes',
  'audit-log': 'Auditoria', roles: 'Roles y Permisos', settings: 'Configuracion',
}

const planMeta: Record<string, { icon: any; popular?: boolean }> = {
  starter: { icon: CreditCard },
  growth: { icon: Zap, popular: true },
  profesional: { icon: Building2, popular: true },
  business: { icon: ShieldCheck },
  enterprise: { icon: Rocket },
}

function formatPrice(p: number) {
  if (p === 0) return 'Gratis'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(p)
}

export function PricingPage() {
  const company = useAppStore((s) => s.company)
  const user = useAppStore((s) => s.user)
  const currentPlan = company?.plan === 'basico' ? 'starter' : (company?.plan || 'starter')
  const [loading, setLoading] = useState<string | null>(null)

  const buy = async (pid: string) => {
    if (!company || !user) return
    setLoading(pid)
    try {
      const r = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: pid, companyId: company.id, userEmail: user.email }),
      })
      const d = await r.json()
      if (r.ok) {
        if (d.initPoint) window.location.href = d.initPoint
        else if (d.message) {
          useAppStore.getState().login(user, { ...company, plan: pid })
          window.location.reload()
        }
      } else { alert(d.error || 'Error') }
    } catch { alert('Error de conexion') }
    finally { setLoading(null) }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-slate-900">Planes y Precios</h2>
        <p className="text-slate-500">Elegi el plan que mejor se adapte a tu negocio. Podes cambiar en cualquier momento.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {Object.entries(PLANS).map(([pid, plan]) => {
          const m = planMeta[pid]
          const cur = currentPlan === pid
          const Ic = m.icon
          return (
            <Card key={pid} className={"relative flex flex-col " + (cur ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-slate-200")}>
              {m.popular && !cur && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-emerald-600 text-white"><Sparkles className="mr-1 h-3 w-3"/>Popular</Badge>
                </div>
              )}
              {cur && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-slate-900 text-white">Plan actual</Badge>
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                  <Ic className="h-5 w-5 text-emerald-600"/>
                </div>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-slate-900">{formatPrice(plan.price)}</span>
                  {plan.price > 0 && <span className="text-sm text-slate-400 ml-1">/mes</span>}
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                <p className="text-sm text-slate-500 text-center">Hasta {plan.maxUsers === -1 ? 'ilimitados' : plan.maxUsers} usuarios</p>
                <div className="space-y-1.5">
                  {plan.modules.map((mod) => (
                    <div key={mod} className="flex items-center gap-2 text-sm text-slate-600">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0"/>
                      <span>{moduleLabels[mod] || mod}</span>
                    </div>
                  ))}
                </div>
                <Button
                  className="w-full mt-4"
                  variant={cur ? "outline" : "default"}
                  disabled={cur || loading === pid}
                  onClick={() => buy(pid)}
                >
                  {loading === pid && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                  {cur ? 'Plan actual' : plan.price === 0 ? 'Activar gratis' : 'Comprar'}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
