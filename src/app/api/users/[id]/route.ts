import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAudit } from '@/lib/with-audit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const PUT = withAudit('user', 'PUT')(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, email, role, currentUserId } = body

    const existingUser = await db.user.findUnique({
      where: { id },
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check for duplicate email if email is being changed
    if (email && email !== existingUser.email) {
      const duplicateEmail = await db.user.findUnique({
        where: { email },
      })
      if (duplicateEmail) {
        return NextResponse.json(
          { error: 'Email already registered to another user' },
          { status: 409 }
        )
      }
    }

    // If changing role away from admin, check if this is the last admin
    if (role && role !== 'admin' && existingUser.role === 'admin') {
      if (currentUserId && currentUserId === id) {
        return NextResponse.json(
          { error: 'Cannot change your own role from admin' },
          { status: 400 }
        )
      }

      const adminCount = await db.user.count({
        where: { companyId: existingUser.companyId, role: 'admin' },
      })

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot change role: this is the last admin in the company' },
          { status: 400 }
        )
      }
    }

    const validRoles = ['admin', 'contador', 'visualizador']
    const updateData: Record<string, string> = {}
    if (name) updateData.name = name
    if (email) updateData.email = email
    if (role && validRoles.includes(role)) updateData.role = role

    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

export const DELETE = withAudit('user', 'DELETE')(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params

    const user = await db.user.findUnique({
      where: { id },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Cannot delete self
    const { searchParams } = request.nextUrl
    const currentUserId = searchParams.get('currentUserId')
    if (currentUserId && currentUserId === id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    // Cannot delete last admin
    if (user.role === 'admin') {
      const adminCount = await db.user.count({
        where: { companyId: user.companyId, role: 'admin' },
      })

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last admin in the company' },
          { status: 400 }
        )
      }
    }

    await db.user.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
