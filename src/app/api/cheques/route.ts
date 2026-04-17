import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAudit } from '@/lib/with-audit'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const companyId = searchParams.get('companyId')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const chequeType = searchParams.get('chequeType') || ''
    const bank = searchParams.get('bank') || ''
    const fromDate = searchParams.get('fromDate') || ''
    const toDate = searchParams.get('toDate') || ''
    const orderBy = searchParams.get('orderBy') || 'issueDate_desc'
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
        { number: { contains: search, mode: 'insensitive' } },
        { bank: { contains: search, mode: 'insensitive' } },
        { issuerName: { contains: search, mode: 'insensitive' } },
        { issuerCuit: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (status && status !== 'all') {
      where.status = status
    }

    if (chequeType && chequeType !== 'all') {
      where.chequeType = chequeType
    }

    if (bank) {
      where.bank = { contains: bank, mode: 'insensitive' }
    }

    if (fromDate || toDate) {
      const dateFilter: Record<string, unknown> = {}
      if (fromDate) {
        dateFilter.gte = new Date(fromDate)
      }
      if (toDate) {
        dateFilter.lte = new Date(toDate)
      }
      where.paymentDate = dateFilter
    }

    let orderByClause: Record<string, string> = { issueDate: 'desc' }
    if (orderBy === 'paymentDate_asc') {
      orderByClause = { paymentDate: 'asc' }
    } else if (orderBy === 'amount_desc') {
      orderByClause = { amount: 'desc' }
    }

    const [cheques, total] = await Promise.all([
      db.cheque.findMany({
        where,
        orderBy: orderByClause,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          client: { select: { id: true, name: true } },
          provider: { select: { id: true, name: true } },
          bankAccount: { select: { id: true, name: true, bank: true } },
        },
      }),
      db.cheque.count({ where }),
    ])

    return NextResponse.json({
      cheques,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Get cheques error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withAudit('cheque', 'POST')(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const {
      number,
      bank,
      branch,
      accountType,
      chequeType,
      amount,
      currency,
      issueDate,
      paymentDate,
      issuerName,
      issuerCuit,
      notes,
      clientId,
      providerId,
      bankAccountId,
      companyId,
    } = body

    if (!number || !bank || !companyId) {
      return NextResponse.json(
        { error: 'number, bank and companyId are required' },
        { status: 400 }
      )
    }

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: 'amount must be greater than 0' },
        { status: 400 }
      )
    }

    const resolvedChequeType = chequeType || 'tercero'
    const autoStatus = resolvedChequeType === 'propio' ? 'emitido' : 'en_cartera'

    const cheque = await db.cheque.create({
      data: {
        number,
        bank,
        branch: branch || null,
        accountType: accountType || 'cta_corriente',
        chequeType: resolvedChequeType,
        status: autoStatus,
        amount: parseFloat(amount),
        currency: currency || 'ARS',
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        issuerName: issuerName || null,
        issuerCuit: issuerCuit || null,
        notes: notes || null,
        clientId: clientId || null,
        providerId: providerId || null,
        bankAccountId: bankAccountId || null,
        companyId,
      },
    })

    return NextResponse.json({ cheque }, { status: 201 })
  } catch (error) {
    console.error('Create cheque error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
