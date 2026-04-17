import { useAppStore } from '@/lib/store'

export function usePermission() {
  const userPermissions = useAppStore((s) => s.userPermissions)
  const userRole = useAppStore((s) => s.user?.role)
  const setPermissions = useAppStore((s) => s.setPermissions)

  const hasPermission = (module: string, action: string): boolean => {
    if (userRole === 'admin' || !userRole) return true
    return userPermissions.includes(`${module}.${action}`)
  }

  const canView = (module: string) => hasPermission(module, 'view')
  const canCreate = (module: string) => hasPermission(module, 'create')
  const canEdit = (module: string) => hasPermission(module, 'edit')
  const canDelete = (module: string) => hasPermission(module, 'delete')
  const canConfirm = (module: string) => hasPermission(module, 'confirm')
  const canExport = (module: string) => hasPermission(module, 'export')

  return {
    hasPermission,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canConfirm,
    canExport,
    isAdmin: userRole === 'admin',
    setPermissions,
  }
}
