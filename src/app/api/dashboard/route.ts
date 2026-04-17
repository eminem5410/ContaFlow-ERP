import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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

    // Get all confirmed journal entry lines with account info
    const confirmedLines = await db.journalEntryLine.findMany({
      where: {
        journalEntry: {
          companyId,
          status: 'confirmado',
        },
      },
      include: {
        account: {
          select: { id: true, code: true, name: true, type: true },
        },
      },
    })

    // Get all accounts
    const accounts = await db.account.findMany({
      where: { companyId },
      select: { id: true, code: true, name: true, type: true },
    })

    // Calculate balance for each account type
    let totalAssets = 0
    let totalLiabilities = 0
    let totalEquity = 0
    let totalRevenue = 0
    let totalExpenses = 0

    interface AccountWithBalance {
      id: string
      code: string
      name: string
      type: string
      balance: number
    }

    const accountBalanceList: AccountWithBalance[] = accounts.map((account) => {
      const accountLines = confirmedLines.filter((line) => line.accountId === account.id)
      const debit = accountLines.reduce((sum, line) => sum + line.debit, 0)
      const credit = accountLines.reduce((sum, line) => sum + line.credit, 0)

      let balance: number
      if (account.type === 'activo' || account.type === 'egreso' || account.type === 'costoVenta') {
        balance = debit - credit
      } else {
        balance = credit - debit
      }

      // Accumulate by type
      switch (account.type) {
        case 'activo':
          totalAssets += balance
          break
        case 'pasivo':
          totalLiabilities += balance
          break
        case 'patrimonio':
          totalEquity += balance
          break
        case 'ingreso':
          totalRevenue += balance
          break
        case 'egreso':
          totalExpenses += balance
          break
      }

      return {
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        balance: Math.round(balance * 100) / 100,
      }
    })

    const netIncome = totalRevenue - totalExpenses

    // Count clients, providers, pending entries, and invoice/payment stats
    const [
      totalClients,
      totalProviders,
      pendingEntries,
      pendingInvoices,
      totalInvoiced,
      totalCollected,
    ] = await Promise.all([
      db.client.count({ where: { companyId } }),
      db.provider.count({ where: { companyId } }),
      db.journalEntry.count({ where: { companyId, status: 'borrador' } }),
      db.invoice.count({ where: { companyId, status: 'pendiente' } }),
      db.invoice.aggregate({ where: { companyId }, _sum: { total: true } }),
      db.payment.aggregate({
        where: { companyId, type: 'cobro' },
        _sum: { amount: true },
      }),
    ])

    // Cheque stats
    const [
      chequesEnCartera,
      chequesDepositados,
      chequesCobrados,
      chequesRechazados,
      chequesEndosados,
      chequesAnulados,
    ] = await Promise.all([
      db.cheque.aggregate({ where: { companyId, status: 'en_cartera' }, _count: true, _sum: { amount: true } }),
      db.cheque.aggregate({ where: { companyId, status: 'depositado' }, _count: true, _sum: { amount: true } }),
      db.cheque.aggregate({ where: { companyId, status: 'cobrado' }, _count: true, _sum: { amount: true } }),
      db.cheque.aggregate({ where: { companyId, status: 'rechazado' }, _count: true, _sum: { amount: true } }),
      db.cheque.aggregate({ where: { companyId, status: 'endosado' }, _count: true, _sum: { amount: true } }),
      db.cheque.aggregate({ where: { companyId, status: 'anulado' }, _count: true, _sum: { amount: true } }),
    ])

    const chequeStats = {
      enCartera: { count: chequesEnCartera._count, total: chequesEnCartera._sum.amount || 0 },
      depositados: { count: chequesDepositados._count, total: chequesDepositados._sum.amount || 0 },
      cobrados: { count: chequesCobrados._count, total: chequesCobrados._sum.amount || 0 },
      rechazados: { count: chequesRechazados._count, total: chequesRechazados._sum.amount || 0 },
      endosados: { count: chequesEndosados._count, total: chequesEndosados._sum.amount || 0 },
      anulados: { count: chequesAnulados._count, total: chequesAnulados._sum.amount || 0 },
    }

    // Get last 5 journal entries
    const recentEntries = await db.journalEntry.findMany({
      where: { companyId },
      orderBy: [{ date: 'desc' }, { number: 'desc' }],
      take: 5,
      select: {
        id: true,
        number: true,
        date: true,
        description: true,
        status: true,
        totalDebit: true,
        totalCredit: true,
      },
    })

    // Monthly data for last 6 months
    const now = new Date()
    const monthlyData: Array<{
      month: string
      year: number
      ingresos: number
      egresos: number
    }> = []

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)

      // Query monthly data from DB
      const monthConfirmedEntries = await db.journalEntry.findMany({
        where: {
          companyId,
          status: 'confirmado',
          date: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        include: {
          lines: {
            include: {
              account: {
                select: { type: true },
              },
            },
          },
        },
      })

      let monthIngresos = 0
      let monthEgresos = 0

      // From confirmed journal entries (ingreso/egreso account types)
      for (const entry of monthConfirmedEntries) {
        for (const line of entry.lines) {
          if (line.account.type === 'ingreso') {
            monthIngresos += line.credit - line.debit
          } else if (line.account.type === 'egreso') {
            monthEgresos += line.debit - line.credit
          }
        }
      }

      // Also include invoice totals and payment totals for the month.
      // Use 'date' (business date) instead of 'createdAt' for accurate monthly breakdown.
      // - Sales invoices (not anulada) count as income
      // - Provider payments (type: 'pago') count as expenses
      // - Client collections (type: 'cobro') count as income (actual cash received)
      const [monthInvoices, monthCobros, monthPayments] = await Promise.all([
        db.invoice.aggregate({
          where: {
            companyId,
            date: { gte: monthStart, lte: monthEnd },
            status: { notIn: ['anulada'] },
          },
          _sum: { total: true },
        }),
        db.payment.aggregate({
          where: {
            companyId,
            date: { gte: monthStart, lte: monthEnd },
            type: 'cobro',
          },
          _sum: { amount: true },
        }),
        db.payment.aggregate({
          where: {
            companyId,
            date: { gte: monthStart, lte: monthEnd },
            type: 'pago',
          },
          _sum: { amount: true },
        }),
      ])

      monthIngresos += monthInvoices._sum.total || 0
      monthIngresos += monthCobros._sum.amount || 0
      monthEgresos += monthPayments._sum.amount || 0

      const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
      ]

      monthlyData.push({
        month: monthNames[date.getMonth()],
        year: date.getFullYear(),
        ingresos: Math.round(monthIngresos * 100) / 100,
        egresos: Math.round(monthEgresos * 100) / 100,
      })
    }

    // Top 10 accounts by absolute balance
    const topAccounts = accountBalanceList
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
      .slice(0, 10)

    return NextResponse.json({
      totalAssets: Math.round(totalAssets * 100) / 100,
      totalLiabilities: Math.round(totalLiabilities * 100) / 100,
      totalEquity: Math.round(totalEquity * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netIncome: Math.round(netIncome * 100) / 100,
      totalClients,
      totalProviders,
      pendingEntries,
      pendingInvoices,
      totalInvoiced: totalInvoiced._sum.total || 0,
      totalCollected: totalCollected._sum.amount || 0,
      recentEntries: recentEntries.map((entry) => ({
        ...entry,
        date: entry.date.toISOString().split('T')[0],
        total: entry.totalDebit,
      })),
      monthlyData,
      accountBalances: topAccounts,
      chequeStats,
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
