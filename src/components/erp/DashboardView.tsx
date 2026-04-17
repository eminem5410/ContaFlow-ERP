'use client'

import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  FileText,
  Clock,
  Banknote,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  Wallet,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts'
import { useAppStore } from '@/lib/store'
import { api } from '@/lib/api'
import { formatCurrency, getAccountTypeColor, getAccountTypeLabel, formatDate } from '@/lib/formatters'
import { useTranslation } from '@/i18n'

interface DashboardData {
  totalAssets: number
  totalLiabilities: number
  totalEquity: number
  totalRevenue: number
  totalExpenses: number
  netIncome: number
  totalClients: number
  totalProviders: number
  pendingEntries: number
  pendingInvoices: number
  totalInvoiced: number
  totalCollected: number
  recentEntries: Array<{
    id: string
    number: number
    date: string
    description: string
    status: string
    total: number
  }>
  monthlyData: Array<{
    month: string
    year: number
    ingresos: number
    egresos: number
  }>
  chequeStats: {
    enCartera: { count: number; total: number }
    depositados: { count: number; total: number }
    cobrados: { count: number; total: number }
    rechazados: { count: number; total: number }
    endosados: { count: number; total: number }
    anulados: { count: number; total: number }
  }
  accountBalances: Array<{
    id: string
    code: string
    name: string
    type: string
    balance: number
  }>
}

export function DashboardView() {
  const { t } = useTranslation()
  const companyId = useAppStore((s) => s.user?.companyId)

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard', companyId],
    queryFn: () => api.get('/api/dashboard', { companyId: companyId! }),
    enabled: !!companyId,
  })

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-500">{t('common.noData')}</p>
      </div>
    )
  }

  const kpiCards = [
    {
      title: t('dashboard.totalIncome'),
      value: data.totalInvoiced,
      icon: Receipt,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      title: t('dashboard.balance'),
      value: data.totalCollected,
      icon: Wallet,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
    },
    {
      title: t('dashboard.totalExpenses'),
      value: data.totalExpenses,
      icon: ArrowUpRight,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
    },
    {
      title: t('dashboard.pendingInvoices'),
      value: data.pendingInvoices,
      icon: ArrowDownRight,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
  ]

  const statusColors: Record<string, string> = {
    borrador: 'bg-yellow-100 text-yellow-700',
    confirmado: 'bg-emerald-100 text-emerald-700',
    anulado: 'bg-red-100 text-red-700',
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title} className={`border ${kpi.borderColor} ${kpi.bgColor} overflow-hidden`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{kpi.title}</p>
                  <p className="text-2xl font-bold text-slate-900">{formatCurrency(kpi.value)}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm ${kpi.color}`}>
                  <kpi.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cheques Summary Cards */}
      {data.chequeStats && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Banknote className="w-4 h-4" />
              Cheques
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Card className="border-blue-200 bg-blue-50 overflow-hidden">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-blue-600 uppercase">En Cartera</p>
                <p className="text-lg font-bold text-slate-900 mt-1">{data.chequeStats.enCartera.count}</p>
                <p className="text-xs text-slate-500">{formatCurrency(data.chequeStats.enCartera.total)}</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50 overflow-hidden">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-amber-600 uppercase">Depositados</p>
                <p className="text-lg font-bold text-slate-900 mt-1">{data.chequeStats.depositados.count}</p>
                <p className="text-xs text-slate-500">{formatCurrency(data.chequeStats.depositados.total)}</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 bg-emerald-50 overflow-hidden">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-emerald-600 uppercase">Cobrados</p>
                <p className="text-lg font-bold text-slate-900 mt-1">{data.chequeStats.cobrados.count}</p>
                <p className="text-xs text-slate-500">{formatCurrency(data.chequeStats.cobrados.total)}</p>
              </CardContent>
            </Card>
            <Card className="border-purple-200 bg-purple-50 overflow-hidden">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-purple-600 uppercase">Endosados</p>
                <p className="text-lg font-bold text-slate-900 mt-1">{data.chequeStats.endosados.count}</p>
                <p className="text-xs text-slate-500">{formatCurrency(data.chequeStats.endosados.total)}</p>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50 overflow-hidden">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-red-600 uppercase">Rechazados</p>
                <p className="text-lg font-bold text-slate-900 mt-1">{data.chequeStats.rechazados.count}</p>
                <p className="text-xs text-slate-500">{formatCurrency(data.chequeStats.rechazados.total)}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Second Row: Chart + Recent Entries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Flow Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{t('dashboard.monthlyChart')}</CardTitle>
            <CardDescription>{t('dashboard.totalIncome')} vs {t('dashboard.totalExpenses')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelStyle={{ color: '#334155', fontWeight: 600 }}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ingresos"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#10b981' }}
                    name={t('dashboard.totalIncome')}
                  />
                  <Line
                    type="monotone"
                    dataKey="egresos"
                    stroke="#ef4444"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#ef4444' }}
                    name={t('dashboard.totalExpenses')}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Entries */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{t('dashboard.recentActivity')}</CardTitle>
            <CardDescription>{t('dashboard.recentEntries')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentEntries.length === 0 ? (
                <p className="text-sm text-slate-400 py-8 text-center">{t('common.noData')}</p>
              ) : (
                data.recentEntries.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 shrink-0 mt-0.5">
                      <FileText className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{entry.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400">#{entry.number}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-400">{formatDate(entry.date)}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-slate-700">{formatCurrency(entry.total)}</p>
                      <Badge className={`text-[10px] px-1.5 py-0 ${statusColors[entry.status] || 'bg-gray-100'}`}>
                        {entry.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Third Row: Top Accounts + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Accounts */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{t('dashboard.accountBalances') || t('dashboard.summary')}</CardTitle>
            <CardDescription>{t('dashboard.topAccountsDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.accountBalances.slice(0, 8)}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={160}
                    tick={{ fontSize: 11, fill: '#475569' }}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelStyle={{ color: '#334155', fontWeight: 600 }}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="balance" fill="#10b981" radius={[0, 4, 4, 0]} name={t('dashboard.balance')} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{t('dashboard.quickActions')}</CardTitle>
            <CardDescription>{t('dashboard.balance')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                  <Users className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{data.totalClients}</p>
                  <p className="text-xs text-slate-500">{t('dashboard.totalClients')}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
                  <Building2 className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{data.totalProviders}</p>
                  <p className="text-xs text-slate-500">{t('dashboard.totalProviders')}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{data.pendingEntries}</p>
                  <p className="text-xs text-slate-500">{t('dashboard.newEntry')}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                  <Receipt className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{data.pendingInvoices}</p>
                  <p className="text-xs text-slate-500">{t('dashboard.pendingInvoices')}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{data.recentEntries.length}</p>
                  <p className="text-xs text-slate-500">{t('dashboard.recentActivity')}</p>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-lg border border-slate-200 bg-white">
                <p className="text-xs text-slate-500 mb-1">{t('dashboard.balance')}</p>
                <p className={`text-xl font-bold ${data.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(data.netIncome)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <Skeleton className="h-4 w-28 mb-2" />
              <Skeleton className="h-8 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={'ch'+i}>
            <CardContent className="p-4">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-6 w-8 mb-1" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[280px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
