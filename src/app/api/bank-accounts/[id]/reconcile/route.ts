import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { searchParams } = request.nextUrl
    const companyId = searchParams.get('companyId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }

    const bankAccount = await db.bankAccount.findFirst({
      where: { id: (await params).id, companyId },
    })

    if (!bankAccount) {
      return NextResponse.json({ error: 'Cuenta bancaria no encontrada' }, { status: 404 })
    }

    const dateFilter: Record<string, unknown> = {}
    if (from) dateFilter.gte = new Date(from)
    if (to) dateFilter.lte = new Date(to + 'T23:59:59')

    const payments = await db.payment.findMany({
      where: {
        bankAccountId: (await params).id,
        companyId,
        ...(from || to ? { date: dateFilter } : {}),
      },
      include: {
        client: { select: { name: true } },
        provider: { select: { name: true } },
        invoice: { select: { number: true } },
      },
      orderBy: { date: 'asc' },
    })

    const cheques = await db.cheque.findMany({
      where: {
        bankAccountId: (await params).id,
        companyId,
        ...(from || to ? { issueDate: dateFilter } : {}),
      },
      orderBy: { issueDate: 'asc' },
    })

    const totalIngresos = payments
      .filter(function (p) { return p.type === 'cobro' })
      .reduce(function (sum, p) { return sum + p.amount }, 0)

    const totalEgresos = payments
      .filter(function (p) { return p.type === 'pago' })
      .reduce(function (sum, p) { return sum + p.amount }, 0)

    const chequesDepositados = cheques
      .filter(function (c) { return c.status === 'depositado' || c.status === 'cobrado' })
      .reduce(function (sum, c) { return sum + c.amount }, 0)

    return NextResponse.json({
      bankAccount,
      payments,
      cheques,
      totalIngresos,
      totalEgresos,
      totalCheques: chequesDepositados,
      netMovement: totalIngresos - totalEgresos + chequesDepositados,
      bookBalance: bankAccount.balance,
    })
  } catch (error) {
    console.error('Reconciliation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
