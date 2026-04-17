'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Search, Users, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppStore } from '@/lib/store'
import { api } from '@/lib/api'
import { usePermission } from '@/hooks/use-permission'
import { formatDate } from '@/lib/formatters'
import { useTranslation } from '@/i18n'

interface UserItem {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

const roleColors: Record<string, string> = {
  admin: 'bg-red-100 text-red-800',
  contador: 'bg-blue-100 text-blue-800',
  visualizador: 'bg-gray-100 text-gray-800',
}

const emptyCreateForm = {
  name: '',
  email: '',
  password: '',
  role: 'visualizador',
}

const emptyEditForm = {
  name: '',
  email: '',
  role: 'visualizador',
}

export function UsersView() {
  const { t } = useTranslation()
  const companyId = useAppStore((s) => s.user?.companyId)
  const { canCreate, canEdit, canDelete } = usePermission()
  const currentUserId = useAppStore((s) => s.user?.id)
  const currentUserRole = useAppStore((s) => s.user?.role)
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<UserItem | null>(null)
  const [deletingUser, setDeletingUser] = useState<UserItem | null>(null)
  const [createForm, setCreateForm] = useState(emptyCreateForm)
  const [editForm, setEditForm] = useState(emptyEditForm)

  const roleLabels = useMemo<Record<string, string>>(() => ({
    admin: t('users.roleAdmin'),
    contador: t('users.roleContador'),
    visualizador: t('users.roleVisualizador'),
  }), [t])

  const { data, isLoading } = useQuery<{ users: UserItem[] }>({
    queryKey: ['users', companyId, search],
    queryFn: () => api.get('/api/users', { companyId: companyId!, search: search || undefined }),
    enabled: !!companyId,
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof emptyCreateForm) => api.post('/api/users', { ...data, companyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success(t('users.created'))
      closeDialog()
    },
    onError: (error: Error) => toast.error(t('common.error'), { description: error.message }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof emptyEditForm }) => api.put(`/api/users/${id}`, { ...data, currentUserId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success(t('users.updated'))
      closeDialog()
    },
    onError: (error: Error) => toast.error(t('common.error'), { description: error.message }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/api/users/${id}?currentUserId=${currentUserId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success(t('users.deleted'))
      setDeletingUser(null)
    },
    onError: (error: Error) => toast.error(t('common.error'), { description: error.message }),
  })

  const resetCreateForm = () => setCreateForm(emptyCreateForm)
  const resetEditForm = () => setEditForm(emptyEditForm)
  const closeDialog = () => { setShowDialog(false); setEditingUser(null); resetCreateForm(); resetEditForm() }

  const openCreate = () => { resetCreateForm(); setShowDialog(true) }

  const openEdit = (user: UserItem) => {
    setEditingUser(user)
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role,
    })
    setShowDialog(true)
  }

  const handleCreate = () => {
    if (!createForm.name.trim()) {
      toast.error(t('users.nameRequired'))
      return
    }
    if (!createForm.email.trim()) {
      toast.error(t('users.emailRequired'))
      return
    }
    if (!createForm.password.trim()) {
      toast.error(t('users.passwordRequired'))
      return
    }
    createMutation.mutate(createForm)
  }

  const handleEdit = () => {
    if (!editForm.name.trim()) {
      toast.error(t('users.nameRequired'))
      return
    }
    if (!editForm.email.trim()) {
      toast.error(t('users.emailRequired'))
      return
    }
    if (editingUser) {
      if (editingUser.id === currentUserId && editForm.role !== 'admin') {
        toast.error(t('users.cannotChangeOwnRole'))
        return
      }
      updateMutation.mutate({ id: editingUser.id, data: editForm })
    }
  }

  const handleDelete = () => {
    if (!deletingUser) return
    if (deletingUser.id === currentUserId) {
      toast.error(t('users.cannotDeleteOwn'))
      setDeletingUser(null)
      return
    }
    deleteMutation.mutate(deletingUser.id)
  }

  const filteredUsers = useMemo(() => {
    const users = data?.users
    if (!users) return []
    if (!search) return users
    const q = search.toLowerCase()
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    )
  }, [data?.users, search])

  const isAdmin = currentUserRole === 'admin'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder={t('users.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        {isAdmin && canCreate('users') && (
          <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="mr-2 h-4 w-4" />
            {t('users.newUser')}
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{t('users.name')}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{t('users.email')}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{t('users.role')}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">{t('users.createdAt')}</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider w-24">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400 text-sm">
                      <Users className="mx-auto h-8 w-8 mb-2 text-slate-300" />
                      {t('users.noResults')}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">
                        <div className="flex items-center gap-2">
                          <Shield className={`h-4 w-4 ${user.role === 'admin' ? 'text-red-500' : 'text-slate-300'}`} />
                          {user.name}
                          {user.id === currentUserId && (
                            <span className="text-xs text-slate-400">{t('users.youTag')}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{user.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className={roleColors[user.role] || 'bg-gray-100 text-gray-800'}>
                          {roleLabels[user.role] || user.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          {isAdmin && canEdit('users') && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(user)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {isAdmin && canDelete('users') && user.id !== currentUserId && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setDeletingUser(user)}
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

      {/* Create Dialog */}
      <Dialog open={showDialog && !editingUser} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('users.newUser')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('users.name')} *</Label>
              <Input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder={t('users.namePlaceholder')} />
            </div>
            <div className="space-y-2">
              <Label>{t('users.email')} *</Label>
              <Input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} placeholder={t('users.emailPlaceholder')} />
            </div>
            <div className="space-y-2">
              <Label>{t('users.password')} *</Label>
              <Input type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} placeholder={t('users.passwordPlaceholder')} />
            </div>
            <div className="space-y-2">
              <Label>{t('users.role')}</Label>
              <Select value={createForm.role} onValueChange={(value) => setCreateForm({ ...createForm, role: value })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('users.selectRole')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{t('users.roleAdmin')}</SelectItem>
                  <SelectItem value="contador">{t('users.roleContador')}</SelectItem>
                  <SelectItem value="visualizador">{t('users.roleVisualizador')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>{t('common.cancel')}</Button>
            <Button
              onClick={handleCreate}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? t('users.creating') : t('users.createUser')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showDialog && !!editingUser} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('users.editUser')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('users.name')} *</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder={t('users.namePlaceholder')} />
            </div>
            <div className="space-y-2">
              <Label>{t('users.email')} *</Label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} placeholder={t('users.emailPlaceholder')} />
            </div>
            <div className="space-y-2">
              <Label>{t('users.role')}</Label>
              <Select
                value={editForm.role}
                onValueChange={(value) => setEditForm({ ...editForm, role: value })}
                disabled={editingUser?.id === currentUserId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('users.selectRole')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{t('users.roleAdmin')}</SelectItem>
                  <SelectItem value="contador">{t('users.roleContador')}</SelectItem>
                  <SelectItem value="visualizador">{t('users.roleVisualizador')}</SelectItem>
                </SelectContent>
              </Select>
              {editingUser?.id === currentUserId && (
                <p className="text-xs text-slate-400">{t('users.cannotChangeOwnRoleDesc')}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>{t('common.cancel')}</Button>
            <Button
              onClick={handleEdit}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('users.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('users.deleteConfirmDesc', { name: deletingUser?.name || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
