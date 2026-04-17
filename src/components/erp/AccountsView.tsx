'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Search, Plus, Pencil, Trash2, ChevronRight, ChevronDown, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
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
import { exportAccountsToExcel } from '@/lib/export-excel'
import { formatCurrency, getAccountTypeColor, getAccountTypeLabel } from '@/lib/formatters'
import { useTranslation } from '@/i18n'

interface Account {
  id: string
  code: string
  name: string
  type: string
  subtype: string | null
  parentId: string | null
  level: number
  balance: number
  parent?: { id: string; code: string; name: string } | null
  children?: Account[]
}

export function AccountsView() {
  const { t } = useTranslation()
  const companyId = useAppStore((s) => s.user?.companyId)
  const { canCreate, canEdit, canDelete, canExport } = usePermission()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null)

  // Form state
  const [form, setForm] = useState({
    code: '',
    name: '',
    type: '',
    subtype: '',
    parentId: '',
  })

  const accountTypes = useMemo(() => [
    { value: 'activo', label: t('accounts.accountTypes.activo') },
    { value: 'pasivo', label: t('accounts.accountTypes.pasivo') },
    { value: 'patrimonio', label: t('accounts.accountTypes.patrimonio') },
    { value: 'ingreso', label: t('accounts.accountTypes.ingreso') },
    { value: 'egreso', label: t('accounts.accountTypes.egreso') },
  ], [t])

  const filterTabs = useMemo(() => [
    { value: 'all', label: t('common.all') },
    ...accountTypes,
  ], [t, accountTypes])

  const { data, isLoading } = useQuery<{ accounts: Account[] }>({
    queryKey: ['accounts', companyId],
    queryFn: () => api.get('/api/accounts', { companyId: companyId! }),
    enabled: !!companyId,
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/api/accounts', { ...data, companyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      toast.success(t('accounts.created'))
      setShowCreateDialog(false)
      resetForm()
    },
    onError: (error: Error) => {
      toast.error(t('common.error'), { description: error.message })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof form }) => api.put(`/api/accounts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      toast.success(t('accounts.updated'))
      setEditingAccount(null)
      resetForm()
    },
    onError: (error: Error) => {
      toast.error(t('common.error'), { description: error.message })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/api/accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      toast.success(t('accounts.deleted'))
      setDeletingAccount(null)
    },
    onError: (error: Error) => {
      toast.error(t('common.error'), { description: error.message })
    },
  })

  const resetForm = () => {
    setForm({ code: '', name: '', type: '', subtype: '', parentId: '' })
  }

  const openEditDialog = (account: Account) => {
    setEditingAccount(account)
    setForm({
      code: account.code,
      name: account.name,
      type: account.type,
      subtype: account.subtype || '',
      parentId: account.parentId || '',
    })
  }

  const toggleNode = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const buildTree = (accounts: Account[]): Account[] => {
    const map = new Map<string, Account>()
    const roots: Account[] = []

    accounts.forEach((a) => map.set(a.id, { ...a, children: [] }))
    map.forEach((a) => {
      if (a.parentId && map.has(a.parentId)) {
        map.get(a.parentId)!.children!.push(a)
      } else {
        roots.push(a)
      }
    })

    return roots
  }

  const filteredAccounts = useMemo(() => {
    if (!data?.accounts) return []
    let filtered = data.accounts

    if (filterType !== 'all') {
      filtered = filtered.filter((a) => a.type === filterType)
    }

    if (search) {
      const s = search.toLowerCase()
      filtered = filtered.filter(
        (a) => a.code.toLowerCase().includes(s) || a.name.toLowerCase().includes(s)
      )
    }

    return filtered
  }, [data?.accounts, filterType, search])

  const tree = buildTree(filteredAccounts)

  // Collect all parent IDs from visible accounts to auto-expand
  const visibleParentIds = useMemo(() => {
    const ids = new Set<string>()
    filteredAccounts.forEach((a) => {
      if (a.parentId) ids.add(a.parentId)
    })
    return ids
  }, [filteredAccounts])

  const parentAccounts = useMemo(() => {
    if (!data?.accounts) return []
    return data.accounts.filter((a) => !a.parentId || a.level <= 2).sort((a, b) => a.code.localeCompare(b.code))
  }, [data?.accounts])

  const renderTree = (nodes: Account[], depth: number = 0): React.ReactNode => {
    return nodes.map((node) => {
      const hasChildren = node.children && node.children.length > 0
      const isExpanded = expandedNodes.has(node.id) || (search && visibleParentIds.has(node.id))

      return (
        <div key={node.id}>
          <div
            className="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 transition-colors group"
            style={{ paddingLeft: `${depth * 24 + 16}px` }}
          >
            {hasChildren ? (
              <button
                onClick={() => toggleNode(node.id)}
                className="shrink-0 text-slate-400 hover:text-slate-600"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="w-4 shrink-0" />
            )}

            <span className="text-xs font-mono text-slate-400 w-24 shrink-0">{node.code}</span>
            <span className={`text-sm font-medium text-slate-700 flex-1 truncate ${node.level === 1 ? 'font-bold text-slate-900' : ''}`}>
              {node.name}
            </span>
            <Badge className={`text-[10px] px-2 py-0.5 ${getAccountTypeColor(node.type)} shrink-0`}>
              {getAccountTypeLabel(node.type)}
            </Badge>
            <span className="text-sm font-medium text-slate-600 w-28 text-right shrink-0">
              {formatCurrency(node.balance)}
            </span>

            {/* Actions */}
            <div className="flex items-center gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity shrink-0">
              {canEdit('accounts') && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => openEditDialog(node)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
              {canDelete('accounts') && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setDeletingAccount(node)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          {hasChildren && isExpanded && renderTree(node.children!, depth + 1)}
        </div>
      )
    })
  }

  const handleSave = () => {
    if (!form.code || !form.name || !form.type) {
      toast.error(t('accounts.fieldsRequired'))
      return
    }
    if (editingAccount) {
      updateMutation.mutate({ id: editingAccount.id, data: form })
    } else {
      createMutation.mutate(form)
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
              placeholder={t('accounts.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canExport('accounts') && data?.accounts && (
            <Button
              variant="outline"
              onClick={() => exportAccountsToExcel(filteredAccounts)}
              disabled={filteredAccounts.length === 0}
            >
              <FileDown className="mr-2 h-4 w-4" />
              {t('common.exportExcel')}
            </Button>
          )}
          {canCreate('accounts') && (
            <Button onClick={() => { resetForm(); setShowCreateDialog(true) }} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="mr-2 h-4 w-4" />
              {t('accounts.newAccount')}
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilterType(tab.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
              filterType === tab.value
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Accounts Table */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">
            {t('accounts.title')}
            {data?.accounts && (
              <span className="text-sm font-normal text-slate-400 ml-2">
                ({filteredAccounts.length} {t('accounts.accountsCount', { count: filteredAccounts.length })})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Table header */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wider">
            <div className="w-4 shrink-0" />
            <div className="w-24 shrink-0">{t('accounts.code')}</div>
            <div className="flex-1">{t('accounts.name')}</div>
            <div className="shrink-0">{t('accounts.type')}</div>
            <div className="w-28 text-right shrink-0">{t('accounts.balance')}</div>
            <div className="w-16 shrink-0" />
          </div>

          {isLoading ? (
            <div className="space-y-0">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-slate-400 text-sm">{t('accounts.noResults')}</p>
            </div>
          ) : (
            renderTree(tree)
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={showCreateDialog || !!editingAccount} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false)
          setEditingAccount(null)
          resetForm()
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAccount ? t('accounts.editAccount') : t('accounts.newAccount')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('accounts.code')} *</Label>
                <Input
                  placeholder="1.1.01.001"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('accounts.type')} *</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('accounts.selectPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {accountTypes.map((acctType) => (
                      <SelectItem key={acctType.value} value={acctType.value}>{acctType.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('accounts.name')} *</Label>
              <Input
                placeholder="Nombre de la cuenta"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('accounts.subtype')}</Label>
                <Input
                  placeholder="Ej: corriente"
                  value={form.subtype}
                  onChange={(e) => setForm({ ...form, subtype: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('accounts.parentAccount')}</Label>
                <Select value={form.parentId} onValueChange={(v) => setForm({ ...form, parentId: v === '__none__' ? '' : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('accounts.noParent')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t('accounts.noParent')}</SelectItem>
                    {parentAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); setEditingAccount(null); resetForm() }}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSave}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingAccount} onOpenChange={(open) => !open && setDeletingAccount(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('accounts.deleteAccount')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('accounts.deleteConfirmDesc', { code: deletingAccount?.code ?? '', name: deletingAccount?.name ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingAccount && deleteMutation.mutate(deletingAccount.id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
