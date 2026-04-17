import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAudit } from '@/lib/with-audit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const account = await db.account.findUnique({
      where: { id },
      include: {
        parent: {
          select: { id: true, code: true, name: true },
        },
        children: {
          select: { id: true, code: true, name: true, type: true },
        },
        _count: {
          select: { journalLines: true },
        },
      },
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ account })
  } catch (error) {
    console.error('Get account error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const PUT = withAudit('account', 'PUT')(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params
    const body = await request.json()
    const { code, name, type, subtype, parentId } = body

    const existingAccount = await db.account.findUnique({
      where: { id },
    })

    if (!existingAccount) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // If code is being changed, check uniqueness
    if (code && code !== existingAccount.code) {
      const duplicateCode = await db.account.findUnique({
        where: {
          companyId_code: {
            companyId: existingAccount.companyId,
            code,
          },
        },
      })

      if (duplicateCode) {
        return NextResponse.json(
          { error: 'Account code already exists in this company' },
          { status: 409 }
        )
      }
    }

    // Validate parent account exists and belongs to same company
    if (parentId && parentId !== existingAccount.parentId) {
      if (parentId === id) {
        return NextResponse.json(
          { error: 'Account cannot be its own parent' },
          { status: 400 }
        )
      }
      const parentAccount = await db.account.findFirst({
        where: { id: parentId, companyId: existingAccount.companyId },
      })
      if (!parentAccount) {
        return NextResponse.json(
          { error: 'Parent account not found in this company' },
          { status: 400 }
        )
      }
    }

    const account = await db.account.update({
      where: { id },
      data: {
        ...(code && { code }),
        ...(name && { name }),
        ...(type && { type }),
        ...(subtype !== undefined && { subtype: subtype || null }),
        ...(parentId !== undefined && { parentId: parentId || null }),
        level: parentId ? 2 : 1,
      },
      include: {
        parent: {
          select: { id: true, code: true, name: true },
        },
      },
    })

    return NextResponse.json({ account })
  } catch (error) {
    console.error('Update account error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

export const DELETE = withAudit('account', 'DELETE')(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params

    const account = await db.account.findUnique({
      where: { id },
      include: {
        _count: {
          select: { journalLines: true },
        },
        children: {
          select: { id: true },
        },
      },
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Check if account has journal lines
    if (account._count.journalLines > 0) {
      return NextResponse.json(
        { error: 'Cannot delete account with journal entries. It has associated lines.' },
        { status: 400 }
      )
    }

    // Check if account has children
    if (account.children.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete account with child accounts. Delete children first.' },
        { status: 400 }
      )
    }

    await db.account.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Account deleted successfully' })
  } catch (error) {
    console.error('Delete account error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
