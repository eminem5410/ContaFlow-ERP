'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, CheckCircle2, XCircle, Search, Loader2, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppStore } from '@/lib/store'
import { api } from '@/lib/api'
import { usePermission } from '@/hooks/use-permission'
import { exportJournalEntriesToExcel } from '@/lib/export-excel'
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/lib/formatters'
import { useTranslation } from '@/i18n'

interface JournalLine {
  accountId: string
  debit: number
  credit: number
  description?: string
}

interface JournalEntry {
  id: string
  number: number
  date: string
  description: string
  concept: string | null
  status: string
  totalDebit: number
  totalCredit: number
  lines: Array<{
    id: string
    accountId: string
    account: { id: string; code: string; name: string }
    debit: number
    credit: number
    description: string | null
  }>
}

interface AccountOption {
  id: string
  code: string
  name: string
}

const emptyLine = (): JournalLine => ({
  accountId: '',
  debit: 0,
  credit: 0,
  description: '',
})

export function JournalEntriesView() {
  const { t } = useTranslation()
  const companyId = useAppStore((s) => s.user?.companyId)
  const { canCreate, canEdit, canDelete, canConfirm, canExport } = usePermission()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showSheet, setShowSheet] = useState(false)
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null)
  const [deletingEntry, setDeletingEntry] = useState<JournalEntry | null>(null)

  const statusTabs = useMemo(() => [
    { value: 'all', label: t('common.all') },
    { value: 'borrador', label: t('journalEntries.statuses.borrador') },
    { value: 'confirmado', label: t('journalEntries.statuses.confirmado') },
    { value: 'anulado', label: t('journalEntries.statuses.anulado') },
  ], [t])

  // Sheet form state
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formDescription, setFormDescription] = useState('')
  const [formConcept, setFormConcept] = useState('normal')
  const [formLines, setFormLines] = useState<JournalLine[]>([emptyLine(), emptyLine()])

  const { data, isLoading } = useQuery<{ journalEntries: JournalEntry[]; pagination: { total: number } }>({
    queryKey: ['journal-entries', companyId, statusFilter],
    queryFn: () => api.get('/api/journal-entries', { companyId: companyId!, status: statusFilter }),
    enabled: !!companyId,
  })

  // Fetch accounts for dropdown
  const { data: accountsData } = useQuery<{ accounts: AccountOption[] }>({
    queryKey: ['accounts-list', companyId],
    queryFn: () => api.get('/api/accounts', { companyId: companyId! }),
    enabled: !!companyId,
  })

  const saveMutation = useMutation({
    mutationFn: async ({ data, method, id }: { data: object; method: string; id?: string }) => {
      if (id) return api.put(`/api/journal-entries/${id}`, data)
      return api.post('/api/journal-entries', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(editingEntry ? t('journalEntries.updated') : t('journalEntries.created'))
      closeSheet()
    },
    onError: (error: Error) => {
      toast.error(t('common.error'), { description: error.message })
    },
  })

  const confirmMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/journal-entries/${id}/confirm`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(t('journalEntries.confirmed'))
    },
    onError: (error: Error) => {
      toast.error(t('common.error'), { description: error.message })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/api/journal-entries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(t('journalEntries.deleted'))
      setDeletingEntry(null)
    },
    onError: (error: Error) => {
      toast.error(t('common.error'), { description: error.message })
    },
  })

  const filteredEntries = useMemo(() => {
    if (!data?.journalEntries) return []
    if (!search) return data.journalEntries
    const s = search.toLowerCase()
    return data.journalEntries.filter(
      (e) =>
        e.description.toLowerCase().includes(s) ||
        String(e.number).includes(s)
    )
  }, [data?.journalEntries, search])

  const resetForm = () => {
    setFormDate(new Date().toISOString().split('T')[0])
    setFormDescription('')
    setFormConcept('normal')
    setFormLines([emptyLine(), emptyLine()])
    setEditingEntry(null)
  }

  const closeSheet = () => {
    setShowSheet(false)
    resetForm()
  }

  const openCreate = () => {
    resetForm()
    setShowSheet(true)
  }

  const openEdit = (entry: JournalEntry) => {
    if (entry.status !== 'borrador') {
      toast.error(t('journalEntries.onlyDraftEditable'))
      return
    }
    setEditingEntry(entry)
    setFormDate(entry.date.split('T')[0])
    setFormDescription(entry.description)
    setFormConcept(entry.concept || 'normal')
    setFormLines(
      entry.lines.map((l) => ({
        accountId: l.accountId,
        debit: l.debit,
        credit: l.credit,
        description: l.description || '',
      }))
    )
    setShowSheet(true)
  }

  const updateLine = (index: number, field: keyof JournalLine, value: string | number) => {
    setFormLines((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      // Clear opposing field when entering debit or credit
      if (field === 'debit' && Number(value) > 0) {
        updated[index].credit = 0
      } else if (field === 'credit' && Number(value) > 0) {
        updated[index].debit = 0
      }
      return updated
    })
  }

  const addLine = () => setFormLines((prev) => [...prev, emptyLine()])
  const removeLine = (index: number) => {
    if (formLines.length <= 2) {
      toast.error(t('journalEntries.minLines'))
      return
    }
    setFormLines((prev) => prev.filter((_, i) => i !== index))
  }

  const totalDebit = formLines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0)
  const totalCredit = formLines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0
  const hasEmptyAccounts = formLines.some((l) => !l.accountId)

  const handleSave = (directConfirm = false) => {
    if (!formDescription.trim()) {
      toast.error(t('journalEntries.descriptionRequired'))
      return
    }
    if (hasEmptyAccounts) {
      toast.error(t('journalEntries.allLinesMustHaveAccount'))
      return
    }
    if (!isBalanced) {
      toast.error(t('journalEntries.mustBalance'))
      return
    }

    const payload = {
      date: formDate,
      description: formDescription,
      concept: formConcept,
      companyId,
      lines: formLines.map((l) => ({
        accountId: l.accountId,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        description: l.description || undefined,
      })),
    }

    if (editingEntry) {
      saveMutation.mutate({ data: payload, method: 'PUT', id: editingEntry.id })
    } else {
      saveMutation.mutate({ data: payload, method: 'POST' })
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder={t('journalEntries.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canExport('journal-entries') && data?.journalEntries && (
            <Button
              variant="outline"
              onClick={() => exportJournalEntriesToExcel(filteredEntries)}
              disabled={filteredEntries.length === 0}
            >
              <FileDown className="mr-2 h-4 w-4" />
              {t('common.exportExcel')}
            </Button>
          )}
          {canCreate('journal-entries') && (
            <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="mr-2 h-4 w-4" />
              {t('journalEntries.newEntry')}
            </Button>
          )}
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
              statusFilter === tab.value
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {/* Desktop table */}
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider w-20">#</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider w-28">{t('journalEntries.date')}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{t('journalEntries.description')}</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider w-28">{t('journalEntries.debit')}</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider w-28">{t('journalEntries.credit')}</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider w-24">{t('journalEntries.status')}</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider w-32">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="px-4 py-3"><Skeleton className="h-4 w-10" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-20 ml-auto" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-20 ml-auto" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-16 mx-auto" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-8 w-20 mx-auto" /></td>
                    </tr>
                  ))
                ) : filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400 text-sm">
                      {t('journalEntries.noResults')}
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => (
                    <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                      <td className="px-4 py-3 text-sm font-medium text-slate-600">{entry.number}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{formatDate(entry.date)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800 max-w-[300px] truncate">{entry.description}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-slate-700">{formatCurrency(entry.totalDebit)}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-slate-700">{formatCurrency(entry.totalCredit)}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={`text-[10px] px-2 py-0.5 ${getStatusColor(entry.status)}`}>
                          {getStatusLabel(entry.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {entry.status === 'borrador' && (
                            <>
                              {canEdit('journal-entries') && (
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(entry)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {canConfirm('journal-entries') && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                  onClick={() => confirmMutation.mutate(entry.id)}
                                  title={t('journalEntries.confirmEntry')}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {canDelete('journal-entries') && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => setDeletingEntry(entry)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </>
                          )}
                          {entry.status === 'confirmado' && (
                            <span className="text-xs text-slate-400">{t('journalEntries.readOnly')}</span>
                          )}
                          {entry.status === 'anulado' && (
                            <span className="text-xs text-slate-400">{t('journalEntries.statuses.anulado')}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Sheet */}
      <Sheet open={showSheet} onOpenChange={(open) => !open && closeSheet()}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>{editingEntry ? `${t('journalEntries.editEntry')} #${editingEntry.number}` : t('journalEntries.title')}</SheetTitle>
          </SheetHeader>

          <div className="space-y-6">
            {/* Header fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('journalEntries.date')} *</Label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('journalEntries.concept')}</Label>
                <Select value={formConcept} onValueChange={setFormConcept}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">{t('journalEntries.concepts.normal')}</SelectItem>
                    <SelectItem value="apertura">{t('journalEntries.concepts.apertura')}</SelectItem>
                    <SelectItem value="ajuste">{t('journalEntries.concepts.ajuste')}</SelectItem>
                    <SelectItem value="cierre">{t('journalEntries.concepts.cierre')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('journalEntries.description')} *</Label>
              <Input
                placeholder="Descripción del asiento contable"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>

            {/* Lines */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">{t('journalEntries.lines')}</Label>
              <div className="space-y-2">
                {formLines.map((line, index) => (
                  <div key={index} className="grid grid-cols-[1fr_100px_100px_32px] gap-2 items-center">
                    <Select
                      value={line.accountId}
                      onValueChange={(v) => updateLine(index, 'accountId', v)}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder={t('journalEntries.selectAccount')} />
                      </SelectTrigger>
                      <SelectContent>
                        {accountsData?.accounts?.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.code} - {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder={t('journalEntries.debit')}
                      min="0"
                      step="0.01"
                      value={line.debit || ''}
                      onChange={(e) => updateLine(index, 'debit', e.target.value)}
                      className="text-xs text-right"
                    />
                    <Input
                      type="number"
                      placeholder={t('journalEntries.credit')}
                      min="0"
                      step="0.01"
                      value={line.credit || ''}
                      onChange={(e) => updateLine(index, 'credit', e.target.value)}
                      className="text-xs text-right"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-slate-400 hover:text-red-500"
                      onClick={() => removeLine(index)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={addLine} className="text-xs">
                <Plus className="mr-1 h-3 w-3" />
                {t('journalEntries.addLine')}
              </Button>
            </div>

            {/* Totals */}
            <div className="rounded-lg border border-slate-200 p-4 bg-slate-50 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">{t('journalEntries.totalDebits')}:</span>
                <span className="font-mono font-semibold">{formatCurrency(totalDebit)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">{t('journalEntries.totalCredits')}:</span>
                <span className="font-mono font-semibold">{formatCurrency(totalCredit)}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between text-sm">
                <span className="text-slate-600">{t('journalEntries.difference')}:</span>
                <span className={`font-mono font-bold ${isBalanced ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(Math.abs(totalDebit - totalCredit))}
                  {isBalanced ? ' ✓' : ` ✗ ${t('journalEntries.unbalanced')}`}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={closeSheet} className="flex-1">
                {t('common.cancel')}
              </Button>
              <Button
                onClick={() => handleSave(false)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={saveMutation.isPending || !isBalanced}
              >
                {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingEntry ? t('journalEntries.update') : t('journalEntries.saveDraft')}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingEntry} onOpenChange={(open) => !open && setDeletingEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('journalEntries.deleteConfirmTitle', { number: deletingEntry?.number ?? '' })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('journalEntries.deleteConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingEntry && deleteMutation.mutate(deletingEntry.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
