import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAudit } from '@/lib/with-audit'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const companyId = searchParams.get('companyId')
    const status = searchParams.get('status') || 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      )
    }

    const where: Record<string, unknown> = { companyId }
    if (status !== 'all') {
      where.status = status
    }

    const [journalEntries, total] = await Promise.all([
      db.journalEntry.findMany({
        where,
        include: {
          lines: {
            include: {
              account: {
                select: { id: true, code: true, name: true },
              },
            },
            orderBy: { id: 'asc' },
          },
        },
        orderBy: [{ date: 'desc' }, { number: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.journalEntry.count({ where }),
    ])

    return NextResponse.json({
      journalEntries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Get journal entries error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withAudit('journal-entry', 'POST')(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { date, description, concept, companyId, lines } = body

    if (!date || !description || !companyId || !lines || lines.length < 2) {
      return NextResponse.json(
        { error: 'date, description, companyId, and at least 2 lines are required' },
        { status: 400 }
      )
    }

    // Validate double-entry: totalDebit MUST equal totalCredit (within 0.01 tolerance)
    const totalDebit = lines.reduce((sum: number, line: { debit: number }) => sum + (line.debit || 0), 0)
    const totalCredit = lines.reduce((sum: number, line: { credit: number }) => sum + (line.credit || 0), 0)

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json(
        {
          error: `Double-entry validation failed: total debit (${totalDebit}) must equal total credit (${totalCredit})`,
        },
        { status: 400 }
      )
    }

    if (totalDebit === 0) {
      return NextResponse.json(
        { error: 'Total debit and credit must be greater than zero' },
        { status: 400 }
      )
    }

    // Validate all account IDs exist in the company
    const accountIds = lines.map((line: { accountId: string }) => line.accountId)
    const accounts = await db.account.findMany({
      where: {
        id: { in: accountIds },
        companyId,
      },
    })

    if (accounts.length !== accountIds.length) {
      const foundIds = accounts.map((a) => a.id)
      const missingIds = accountIds.filter((id: string) => !foundIds.includes(id))
      return NextResponse.json(
        { error: `Some accounts not found in this company: ${missingIds.join(', ')}` },
        { status: 400 }
      )
    }

    // Auto-assign sequential number
    const lastEntry = await db.journalEntry.findFirst({
      where: { companyId },
      orderBy: { number: 'desc' },
      select: { number: true },
    })
    const nextNumber = (lastEntry?.number || 0) + 1

    // Create journal entry with lines
    const journalEntry = await db.journalEntry.create({
      data: {
        number: nextNumber,
        date: new Date(date),
        description,
        concept: concept || null,
        status: 'borrador',
        companyId,
        totalDebit,
        totalCredit,
        lines: {
          create: lines.map((line: { accountId: string; debit: number; credit: number; description?: string }) => ({
            accountId: line.accountId,
            debit: line.debit || 0,
            credit: line.credit || 0,
            description: line.description || null,
          })),
        },
      },
      include: {
        lines: {
          include: {
            account: {
              select: { id: true, code: true, name: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ journalEntry }, { status: 201 })
  } catch (error) {
    console.error('Create journal entry error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
