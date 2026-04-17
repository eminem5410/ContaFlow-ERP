import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const companyId = searchParams.get('companyId')
    const asOfDate = searchParams.get('asOf') // YYYY-MM-DD

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      )
    }

    // Build date filter for confirmed entries
    const entryWhere: Record<string, unknown> = {
      companyId,
      status: 'confirmado',
    }

    if (asOfDate) {
      entryWhere.date = { lte: new Date(asOfDate) }
    }

    // Get all confirmed journal entry lines with account info
    const lines = await db.journalEntryLine.findMany({
      where: {
        journalEntry: entryWhere,
      },
      include: {
        account: {
          select: { id: true, code: true, name: true, type: true, subtype: true },
        },
        journalEntry: {
          select: { date: true },
        },
      },
    })

    // Get all accounts for the company
    const accounts = await db.account.findMany({
      where: { companyId },
      select: { id: true, code: true, name: true, type: true, subtype: true },
      orderBy: { code: 'asc' },
    })

    // Calculate balance for each account
    interface AccountBalance {
      id: string
      code: string
      name: string
      type: string
      subtype: string | null
      debit: number
      credit: number
      balance: number
    }

    const accountBalances: AccountBalance[] = accounts.map((account) => {
      const accountLines = lines.filter((line) => line.accountId === account.id)
      const debit = accountLines.reduce((sum, line) => sum + line.debit, 0)
      const credit = accountLines.reduce((sum, line) => sum + line.credit, 0)

      let balance: number
      // For activo and egreso: balance = debit - credit
      if (account.type === 'activo' || account.type === 'egreso') {
        balance = debit - credit
      }
      // For pasivo, patrimonio, and ingreso: balance = credit - debit
      else {
        balance = credit - debit
      }

      return {
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        subtype: account.subtype,
        debit,
        credit,
        balance,
      }
    })

    // Separate by type
    const activos = accountBalances
      .filter((a) => a.type === 'activo')
      .sort((a, b) => a.code.localeCompare(b.code))

    const pasivos = accountBalances
      .filter((a) => a.type === 'pasivo')
      .sort((a, b) => a.code.localeCompare(b.code))

    const patrimonio = accountBalances
      .filter((a) => a.type === 'patrimonio')
      .sort((a, b) => a.code.localeCompare(b.code))

    const totalActivo = activos.reduce((sum, a) => sum + a.balance, 0)
    const totalPasivo = pasivos.reduce((sum, a) => sum + a.balance, 0)
    const totalPatrimonio = patrimonio.reduce((sum, a) => sum + a.balance, 0)
    const totalPasivoPatrimonio = totalPasivo + totalPatrimonio

    return NextResponse.json({
      asOf: asOfDate || new Date().toISOString().split('T')[0],
      activos,
      pasivos,
      patrimonio,
      totalActivo: Math.round(totalActivo * 100) / 100,
      totalPasivo: Math.round(totalPasivo * 100) / 100,
      totalPatrimonio: Math.round(totalPatrimonio * 100) / 100,
      totalPasivoPatrimonio: Math.round(totalPasivoPatrimonio * 100) / 100,
      balanced: Math.abs(totalActivo - totalPasivoPatrimonio) < 0.01,
    })
  } catch (error) {
    console.error('Balance sheet error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
