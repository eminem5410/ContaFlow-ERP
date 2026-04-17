'use client'

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Filter, FileDown, FileSpreadsheet, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppStore } from '@/lib/store'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/formatters'
import { exportAuditLogToPDF } from '@/lib/export-pdf'
import { exportAuditLogToExcel } from '@/lib/export-excel'
import { useTranslation } from '@/i18n'

interface AuditLogEntry {
  id: string
  userId: string
  userName: string
  action: string
  entity: string
  entityId: string | null
  details: string | null
  companyId: string
  createdAt: string
  user: {
    name: string
    email: string
  }
}

const actionColors: Record<string, string> = {
  create: 'bg-emerald-100 text-emerald-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
  confirm: 'bg-yellow-100 text-yellow-800',
  login: 'bg-purple-100 text-purple-800',
}

const entityColors: Record<string, string> = {
  journal_entry: 'bg-slate-100 text-slate-800',
  invoice: 'bg-amber-100 text-amber-800',
  payment: 'bg-cyan-100 text-cyan-800',
  account: 'bg-violet-100 text-violet-800',
  client: 'bg-emerald-100 text-emerald-800',
  provider: 'bg-orange-100 text-orange-800',
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  const date = formatDate(dateStr)
  const time = d.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  return `${date} ${time}`
}

function todayLocal(): string {
  return new Date().toISOString().split('T')[0]
}

function thirtyDaysAgo(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().split('T')[0]
}

export function AuditLogView() {
  const { t } = useTranslation()
  const companyId = useAppStore((s) => s.user?.companyId)
  const [entityFilter, setEntityFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [isExporting, setIsExporting] = useState(false)

  const actionLabels: Record<string, string> = {
    create: t('audit.actions.create'),
    update: t('audit.actions.update'),
    delete: t('audit.actions.delete'),
    confirm: t('audit.actions.confirm'),
    login: t('audit.actions.login'),
  }

  const entityLabels: Record<string, string> = {
    journal_entry: t('audit.entities.journal_entry'),
    invoice: t('audit.entities.invoice'),
    payment: t('audit.entities.payment'),
    account: t('audit.entities.account'),
    client: t('audit.entities.client'),
    provider: t('audit.entities.provider'),
  }

  const hasFilters = !!(entityFilter || actionFilter || dateFrom || dateTo)

  const clearFilters = () => {
    setEntityFilter('')
    setActionFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  // Paginated query for display
  const { data, isLoading } = useQuery<{
    auditLogs: AuditLogEntry[]
    pagination: { page: number; limit: number; total: number; totalPages: number }
  }>({
    queryKey: ['audit-logs', companyId, entityFilter, actionFilter, dateFrom, dateTo, page],
    queryFn: () => api.get('/api/audit-logs', {
      companyId: companyId!,
      entity: entityFilter || undefined,
      action: actionFilter || undefined,
      from: dateFrom || undefined,
      to: dateTo || undefined,
      page,
      limit: 50,
    }),
    enabled: !!companyId,
  })

  // Reset page when filters change
  const handleEntityChange = (v: string) => {
    setEntityFilter(v === 'all' ? '' : v)
    setPage(1)
  }
  const handleActionChange = (v: string) => {
    setActionFilter(v === 'all' ? '' : v)
    setPage(1)
  }
  const handleDateFromChange = (v: string) => {
    setDateFrom(v)
    setPage(1)
  }
  const handleDateToChange = (v: string) => {
    setDateTo(v)
    setPage(1)
  }

  // Export handlers: fetch all records (limit=0) then generate file
  const handleExportPDF = useCallback(async () => {
    if (!companyId || isExporting) return
    setIsExporting(true)
    try {
      const result = await api.get<{ auditLogs: AuditLogEntry[] }>('/api/audit-logs', {
        companyId,
        entity: entityFilter || undefined,
        action: actionFilter || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
        limit: 0,
      })
      const entries = (result?.auditLogs || []).map((log: AuditLogEntry) => ({
        createdAt: log.createdAt,
        userName: log.user?.name || log.userName,
        userEmail: log.user?.email || '',
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        details: log.details,
      }))
      exportAuditLogToPDF(entries, { from: dateFrom || undefined, to: dateTo || undefined })
    } catch (err) {
      console.error('Export PDF error:', err)
    } finally {
      setIsExporting(false)
    }
  }, [companyId, entityFilter, actionFilter, dateFrom, dateTo, isExporting])

  const handleExportExcel = useCallback(async () => {
    if (!companyId || isExporting) return
    setIsExporting(true)
    try {
      const result = await api.get<{ auditLogs: AuditLogEntry[] }>('/api/audit-logs', {
        companyId,
        entity: entityFilter || undefined,
        action: actionFilter || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
        limit: 0,
      })
      const entries = (result?.auditLogs || []).map((log: AuditLogEntry) => ({
        createdAt: log.createdAt,
        userName: log.user?.name || log.userName,
        userEmail: log.user?.email || '',
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        details: log.details,
      }))
      exportAuditLogToExcel(entries)
    } catch (err) {
      console.error('Export Excel error:', err)
    } finally {
      setIsExporting(false)
    }
  }, [companyId, entityFilter, actionFilter, dateFrom, dateTo, isExporting])

  const totalPages = data?.pagination?.totalPages || 1
  const total = data?.pagination?.total || 0

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-sm text-slate-500">
            <Filter className="h-4 w-4" />
            <span className="font-medium">{t('audit.filters')}:</span>
          </div>

          {/* Entity filter */}
          <Select value={entityFilter || 'all'} onValueChange={handleEntityChange}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <SelectValue placeholder={t('audit.entity') + '...'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('audit.allEntities')}</SelectItem>
              <SelectItem value="journal_entry">{t('audit.entities.journal_entry')}</SelectItem>
              <SelectItem value="invoice">{t('audit.entities.invoice')}</SelectItem>
              <SelectItem value="payment">{t('audit.entities.payment')}</SelectItem>
              <SelectItem value="account">{t('audit.entities.account')}</SelectItem>
              <SelectItem value="client">{t('audit.entities.client')}</SelectItem>
              <SelectItem value="provider">{t('audit.entities.provider')}</SelectItem>
            </SelectContent>
          </Select>

          {/* Action filter */}
          <Select value={actionFilter || 'all'} onValueChange={handleActionChange}>
            <SelectTrigger className="w-[140px] h-9 text-sm">
              <SelectValue placeholder={t('audit.action') + '...'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('audit.allActions')}</SelectItem>
              <SelectItem value="create">{t('audit.actions.create')}</SelectItem>
              <SelectItem value="update">{t('audit.actions.update')}</SelectItem>
              <SelectItem value="delete">{t('audit.actions.delete')}</SelectItem>
              <SelectItem value="confirm">{t('audit.actions.confirm')}</SelectItem>
              <SelectItem value="login">{t('audit.actions.login')}</SelectItem>
            </SelectContent>
          </Select>

          {/* Date from */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-slate-400 whitespace-nowrap">{t('common.from')}:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => handleDateFromChange(e.target.value)}
              className="h-9 rounded-md border border-slate-200 px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          {/* Date to */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-slate-400 whitespace-nowrap">{t('common.to')}:</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => handleDateToChange(e.target.value)}
              className="h-9 rounded-md border border-slate-200 px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          {/* Quick date presets */}
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs text-teal-600 hover:text-teal-700"
            onClick={() => { setDateFrom(thirtyDaysAgo()); setDateTo(todayLocal()); setPage(1) }}
          >
            {t('common.last30days')}
          </Button>

          {/* Clear filters */}
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs text-red-500 hover:text-red-600"
              onClick={clearFilters}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              {t('common.clear')}
            </Button>
          )}
        </div>

        {/* Export buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isExporting || !data?.auditLogs?.length}
            onClick={handleExportPDF}
          >
            <FileDown className="h-4 w-4 mr-1.5" />
            {isExporting ? t('common.loading') : t('common.exportPdf')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={isExporting || !data?.auditLogs?.length}
            onClick={handleExportExcel}
          >
            <FileSpreadsheet className="h-4 w-4 mr-1.5" />
            {t('common.exportExcel')}
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">
          <span className="font-medium text-slate-700">{total}</span>{' '}
          {t('common.records')} {t('common.found')}
          {hasFilters && (
            <span className="ml-1 text-slate-400">({t('common.activeFilters')})</span>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-slate-600 px-2">
              {t('common.page')} <span className="font-medium">{page}</span> {t('common.of')} <span className="font-medium">{totalPages}</span>
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider w-48">{t('audit.dateTime')}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{t('audit.user')}</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider w-28">{t('audit.action')}</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider w-28">{t('audit.entity')}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider w-36">ID</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{t('common.details')}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : data?.auditLogs?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400 text-sm">
                      {t('audit.noRecordsFiltered')}
                    </td>
                  </tr>
                ) : (
                  data?.auditLogs?.map((log) => (
                    <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-slate-800">{log.user?.name || log.userName}</div>
                        <div className="text-xs text-slate-400">{log.user?.email || ''}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 ${actionColors[log.action] || 'bg-gray-100 text-gray-800'}`}>
                          {actionLabels[log.action] || log.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 ${entityColors[log.entity] || 'bg-gray-100 text-gray-800'}`}>
                          {entityLabels[log.entity] || log.entity}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-slate-500">
                        {log.entityId ? (
                          <span className="max-w-[140px] truncate block" title={log.entityId}>
                            {log.entityId.substring(0, 8)}...
                          </span>
                        ) : (
                          <span className="text-slate-300">&mdash;</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 max-w-[300px] truncate" title={log.details || ''}>
                        {log.details || <span className="text-slate-300">&mdash;</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
