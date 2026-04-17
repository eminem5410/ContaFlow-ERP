import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAudit } from '@/lib/with-audit'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      )
    }

    const accounts = await db.account.findMany({
      where: { companyId },
      include: {
        parent: {
          select: { id: true, code: true, name: true },
        },
      },
      orderBy: { code: 'asc' },
    })

    // Calculate real balances from confirmed journal lines
    const confirmedLines = await db.journalEntryLine.findMany({
      where: {
        journalEntry: {
          companyId,
          status: 'confirmado',
        },
      },
    })

    // Build a map of accountId -> balance
    const balanceMap: Record<string, number> = {}
    for (const line of confirmedLines) {
      if (!balanceMap[line.accountId]) {
        balanceMap[line.accountId] = 0
      }
      // Find the account type to know debit/credit nature
      // For now, accumulate raw debit and credit
    }

    // Get account types for balance calculation
    const accountTypes: Record<string, string> = {}
    for (const account of accounts) {
      accountTypes[account.id] = account.type
    }

    // Calculate balances: Debit nature (activo, egreso) = debit - credit; Credit nature (pasivo, patrimonio, ingreso) = credit - debit
    for (const line of confirmedLines) {
      if (!balanceMap[line.accountId]) {
        balanceMap[line.accountId] = 0
      }
      const type = accountTypes[line.accountId]
      if (type === 'activo' || type === 'egreso' || type === 'costoVenta') {
        balanceMap[line.accountId] += line.debit - line.credit
      } else {
        balanceMap[line.accountId] += line.credit - line.debit
      }
    }

    // For parent accounts, sum children balances
    function calcChildrenBalance(accountId: string): number {
      const children = accounts.filter(a => a.parentId === accountId)
      if (children.length === 0) {
        return Math.round((balanceMap[accountId] || 0) * 100) / 100
      }
      return children.reduce((sum, child) => sum + calcChildrenBalance(child.id), 0)
    }

    // Enrich accounts with calculated balances
    const enrichedAccounts = accounts.map(account => ({
      ...account,
      balance: calcChildrenBalance(account.id),
    }))

    return NextResponse.json({ accounts: enrichedAccounts })
  } catch (error) {
    console.error('Get accounts error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withAudit('account', 'POST')(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { code, name, type, subtype, parentId, companyId } = body

    if (!code || !name || !type || !companyId) {
      return NextResponse.json(
        { error: 'code, name, type, and companyId are required' },
        { status: 400 }
      )
    }

    // Validate unique code within company
    const existingAccount = await db.account.findUnique({
      where: { companyId_code: { companyId, code } },
    })

    if (existingAccount) {
      return NextResponse.json(
        { error: 'Ya existe una cuenta con ese código en esta empresa' },
        { status: 409 }
      )
    }

    // Validate parent account exists and belongs to same company
    if (parentId) {
      const parentAccount = await db.account.findFirst({
        where: { id: parentId, companyId },
      })
      if (!parentAccount) {
        return NextResponse.json(
          { error: 'Cuenta padre no encontrada en esta empresa' },
          { status: 400 }
        )
      }
    }

    // Calculate level based on parent
    let level = 1
    if (parentId) {
      const parent = await db.account.findUnique({ where: { id: parentId } })
      level = (parent?.level || 0) + 1
    }

    const account = await db.account.create({
      data: {
        code,
        name,
        type,
        subtype: subtype || null,
        parentId: parentId || null,
        level,
        companyId,
      },
      include: {
        parent: {
          select: { id: true, code: true, name: true },
        },
      },
    })

    return NextResponse.json({ account }, { status: 201 })
  } catch (error) {
    console.error('Create account error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
