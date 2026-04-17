import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAudit } from '@/lib/with-audit'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const companyId = searchParams.get('companyId')
    const search = searchParams.get('search') || ''
    const type = searchParams.get('type') || ''
    const method = searchParams.get('method') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      )
    }

    const where: Record<string, unknown> = { companyId }

    if (search) {
      where.OR = [
        { client: { name: { contains: search } } },
        { provider: { name: { contains: search } } },
        { reference: { contains: search } },
      ]
    }

    if (type) {
      where.type = type
    }

    if (method) {
      where.method = method
    }

    const [payments, total] = await Promise.all([
      db.payment.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          client: {
            select: { id: true, name: true },
          },
          provider: {
            select: { id: true, name: true },
          },
          invoice: {
            select: { id: true, number: true },
          },
          bankAccount: {
            select: { id: true, name: true },
          },
        },
      }),
      db.payment.count({ where }),
    ])

    return NextResponse.json({
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Get payments error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withAudit('payment', 'POST')(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const {
      amount,
      method,
      reference,
      type,
      notes,
      invoiceId,
      clientId,
      providerId,
      bankAccountId,
      companyId,
      date,
    } = body

    if (!amount || !companyId) {
      return NextResponse.json(
        { error: 'amount and companyId are required' },
        { status: 400 }
      )
    }

    // Auto-generate number based on type
    const prefix = type === 'pago' ? 'PAG' : 'REC'
    const lastPayment = await db.payment.findFirst({
      where: { companyId, type: type || 'cobro' },
      orderBy: { createdAt: 'desc' },
      select: { number: true },
    })

    let nextNum = 1
    if (lastPayment?.number) {
      const match = lastPayment.number.match(/\d+/)
      if (match) {
        nextNum = parseInt(match[0]) + 1
      }
    }
    const number = `${prefix}-${String(nextNum).padStart(4, '0')}`

    if (invoiceId) {
      // Create payment and update invoice in a transaction
      const result = await db.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            number,
            amount,
            method: method || 'transferencia',
            reference: reference || null,
            type: type || 'cobro',
            notes: notes || null,
            invoiceId,
            clientId: clientId || null,
            providerId: providerId || null,
            bankAccountId: bankAccountId || null,
            companyId,
            date: date ? new Date(date) : undefined,
          },
        })

        const invoice = await tx.invoice.findUnique({
          where: { id: invoiceId },
        })

        if (invoice) {
          const newAmountPaid = (invoice.amountPaid || 0) + amount
          let status = invoice.status
          if (newAmountPaid >= invoice.total) {
            status = 'pagada'
          } else if (newAmountPaid > 0) {
            status = 'pagada_parcial'
          }

          await tx.invoice.update({
            where: { id: invoiceId },
            data: {
              amountPaid: newAmountPaid,
              status,
            },
          })
        }

        return payment
      })

      return NextResponse.json({ payment: result }, { status: 201 })
    }

    // Create payment without invoice link
    const payment = await db.payment.create({
      data: {
        number,
        amount,
        method: method || 'transferencia',
        reference: reference || null,
        type: type || 'cobro',
        notes: notes || null,
        clientId: clientId || null,
        providerId: providerId || null,
        bankAccountId: bankAccountId || null,
        companyId,
        date: date ? new Date(date) : undefined,
      },
    })

    return NextResponse.json({ payment }, { status: 201 })
  } catch (error) {
    console.error('Create payment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
