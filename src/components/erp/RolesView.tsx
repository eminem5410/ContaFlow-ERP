'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Plus,
  Pencil,
  Trash2,
  Shield,
  Users,
  Lock,
  CheckSquare,
  Square,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { api } from '@/lib/api'
import { usePermission } from '@/hooks/use-permission'
import { useTranslation } from '@/i18n'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ── Permission module definitions ──────────────────────────────────────
interface ModuleDef {
  key: string
  labelKey: string
  actions: { key: string; labelKey: string }[]
}

const MODULE_DEFS: ModuleDef[] = [
  { key: 'accounts', labelKey: 'nav.accounts', actions: [{ key: 'view', labelKey: 'common.view' }, { key: 'create', labelKey: 'common.create' }, { key: 'edit', labelKey: 'common.edit' }, { key: 'delete', labelKey: 'common.delete' }] },
  { key: 'journal-entries', labelKey: 'nav.journalEntries', actions: [{ key: 'view', labelKey: 'common.view' }, { key: 'create', labelKey: 'common.create' }, { key: 'edit', labelKey: 'common.edit' }, { key: 'delete', labelKey: 'common.delete' }, { key: 'confirm', labelKey: 'common.confirm' }] },
  { key: 'clients', labelKey: 'nav.clients', actions: [{ key: 'view', labelKey: 'common.view' }, { key: 'create', labelKey: 'common.create' }, { key: 'edit', labelKey: 'common.edit' }, { key: 'delete', labelKey: 'common.delete' }] },
  { key: 'providers', labelKey: 'nav.providers', actions: [{ key: 'view', labelKey: 'common.view' }, { key: 'create', labelKey: 'common.create' }, { key: 'edit', labelKey: 'common.edit' }, { key: 'delete', labelKey: 'common.delete' }] },
  { key: 'invoices', labelKey: 'nav.invoices', actions: [{ key: 'view', labelKey: 'common.view' }, { key: 'create', labelKey: 'common.create' }, { key: 'edit', labelKey: 'common.edit' }, { key: 'delete', labelKey: 'common.delete' }, { key: 'confirm', labelKey: 'common.confirm' }] },
  { key: 'payments', labelKey: 'nav.payments', actions: [{ key: 'view', labelKey: 'common.view' }, { key: 'create', labelKey: 'common.create' }, { key: 'edit', labelKey: 'common.edit' }, { key: 'delete', labelKey: 'common.delete' }] },
  { key: 'bank-accounts', labelKey: 'nav.bankAccounts', actions: [{ key: 'view', labelKey: 'common.view' }, { key: 'create', labelKey: 'common.create' }, { key: 'edit', labelKey: 'common.edit' }, { key: 'delete', labelKey: 'common.delete' }] },
  { key: 'reports', labelKey: 'nav.reports', actions: [{ key: 'view', labelKey: 'common.view' }, { key: 'export', labelKey: 'common.export' }] },
  { key: 'users', labelKey: 'nav.users', actions: [{ key: 'view', labelKey: 'common.view' }, { key: 'create', labelKey: 'common.create' }, { key: 'edit', labelKey: 'common.edit' }, { key: 'delete', labelKey: 'common.delete' }] },
  { key: 'roles', labelKey: 'nav.roles', actions: [{ key: 'view', labelKey: 'common.view' }, { key: 'create', labelKey: 'common.create' }, { key: 'edit', labelKey: 'common.edit' }, { key: 'delete', labelKey: 'common.delete' }] },
  { key: 'settings', labelKey: 'nav.settings', actions: [{ key: 'view', labelKey: 'common.view' }, { key: 'edit', labelKey: 'common.edit' }] },
  { key: 'audit-log', labelKey: 'nav.auditLog', actions: [{ key: 'view', labelKey: 'common.view' }, { key: 'export', labelKey: 'common.export' }] },
]

const LEVEL_COLORS: Record<number, string> = {
  10: 'bg-slate-100 text-slate-700 hover:bg-slate-100',
  50: 'bg-amber-50 text-amber-700 hover:bg-amber-50',
  100: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50',
}

// ── Types ──────────────────────────────────────────────────────────────
interface RoleItem {
  id: string
  name: string
  description: string | null
  level: number
  isDefault: boolean
  _count: { permissions: number; users: number }
}

interface PermissionItem {
  id: string
  module: string
  action: string
  description: string
}

// ── Main Component ─────────────────────────────────────────────────────
export function RolesView() {
  const { t } = useTranslation()
  const company = useAppStore((s) => s.company)
  const { isAdmin } = usePermission()
  const queryClient = useQueryClient()

  // Dialogs
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null)
  const [deletingRole, setDeletingRole] = useState<RoleItem | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formLevel, setFormLevel] = useState('50')
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set())

  // Level options and labels derived from t()
  const levelOptions = useMemo(() => [
    { value: '10', label: t('roles.roleViewer') },
    { value: '50', label: t('roles.roleAccountant') },
    { value: '100', label: t('roles.roleAdminShort') },
  ], [t])

  const levelLabels = useMemo(() => ({
    10: t('roles.roleViewer'),
    50: t('roles.roleAccountant'),
    100: t('roles.roleAdminShort'),
  }), [t])

  // MODULES with translated labels
  const MODULES = useMemo(() => MODULE_DEFS.map((m) => ({
    ...m,
    label: t(m.labelKey),
    actions: m.actions.map((a) => ({ ...a, label: t(a.labelKey) })),
  })), [t])

  // ── Queries ─────────────────────────────────────────────────────────
  const {
    data: rolesData,
    isLoading: rolesLoading,
    error: rolesError,
  } = useQuery<{ roles: RoleItem[] }>({
    queryKey: ['roles', company?.id],
    queryFn: () => api.get('/api/roles', { companyId: company?.id }),
    enabled: !!company?.id,
  })

  const {
    data: permissionsData,
    isLoading: permsLoading,
  } = useQuery<{ permissions: PermissionItem[] }>({
    queryKey: ['permissions'],
    queryFn: () => api.get('/api/permissions'),
  })

  // ── Permission lookup helpers ────────────────────────────────────────
  const permMap = useMemo(() => {
    const map = new Map<string, string>()
    if (permissionsData?.permissions) {
      for (const p of permissionsData.permissions) {
        map.set(`${p.module}.${p.action}`, p.id)
      }
    }
    return map
  }, [permissionsData])

  const reversePermMap = useMemo(() => {
    const map = new Map<string, string>()
    if (permissionsData?.permissions) {
      for (const p of permissionsData.permissions) {
        map.set(p.id, `${p.module}.${p.action}`)
      }
    }
    return map
  }, [permissionsData])

  // ── Mutations ───────────────────────────────────────────────────────
  const createRole = useMutation({
    mutationFn: (data: { name: string; description: string; level: number; permissionIds: string[] }) =>
      api.post('/api/roles', { ...data, companyId: company?.id }),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['roles'] })
      toast.success(t('roles.created'))
      closeForm()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const updateRole = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; description: string; level: number; permissionIds: string[] } }) =>
      api.put(`/api/roles/${id}`, data),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['roles'] })
      toast.success(t('roles.updated'))
      closeForm()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const seedPermissions = useMutation({
    mutationFn: () => api.post('/api/permissions/seed', { companyId: company?.id }),
    onSuccess: async (data: any) => {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['roles'] }),
        queryClient.refetchQueries({ queryKey: ['permissions'] }),
      ])
      toast.success(`${t('roles.seedSuccess')} — ${(data as any)?.permissionsSeeded ?? 0} permisos`)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const deleteRole = useMutation({
    mutationFn: (id: string) => api.del(`/api/roles/${id}`),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['roles'] })
      toast.success(t('roles.deleted'))
      setDeletingRole(null)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  // ── Form helpers ────────────────────────────────────────────────────
  const openCreateForm = () => {
    setEditingRole(null)
    setFormName('')
    setFormDescription('')
    setFormLevel('50')
    setSelectedPermissions(new Set())
    setIsFormOpen(true)
  }

  const openEditForm = async (role: RoleItem) => {
    setEditingRole(role)
    setFormName(role.name)
    setFormDescription(role.description || '')
    setFormLevel(String(role.level))

    // Fetch full role details with permissions
    try {
      const data = await api.get<{ role: { permissions: { permissionId: string }[] } }>(`/api/roles/${role.id}`)
      const permKeys = new Set<string>()
      if (data.role.permissions) {
        for (const rp of data.role.permissions) {
          const key = reversePermMap.get(rp.permissionId)
          if (key) permKeys.add(key)
        }
      }
      setSelectedPermissions(permKeys)
    } catch {
      toast.error(t('roles.loadPermsError'))
      return
    }

    setIsFormOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setEditingRole(null)
    setFormName('')
    setFormDescription('')
    setFormLevel('50')
    setSelectedPermissions(new Set())
  }

  const togglePermission = (module: string, action: string) => {
    const key = `${module}.${action}`
    setSelectedPermissions((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const toggleModuleAll = (mod: typeof MODULES[number]) => {
    const allSelected = mod.actions.every((a) =>
      selectedPermissions.has(`${mod.key}.${a.key}`)
    )
    setSelectedPermissions((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        for (const a of mod.actions) {
          next.delete(`${mod.key}.${a.key}`)
        }
      } else {
        for (const a of mod.actions) {
          next.add(`${mod.key}.${a.key}`)
        }
      }
      return next
    })
  }

  const toggleAllPermissions = () => {
    const allKeys = MODULES.flatMap((m) =>
      m.actions.map((a) => `${m.key}.${a.key}`)
    )
    const allSelected = allKeys.every((k) => selectedPermissions.has(k))
    if (allSelected) {
      setSelectedPermissions(new Set())
    } else {
      setSelectedPermissions(new Set(allKeys))
    }
  }

  const totalPossible = MODULES.reduce((acc, m) => acc + m.actions.length, 0)
  const allKeys = MODULES.flatMap((m) =>
    m.actions.map((a) => `${m.key}.${a.key}`)
  )
  const allSelected = allKeys.every((k) => selectedPermissions.has(k))

  const handleSubmit = () => {
    if (!formName.trim()) {
      toast.error(t('roles.nameRequired'))
      return
    }

    const permissionIds = Array.from(selectedPermissions)
      .map((key) => permMap.get(key))
      .filter(Boolean) as string[]

    if (editingRole) {
      updateRole.mutate({
        id: editingRole.id,
        data: {
          name: formName.trim(),
          description: formDescription.trim(),
          level: Number(formLevel),
          permissionIds,
        },
      })
    } else {
      createRole.mutate({
        name: formName.trim(),
        description: formDescription.trim(),
        level: Number(formLevel),
        permissionIds,
      })
    }
  }

  const isSaving = createRole.isPending || updateRole.isPending

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t('roles.title')}</h2>
          <p className="text-sm text-slate-500 mt-1">
            {t('roles.subtitle')}
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => seedPermissions.mutate()}
              disabled={seedPermissions.isPending}
              variant="outline"
              className="text-amber-600 border-amber-300 hover:bg-amber-50"
            >
              {seedPermissions.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {t('roles.seedPermissions') || 'Seed Permisos'}
            </Button>
            <Button
              onClick={openCreateForm}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('roles.newRole')}
            </Button>
          </div>
        )}
      </div>

      {/* Roles Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-emerald-600" />
            {t('roles.systemRoles')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rolesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-48 hidden sm:block" />
                  <Skeleton className="h-6 w-24 ml-auto" />
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>
          ) : rolesError ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
              <p className="text-sm text-slate-600">{t('roles.loadError')}</p>
            </div>
          ) : !rolesData?.roles?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Shield className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-600">{t('roles.noRoles')}</p>
              <p className="text-xs text-slate-400 mt-1">
                {t('roles.noRolesDesc')}
              </p>
            </div>
          ) : (
            <div className="divide-y rounded-lg border overflow-hidden">
              {rolesData.roles.map((role) => (
                <motion.div
                  key={role.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 hover:bg-slate-50 transition-colors"
                >
                  {/* Role Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-slate-900 truncate">
                        {role.name}
                      </span>
                      <Badge
                        variant="secondary"
                        className={LEVEL_COLORS[role.level] || LEVEL_COLORS[10]}
                      >
                        {levelLabels[role.level] || t('roles.level', { level: role.level })}
                      </Badge>
                      {role.isDefault && (
                        <Badge variant="outline" className="text-xs">
                          {t('roles.default')}
                        </Badge>
                      )}
                    </div>
                    {role.description && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {role.description}
                      </p>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5" />
                      {role._count.permissions} {t('roles.permissions').toLowerCase()}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {role._count.users} {t('roles.users')}
                    </span>
                  </div>

                  {/* Actions */}
                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                        onClick={() => openEditForm(role)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setDeletingRole(role)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Create / Edit Dialog ──────────────────────────────────── */}
      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) closeForm() }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-600" />
              {editingRole ? t('roles.editRole') : t('roles.newRole')}
            </DialogTitle>
            <DialogDescription>
              {editingRole
                ? t('roles.editDesc')
                : t('roles.createDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Basic Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="role-name">{t('roles.roleName')}</Label>
                <Input
                  id="role-name"
                  placeholder={t('roles.roleNamePlaceholder')}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role-level">{t('roles.accessLevel')}</Label>
                <Select value={formLevel} onValueChange={setFormLevel}>
                  <SelectTrigger id="role-level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {levelOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label} ({opt.value})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-desc">{t('roles.description')}</Label>
              <Textarea
                id="role-desc"
                placeholder={t('roles.descriptionPlaceholder')}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
              />
            </div>

            {/* Permission Matrix */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">{t('roles.permissionMatrix')}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleAllPermissions}
                  className="text-xs"
                >
                  {allSelected ? (
                    <>
                      <Square className="h-3.5 w-3.5 mr-1.5" />
                      {t('common.deselectAll')}
                    </>
                  ) : (
                    <>
                      <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
                      {t('common.selectAll')}
                    </>
                  )}
                </Button>
              </div>

              {permsLoading ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {MODULES.map((mod) => {
                    const modActions = mod.actions.map((a) => `${mod.key}.${a.key}`)
                    const modAllSelected = modActions.every((k) => selectedPermissions.has(k))
                    const modSomeSelected = modActions.some((k) => selectedPermissions.has(k))

                    return (
                      <Card
                        key={mod.key}
                        className={`border transition-colors ${
                          modAllSelected
                            ? 'border-emerald-300 bg-emerald-50/50'
                            : modSomeSelected
                              ? 'border-amber-200 bg-amber-50/30'
                              : 'border-slate-200'
                        }`}
                      >
                        <CardHeader className="pb-2 pt-3 px-4">
                          <div className="flex items-center justify-between gap-2">
                            <CardTitle className="text-sm font-semibold text-slate-800 truncate">
                              {mod.label}
                            </CardTitle>
                            <button
                              type="button"
                              onClick={() => toggleModuleAll(mod)}
                              className="text-xs text-slate-400 hover:text-emerald-600 transition-colors shrink-0"
                            >
                              {modAllSelected ? t('common.deselect') : t('common.select')}
                            </button>
                          </div>
                        </CardHeader>
                        <CardContent className="px-4 pb-3 pt-0">
                          <div className="flex flex-wrap gap-x-4 gap-y-2">
                            {mod.actions.map((action) => {
                              const permKey = `${mod.key}.${action.key}`
                              const checked = selectedPermissions.has(permKey)

                              return (
                                <label
                                  key={action.key}
                                  className="flex items-center gap-2 cursor-pointer group"
                                >
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={() =>
                                      togglePermission(mod.key, action.key)
                                    }
                                    className={
                                      checked
                                        ? 'data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600'
                                        : ''
                                    }
                                  />
                                  <span
                                    className={`text-xs transition-colors ${
                                      checked
                                        ? 'text-slate-800 font-medium'
                                        : 'text-slate-500 group-hover:text-slate-700'
                                    }`}
                                  >
                                    {action.label}
                                  </span>
                                </label>
                              )
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}

              {/* Permission Summary */}
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-600">
                  {t('roles.selectedPermissions')}
                </span>
                <Badge
                  variant="secondary"
                  className={`font-semibold ${
                    selectedPermissions.size === totalPossible
                      ? 'bg-emerald-100 text-emerald-700'
                      : selectedPermissions.size > 0
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {selectedPermissions.size} / {totalPossible}
                </Badge>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={closeForm}
              disabled={isSaving}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving || !formName.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('common.saving')}
                </>
              ) : editingRole ? (
                t('roles.saveChanges')
              ) : (
                t('roles.createRoleBtn')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ───────────────────────────────────── */}
      <AlertDialog open={!!deletingRole} onOpenChange={(open) => { if (!open) setDeletingRole(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('roles.deleteConfirm', { name: deletingRole?.name || '' })}</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingRole?._count.users
                ? t('roles.deleteHasUsers', { count: deletingRole._count.users })
                : t('roles.deleteNoUsers')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingRole) deleteRole.mutate(deletingRole.id)
              }}
              disabled={!deletingRole || deletingRole._count.users > 0 || deleteRole.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteRole.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('common.deleting')}
                </>
              ) : (
                t('common.delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
