'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Search, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useAppStore } from '@/lib/store'
import { api } from '@/lib/api'
import { usePermission } from '@/hooks/use-permission'
import { exportProvidersToExcel } from '@/lib/export-excel'
import { formatCurrency } from '@/lib/formatters'
import { useTranslation } from '@/i18n'

interface Provider {
  id: string
  code: string | null
  name: string
  cuit: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  province: string | null
  notes: string | null
  balance: number
}

const emptyForm = {
  name: '',
  cuit: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  province: '',
  notes: '',
}

export function ProvidersView() {
  const { t } = useTranslation()
  const companyId = useAppStore((s) => s.user?.companyId)
  const { canCreate, canEdit, canDelete, canExport } = usePermission()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null)
  const [deletingProvider, setDeletingProvider] = useState<Provider | null>(null)
  const [form, setForm] = useState(emptyForm)

  const { data, isLoading } = useQuery<{ providers: Provider[]; pagination: { total: number } }>({
    queryKey: ['providers', companyId, search],
    queryFn: () => api.get('/api/providers', { companyId: companyId!, search: search || undefined }),
    enabled: !!companyId,
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/api/providers', { ...data, companyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] })
      toast.success(t('providers.created'))
      closeDialog()
    },
    onError: (error: Error) => toast.error(t('common.error'), { description: error.message }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof form }) => api.put(`/api/providers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] })
      toast.success(t('providers.updated'))
      closeDialog()
    },
    onError: (error: Error) => toast.error(t('common.error'), { description: error.message }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/api/providers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] })
      toast.success(t('providers.deleted'))
      setDeletingProvider(null)
    },
    onError: (error: Error) => toast.error(t('common.error'), { description: error.message }),
  })

  const resetForm = () => setForm(emptyForm)
  const closeDialog = () => { setShowDialog(false); setEditingProvider(null); resetForm() }
  const openCreate = () => { resetForm(); setShowDialog(true) }

  const openEdit = (provider: Provider) => {
    setEditingProvider(provider)
    setForm({
      name: provider.name,
      cuit: provider.cuit || '',
      email: provider.email || '',
      phone: provider.phone || '',
      address: provider.address || '',
      city: provider.city || '',
      province: provider.province || '',
      notes: provider.notes || '',
    })
    setShowDialog(true)
  }

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error(t('providers.nameRequired'))
      return
    }
    if (editingProvider) {
      updateMutation.mutate({ id: editingProvider.id, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder={t('providers.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canExport('providers') && data?.providers && (
            <Button
              variant="outline"
              onClick={() => exportProvidersToExcel(data.providers)}
              disabled={data.providers.length === 0}
            >
              <FileDown className="mr-2 h-4 w-4" />
              {t('common.exportExcel')}
            </Button>
          )}
          {canCreate('providers') && (
            <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="mr-2 h-4 w-4" />
              {t('providers.newProvider')}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{t('providers.code')}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{t('providers.name')}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{t('providers.cuit')}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{t('providers.email')}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{t('providers.phone')}</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{t('providers.balance')}</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider w-24">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : data?.providers?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400 text-sm">
                      {t('providers.noResults')}
                    </td>
                  </tr>
                ) : (
                  data?.providers?.map((provider) => (
                    <tr key={provider.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                      <td className="px-4 py-3 text-sm font-mono text-slate-500">{provider.code || '-'}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{provider.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{provider.cuit || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{provider.email || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{provider.phone || '-'}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono font-medium text-slate-700">{formatCurrency(provider.balance)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          {canEdit('providers') && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(provider)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canDelete('providers') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setDeletingProvider(provider)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
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

      <Dialog open={showDialog} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProvider ? t('providers.editProvider') : t('providers.newProvider')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('providers.nameLabel')}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre del proveedor" />
              </div>
              <div className="space-y-2">
                <Label>{t('providers.cuit')}</Label>
                <Input value={form.cuit} onChange={(e) => setForm({ ...form, cuit: e.target.value })} placeholder="30-12345678-9" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('providers.email')}</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="proveedor@email.com" />
              </div>
              <div className="space-y-2">
                <Label>{t('providers.phone')}</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+54 11 1234-5678" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('providers.address')}</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Dirección del proveedor" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('providers.city')}</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Ciudad" />
              </div>
              <div className="space-y-2">
                <Label>{t('providers.province')}</Label>
                <Input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} placeholder="Provincia" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('providers.notes')}</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notas adicionales..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingProvider} onOpenChange={(open) => !open && setDeletingProvider(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('providers.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('providers.confirmDeleteDesc', { name: deletingProvider?.name || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingProvider && deleteMutation.mutate(deletingProvider.id)} className="bg-red-600 hover:bg-red-700">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
