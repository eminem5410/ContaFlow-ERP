"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import {
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  Home,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

function PaymentResultContent() {
  const searchParams = useSearchParams()
  const status = searchParams.get("status") || "pending"
  const preferenceId = searchParams.get("preference_id") || ""
  const planId = searchParams.get("plan") || ""

  const isSuccess = status === "success"
  const isFailure = status === "failure"
  const isPending = status === "pending"

  const title = isSuccess
    ? "Pago realizado con exito"
    : isFailure
      ? "El pago fue rechazado"
      : "Pago pendiente"

  const subtitle = isSuccess
    ? "Tu plan se activo correctamente. Ya puedes acceder a todas las funcionalidades."
    : isFailure
      ? "No pudimos procesar tu pago. Intenta nuevamente con otro medio de pago."
      : "Tu pago esta siendo procesado. Te enviaremos una notificacion cuando se confirme."

  const badgeVariant = isSuccess ? "default" : isFailure ? "destructive" : "secondary"
  const badgeLabel = isSuccess ? "Aprobado" : isFailure ? "Rechazado" : "Pendiente"
  const colorClass = isSuccess ? "text-emerald-600" : isFailure ? "text-red-600" : "text-amber-600"
  const bgClass = isSuccess ? "bg-emerald-50" : isFailure ? "bg-red-50" : "bg-amber-50"
  const borderClass = isSuccess ? "border-emerald-200" : isFailure ? "border-red-200" : "border-amber-200"

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-slate-200">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">CF</span>
            </div>
            <span className="font-semibold text-slate-800">ContaFlow</span>
          </div>
        </div>

        {/* Result Card */}
        <Card className={["border-2 shadow-lg", borderClass].join(" ")}>
          <CardHeader className="text-center pb-4">
            <div className={["mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4", bgClass].join(" ")}>
              {isSuccess && <CheckCircle2 className={["w-10 h-10", colorClass].join(" ")} />}
              {isFailure && <XCircle className={["w-10 h-10", colorClass].join(" ")} />}
              {isPending && <Clock className={["w-10 h-10", colorClass].join(" ")} />}
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">
              {title}
            </CardTitle>
            <p className="text-slate-500 mt-2 text-sm leading-relaxed">
              {subtitle}
            </p>
            <div className="mt-3">
              <Badge variant={badgeVariant} className="text-sm px-3 py-1">
                {badgeLabel}
              </Badge>
            </div>
          </CardHeader>

          <CardContent>
            {/* Payment details */}
            {(preferenceId || planId) && (
              <>
                <Separator className="my-4" />
                <div className="space-y-3 text-sm">
                  {preferenceId && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Referencia:</span>
                      <span className="font-mono text-slate-700">{preferenceId.substring(0, 12)}...</span>
                    </div>
                  )}
                  {planId && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Plan:</span>
                      <span className="font-medium text-slate-700 capitalize">{planId}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Fecha:</span>
                    <span className="text-slate-700">
                      {new Date().toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </>
            )}

            <Separator className="my-4" />

            {/* Status info */}
            {isSuccess && (
              <div className={["rounded-lg p-4 text-sm text-slate-700", bgClass].join(" ")}>
                <p className="font-medium mb-1">Todo listo para trabajar</p>
                <p className="text-slate-500">
                  Inicia sesion y disfruta de todas las funcionalidades de tu nuevo plan.
                  Los nuevos modulos estaran disponibles en el menu lateral.
                </p>
              </div>
            )}

            {isFailure && (
              <div className={["rounded-lg p-4 text-sm text-slate-700", bgClass].join(" ")}>
                <p className="font-medium mb-1">Posibles causas:</p>
                <div className="text-slate-500 space-y-1 mt-1 ml-4">
                  <p>- Fondos insuficientes en tu tarjeta</p>
                  <p>- Tarjeta vencida o rechazada por el banco</p>
                  <p>- Error temporal del procesador de pagos</p>
                </div>
              </div>
            )}

            {isPending && (
              <div className={["rounded-lg p-4 text-sm text-slate-700", bgClass].join(" ")}>
                <p className="font-medium mb-1">El pago puede tardar hasta 48hs</p>
                <p className="text-slate-500">
                  Si pagaste con transferencia bancaria o rapipago, la acreditacion
                  puede demorar. Tu plan se activara automaticamente al confirmarse.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 space-y-3">
              <a href="/">
                <Button className="w-full" variant="default" size="lg">
                  <Home className="w-4 h-4 mr-2" />
                  Ir al ERP
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </a>
              {isFailure && (
                <a href="/pricing">
                  <Button className="w-full bg-white" variant="outline" size="lg">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reintentar pago
                  </Button>
                </a>
              )}
              {isPending && (
                <a href={["/payments/result?status=pending&preference_id=", preferenceId, "&plan=", planId].join("")}>
                  <Button className="w-full bg-white" variant="outline" size="lg">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Verificar estado
                  </Button>
                </a>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-400 mt-6">
          Si tenes problemas con tu pago, contactanos a soporte@contaflow.com.ar
        </p>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-slate-500">Verificando pago...</p>
      </div>
    </div>
  )
}

export default function PaymentResultPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PaymentResultContent />
    </Suspense>
  )
}
