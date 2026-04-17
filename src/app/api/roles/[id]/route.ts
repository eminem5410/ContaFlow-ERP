import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAudit } from '@/lib/with-audit'

// GET /api/roles/[id] – Get role by id with full permissions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const role = await db.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: { permission: true },
        },
        _count: {
          select: { users: true },
        },
        company: {
          select: { id: true, name: true },
        },
      },
    })

    if (!role) {
      return NextResponse.json(
        { error: 'Rol no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ role })
  } catch (error) {
    console.error('Get role error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/roles/[id] – Update role (name, description, level, permissions)
export const PUT = withAudit('role', 'PUT')(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, level, permissionIds } = body

    // Check role exists
    const existing = await db.role.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Rol no encontrado' },
        { status: 404 }
      )
    }

    // Check for duplicate name if name is being changed
    if (name && name !== existing.name) {
      const duplicate = await db.role.findUnique({
        where: {
          companyId_name: {
            companyId: existing.companyId,
            name,
          },
        },
      })

      if (duplicate) {
        return NextResponse.json(
          { error: 'Ya existe un rol con ese nombre en esta empresa' },
          { status: 409 }
        )
      }
    }

    // Validate permissionIds if provided
    if (permissionIds && permissionIds.length > 0) {
      const permissionsCount = await db.permission.count({
        where: { id: { in: permissionIds } },
      })

      if (permissionsCount !== permissionIds.length) {
        return NextResponse.json(
          { error: 'Uno o más permisos no válidos' },
          { status: 400 }
        )
      }
    }

    // Update role and replace permissions in a transaction
    const updatedRole = await db.$transaction(async (tx) => {
      // Update role fields
      await tx.role.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(level !== undefined && { level }),
        },
      })

      // Replace permissions if permissionIds is provided
      if (permissionIds !== undefined) {
        // Delete existing role-permission entries
        await tx.rolePermission.deleteMany({
          where: { roleId: id },
        })

        // Create new role-permission entries
        if (permissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: permissionIds.map((permissionId: string) => ({
              roleId: id,
              permissionId,
            })),
          })
        }
      }

      // Return updated role with permissions
      return tx.role.findUnique({
        where: { id },
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      })
    })

    return NextResponse.json({ role: updatedRole })
  } catch (error) {
    console.error('Update role error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})

// DELETE /api/roles/[id] – Delete role (check if users are assigned first)
export const DELETE = withAudit('role', 'DELETE')(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params

    // Check role exists
    const existing = await db.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Rol no encontrado' },
        { status: 404 }
      )
    }

    // Check if users are assigned to this role
    if (existing._count.users > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar el rol porque tiene ${existing._count.users} usuario(s) asignado(s). Reasigne los usuarios antes de eliminar.` },
        { status: 400 }
      )
    }

    // Delete role (cascade will delete RolePermission entries)
    await db.role.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Rol eliminado correctamente' })
  } catch (error) {
    console.error('Delete role error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})
