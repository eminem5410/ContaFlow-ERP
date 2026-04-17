import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { DEFAULT_PERMISSIONS } from '../../../../../prisma/seed-permissions'

// Modules that only Administrador should have access to
const ADMIN_ONLY_MODULES = ['users', 'roles', 'settings']

// Actions that only Administrador should have (excluded from Contador)
const ADMIN_ONLY_ACTIONS = ['delete']

// Actions that Visualizador has (view only)
const VIEWER_ACTIONS = ['view']

// POST /api/permissions/seed – Seed default permissions and create default roles
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId } = body

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      )
    }

    // Verify company exists
    const company = await db.company.findUnique({
      where: { id: companyId },
    })

    if (!company) {
      return NextResponse.json(
        { error: 'Empresa no encontrada' },
        { status: 404 }
      )
    }

    // Seed permissions using upsert
    const seededPermissions = await db.$transaction(
      DEFAULT_PERMISSIONS.map((p) =>
        db.permission.upsert({
          where: {
            module_action: {
              module: p.module,
              action: p.action,
            },
          },
          update: {
            description: p.description,
          },
          create: {
            module: p.module,
            action: p.action,
            description: p.description,
          },
        })
      )
    )

    // Fetch all permissions from DB for role assignment
    const allPermissions = await db.permission.findMany()

    // Administrador: ALL permissions
    const adminPermissionIds = allPermissions.map((p) => p.id)

    // Contador: view, create, edit, confirm, export – but NOT delete, users, roles, settings
    const contadorPermissionIds = allPermissions
      .filter((p) => {
        if (ADMIN_ONLY_MODULES.includes(p.module)) return false
        if (ADMIN_ONLY_ACTIONS.includes(p.action)) return false
        return true
      })
      .map((p) => p.id)

    // Visualizador: only view permissions
    const viewerPermissionIds = allPermissions
      .filter((p) => VIEWER_ACTIONS.includes(p.action))
      .map((p) => p.id)

    // Create default roles in a transaction
    const result = await db.$transaction(async (tx) => {
      // 1. Administrador (level 100)
      const adminRole = await tx.role.upsert({
        where: {
          companyId_name: {
            companyId,
            name: 'Administrador',
          },
        },
        update: {
          description: 'Acceso total al sistema',
          level: 100,
          isDefault: true,
        },
        create: {
          name: 'Administrador',
          description: 'Acceso total al sistema',
          level: 100,
          isDefault: true,
          companyId,
        },
      })

      // Replace all permissions for Administrador
      await tx.rolePermission.deleteMany({ where: { roleId: adminRole.id } })
      await tx.rolePermission.createMany({
        data: adminPermissionIds.map((permissionId) => ({
          roleId: adminRole.id,
          permissionId,
        })),
        skipDuplicates: true,
      })

      // 2. Contador (level 50)
      const contadorRole = await tx.role.upsert({
        where: {
          companyId_name: {
            companyId,
            name: 'Contador',
          },
        },
        update: {
          description: 'Acceso a operaciones contables, sin administración',
          level: 50,
          isDefault: false,
        },
        create: {
          name: 'Contador',
          description: 'Acceso a operaciones contables, sin administración',
          level: 50,
          isDefault: false,
          companyId,
        },
      })

      // Replace all permissions for Contador
      await tx.rolePermission.deleteMany({ where: { roleId: contadorRole.id } })
      await tx.rolePermission.createMany({
        data: contadorPermissionIds.map((permissionId) => ({
          roleId: contadorRole.id,
          permissionId,
        })),
        skipDuplicates: true,
      })

      // 3. Visualizador (level 10)
      const viewerRole = await tx.role.upsert({
        where: {
          companyId_name: {
            companyId,
            name: 'Visualizador',
          },
        },
        update: {
          description: 'Solo lectura en todo el sistema',
          level: 10,
          isDefault: false,
        },
        create: {
          name: 'Visualizador',
          description: 'Solo lectura en todo el sistema',
          level: 10,
          isDefault: false,
          companyId,
        },
      })

      // Replace all permissions for Visualizador
      await tx.rolePermission.deleteMany({ where: { roleId: viewerRole.id } })
      await tx.rolePermission.createMany({
        data: viewerPermissionIds.map((permissionId) => ({
          roleId: viewerRole.id,
          permissionId,
        })),
        skipDuplicates: true,
      })

      return {
        permissionsSeeded: seededPermissions.length,
        roles: [
          { name: adminRole.name, permissionsCount: adminPermissionIds.length },
          { name: contadorRole.name, permissionsCount: contadorPermissionIds.length },
          { name: viewerRole.name, permissionsCount: viewerPermissionIds.length },
        ],
      }
    })

    return NextResponse.json({
      message: 'Permisos y roles por defecto creados correctamente',
      ...result,
    })
  } catch (error) {
    console.error('Seed permissions error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
