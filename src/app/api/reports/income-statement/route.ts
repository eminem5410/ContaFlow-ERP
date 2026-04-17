import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const companyId = searchParams.get('companyId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

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
      ...(from || to ? { date: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      } } : {}),
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
      },
    })

    // Get all ingreso, egreso, and costoVentas accounts for the company
    const accounts = await db.account.findMany({
      where: {
        companyId,
        type: { in: ['ingreso', 'egreso', 'costoVenta'] },
      },
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
      totalDebit: number
      totalCredit: number
      balance: number
    }

    const accountBalances: AccountBalance[] = accounts.map((account) => {
      const accountLines = lines.filter((line) => line.accountId === account.id)
      const totalDebit = accountLines.reduce((sum, line) => sum + line.debit, 0)
      const totalCredit = accountLines.reduce((sum, line) => sum + line.credit, 0)

      let balance: number
      if (account.type === 'egreso' || account.type === 'costoVenta') {
        balance = totalDebit - totalCredit
      } else {
        balance = totalCredit - totalDebit
      }

      return {
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        subtype: account.subtype,
        totalDebit,
        totalCredit,
        balance,
      }
    })

    const ingresos = accountBalances
      .filter((a) => a.type === 'ingreso')
      .sort((a, b) => a.code.localeCompare(b.code))

    const egresos = accountBalances
      .filter((a) => a.type === 'egreso')
      .sort((a, b) => a.code.localeCompare(b.code))

    const costoVentas = accountBalances
      .filter((a) => a.type === 'costoVenta')
      .sort((a, b) => a.code.localeCompare(b.code))

    const totalIngresos = ingresos.reduce((sum, a) => sum + a.balance, 0)
    const totalEgresos = egresos.reduce((sum, a) => sum + a.balance, 0)
    const totalCostoVentas = costoVentas.reduce((sum, a) => sum + a.balance, 0)
    const resultadoNeto = totalIngresos - totalEgresos - totalCostoVentas

    return NextResponse.json({
      period: {
        from: from || null,
        to: to || null,
      },
      ingresos,
      egresos,
      costoVentas,
      totalIngresos: Math.round(totalIngresos * 100) / 100,
      totalEgresos: Math.round(totalEgresos * 100) / 100,
      totalCostoVentas: Math.round(totalCostoVentas * 100) / 100,
      resultadoNeto: Math.round(resultadoNeto * 100) / 100,
    })
  } catch (error) {
    console.error('Income statement error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
