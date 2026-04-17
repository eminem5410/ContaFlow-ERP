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
import { exportClientsToExcel } from '@/lib/export-excel'
import { formatCurrency } from '@/lib/formatters'
import { useTranslation } from '@/i18n'

interface Client {
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

export function ClientsView() {
  const { t } = useTranslation()
  const companyId = useAppStore((s) => s.user?.companyId)
  const { canCreate, canEdit, canDelete, canExport } = usePermission()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [deletingClient, setDeletingClient] = useState<Client | null>(null)
  const [form, setForm] = useState(emptyForm)

  const { data, isLoading } = useQuery<{ clients: Client[]; pagination: { total: number } }>({
    queryKey: ['clients', companyId, search],
    queryFn: () => api.get('/api/clients', { companyId: companyId!, search: search || undefined }),
    enabled: !!companyId,
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/api/clients', { ...data, companyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success(t('clients.created'))
      closeDialog()
    },
    onError: (error: Error) => toast.error(t('common.error'), { description: error.message }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof form }) => api.put(`/api/clients/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success(t('clients.updated'))
      closeDialog()
    },
    onError: (error: Error) => toast.error(t('common.error'), { description: error.message }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/api/clients/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success(t('clients.deleted'))
      setDeletingClient(null)
    },
    onError: (error: Error) => toast.error(t('common.error'), { description: error.message }),
  })

  const resetForm = () => setForm(emptyForm)
  const closeDialog = () => { setShowDialog(false); setEditingClient(null); resetForm() }

  const openCreate = () => { resetForm(); setShowDialog(true) }

  const openEdit = (client: Client) => {
    setEditingClient(client)
    setForm({
      name: client.name,
      cuit: client.cuit || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      city: client.city || '',
      province: client.province || '',
      notes: client.notes || '',
    })
    setShowDialog(true)
  }

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error(t('clients.nameRequired'))
      return
    }
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data: form })
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
              placeholder={t('clients.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canExport('clients') && data?.clients && (
            <Button
              variant="outline"
              onClick={() => exportClientsToExcel(data.clients)}
              disabled={data.clients.length === 0}
            >
              <FileDown className="mr-2 h-4 w-4" />
              {t('common.exportExcel')}
            </Button>
          )}
          {canCreate('clients') && (
            <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="mr-2 h-4 w-4" />
              {t('clients.newClient')}
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{t('clients.code')}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{t('clients.name')}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{t('clients.cuit')}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{t('clients.email')}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{t('clients.phone')}</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{t('clients.balance')}</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider w-24">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : data?.clients?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400 text-sm">
                      {t('clients.noResults')}
                    </td>
                  </tr>
                ) : (
                  data?.clients?.map((client) => (
                    <tr key={client.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                      <td className="px-4 py-3 text-sm font-mono text-slate-500">{client.code || '-'}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{client.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{client.cuit || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{client.email || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{client.phone || '-'}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono font-medium text-slate-700">{formatCurrency(client.balance)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          {canEdit('clients') && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(client)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canDelete('clients') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setDeletingClient(client)}
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

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingClient ? t('clients.editClient') : t('clients.newClient')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('clients.nameLabel')}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre del cliente" />
              </div>
              <div className="space-y-2">
                <Label>{t('clients.cuit')}</Label>
                <Input value={form.cuit} onChange={(e) => setForm({ ...form, cuit: e.target.value })} placeholder="30-12345678-9" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('clients.email')}</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="cliente@email.com" />
              </div>
              <div className="space-y-2">
                <Label>{t('clients.phone')}</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+54 11 1234-5678" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('clients.address')}</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Av. Corrientes 1234" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('clients.city')}</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Buenos Aires" />
              </div>
              <div className="space-y-2">
                <Label>{t('clients.province')}</Label>
                <Input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} placeholder="CABA" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('clients.notes')}</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notas adicionales..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>{t('common.cancel')}</Button>
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
      <AlertDialog open={!!deletingClient} onOpenChange={(open) => !open && setDeletingClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('clients.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('clients.confirmDeleteDesc', { name: deletingClient?.name || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingClient && deleteMutation.mutate(deletingClient.id)} className="bg-red-600 hover:bg-red-700">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
