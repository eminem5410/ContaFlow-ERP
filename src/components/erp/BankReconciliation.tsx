"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { useAppStore } from "@/lib/store"
import { api } from "@/lib/api"
import { formatCurrency, formatDate } from "@/lib/formatters"

interface ReconcileData {
  bankAccount: {
    id: string
    name: string
    bank: string | null
    number: string | null
    balance: number
  }
  payments: Array<{
    id: string
    number: string
    date: string
    amount: number
    method: string
    type: string
    reference: string | null
    notes: string | null
    client: { name: string } | null
    provider: { name: string } | null
    invoice: { number: string } | null
  }>
  cheques: Array<{
    id: string
    number: string
    amount: number
    status: string
    issueDate: string
  }>
  totalIngresos: number
  totalEgresos: number
  totalCheques: number
  netMovement: number
  bookBalance: number
}

interface BankReconciliationProps {
  bankAccountId: string
  bankAccountName: string
  onBack: () => void
}

export function BankReconciliation({ bankAccountId, bankAccountName, onBack }: BankReconciliationProps) {
  const companyId = useAppStore((s) => s.user?.companyId)
  const today = new Date().toISOString().split("T")[0]
  const firstOfMonth = today.split("-")[0] + "-" + today.split("-")[1] + "-01"
  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo] = useState(today)
  const [bankBalance, setBankBalance] = useState("")

  const { data, isLoading } = useQuery<ReconcileData>({
    queryKey: ["reconciliation", bankAccountId, companyId, from, to],
    queryFn: function () {
      return api.get("/api/bank-accounts/" + bankAccountId + "/reconcile", {
        companyId: companyId,
        from: from || undefined,
        to: to || undefined,
      })
    },
    enabled: !!companyId && !!bankAccountId,
  })

  const bookBal = data?.bookBalance || 0
  const bankBal = bankBalance ? parseFloat(bankBalance) : 0
  const difference = bankBalance ? bookBal - bankBal : 0
  const isBalanced = bankBalance ? Math.abs(difference) < 0.01 : false

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver
        </Button>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Conciliacion: {bankAccountName}
          </h2>
          <p className="text-sm text-slate-500">
            Compara tu saldo contable con el extracto bancario
          </p>
        </div>
      </div>

      {/* Date filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-end gap-4">
            <div className="space-y-2 flex-1">
              <Label>Desde</Label>
              <Input type="date" value={from} onChange={function (e) { setFrom(e.target.value) }} />
            </div>
            <div className="space-y-2 flex-1">
              <Label>Hasta</Label>
              <Input type="date" value={to} onChange={function (e) { setTo(e.target.value) }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !data ? (
        <p className="text-slate-400 text-center py-12">No hay datos</p>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-emerald-200 bg-emerald-50/50">
              <CardContent className="p-4">
                <p className="text-xs text-emerald-600 uppercase tracking-wider font-medium">Total Ingresos</p>
                <p className="text-xl font-bold text-emerald-700 mt-1">{formatCurrency(data.totalIngresos)}</p>
                <p className="text-xs text-emerald-500 mt-1">
                  {data.payments.filter(function (p) { return p.type === "cobro" }).length} cobros
                </p>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50/50">
              <CardContent className="p-4">
                <p className="text-xs text-red-600 uppercase tracking-wider font-medium">Total Egresos</p>
                <p className="text-xl font-bold text-red-700 mt-1">{formatCurrency(data.totalEgresos)}</p>
                <p className="text-xs text-red-500 mt-1">
                  {data.payments.filter(function (p) { return p.type === "pago" }).length} pagos
                </p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="p-4">
                <p className="text-xs text-blue-600 uppercase tracking-wider font-medium">Saldo Libros</p>
                <p className="text-xl font-bold text-blue-700 mt-1">{formatCurrency(data.bookBalance)}</p>
                <p className="text-xs text-blue-500 mt-1">Segun sistema</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-slate-50/50">
              <CardContent className="p-4">
                <p className="text-xs text-slate-600 uppercase tracking-wider font-medium">Saldo Bancario</p>
                <Input
                  type="number"
                  placeholder="Ingrese saldo del extracto"
                  value={bankBalance}
                  onChange={function (e) { setBankBalance(e.target.value) }}
                  className="mt-1 text-lg font-bold font-mono h-8"
                />
              </CardContent>
            </Card>
          </div>

          {/* Reconciliation result */}
          {bankBalance && (
            <Card className={isBalanced ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isBalanced ? (
                      <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-600" />
                    )}
                    <div>
                      <p className="font-semibold text-slate-900">
                        {isBalanced ? "Conciliacion cuadrada" : "Diferencia encontrada"}
                      </p>
                      <p className="text-sm text-slate-500">
                        Libros: {formatCurrency(bookBal)} - Banco: {formatCurrency(bankBal)}
                      </p>
                    </div>
                  </div>
                  {!isBalanced && (
                    <div className="text-right">
                      <p className="text-2xl font-bold font-mono text-red-700">
                        {formatCurrency(difference)}
                      </p>
                      <p className="text-xs text-red-500">Diferencia</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Movements table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Movimientos del Periodo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider w-24">Fecha</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider w-20">Tipo</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider w-24">Numero</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Concepto</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Tercero</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider w-28">Debe</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider w-28">Haber</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.payments.length === 0 && data.cheques.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-slate-400 text-sm">
                          No hay movimientos en el periodo seleccionado
                        </td>
                      </tr>
                    ) : (
                      data.payments.map(function (payment) {
                        var isIncome = payment.type === "cobro"
                        var thirdParty = isIncome
                          ? (payment.client ? payment.client.name : "—")
                          : (payment.provider ? payment.provider.name : "—")
                        return (
                          <tr key={payment.id} className="border-b border-slate-50 hover:bg-slate-50">
                            <td className="px-4 py-2.5 text-sm text-slate-600">{formatDate(payment.date)}</td>
                            <td className="px-4 py-2.5 text-sm">
                              <Badge className={["text-[10px]", isIncome ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"].join(" ")}>
                                {isIncome ? "Cobro" : "Pago"}
                              </Badge>
                            </td>
                            <td className="px-4 py-2.5 text-sm font-mono text-slate-500">{payment.number}</td>
                            <td className="px-4 py-2.5 text-sm text-slate-700">{payment.notes || payment.reference || payment.method}</td>
                            <td className="px-4 py-2.5 text-sm text-slate-600">{thirdParty}</td>
                            <td className="px-4 py-2.5 text-sm text-right font-mono text-emerald-700">
                              {isIncome ? formatCurrency(payment.amount) : ""}
                            </td>
                            <td className="px-4 py-2.5 text-sm text-right font-mono text-red-700">
                              {!isIncome ? formatCurrency(payment.amount) : ""}
                            </td>
                          </tr>
                        )
                      })
                    )}
                    {data.cheques.length > 0 && (
                      <>
                        <tr>
                          <td colSpan={7} className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider bg-blue-50 border-b border-blue-200">
                            Cheques ({data.cheques.length})
                          </td>
                        </tr>
                        {data.cheques.map(function (cheque) {
                          return (
                            <tr key={cheque.id} className="border-b border-slate-50 hover:bg-slate-50">
                              <td className="px-4 py-2.5 text-sm text-slate-600">{formatDate(cheque.issueDate)}</td>
                              <td className="px-4 py-2.5 text-sm">
                                <Badge className="text-[10px] bg-blue-100 text-blue-700">
                                  Cheque
                                </Badge>
                              </td>
                              <td className="px-4 py-2.5 text-sm font-mono text-slate-500">{cheque.number}</td>
                              <td className="px-4 py-2.5 text-sm text-slate-700">Cheque Nro {cheque.number}</td>
                              <td className="px-4 py-2.5 text-sm text-slate-600">—</td>
                              <td className="px-4 py-2.5 text-sm text-right font-mono text-emerald-700">
                                {cheque.status === "depositado" || cheque.status === "cobrado" ? formatCurrency(cheque.amount) : ""}
                              </td>
                              <td className="px-4 py-2.5 text-sm text-right font-mono text-slate-400">—</td>
                            </tr>
                          )
                        })}
                      </>
                    )}
                  </tbody>
                  {data.payments.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-slate-300 bg-slate-50">
                        <td colSpan={5} className="px-4 py-3 text-sm font-bold text-slate-700 text-right">Totales:</td>
                        <td className="px-4 py-3 text-sm text-right font-mono font-bold text-emerald-700">
                          {formatCurrency(data.totalIngresos)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-mono font-bold text-red-700">
                          {formatCurrency(data.totalEgresos)}
                        </td>
                      </tr>
                      <tr className="border-t border-slate-200 bg-slate-50">
                        <td colSpan={5} className="px-4 py-2 text-sm font-bold text-slate-700 text-right">Movimiento Neto:</td>
                        <td colSpan={2} className="px-4 py-2 text-sm text-right font-mono font-bold text-slate-900">
                          {formatCurrency(data.netMovement)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
