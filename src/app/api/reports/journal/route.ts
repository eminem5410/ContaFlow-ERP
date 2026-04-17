import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const companyId = searchParams.get('companyId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      )
    }

    const where: Record<string, unknown> = {
      companyId,
      status: 'confirmado',
      ...(from || to ? { date: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      } } : {}),
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
        orderBy: [{ date: 'asc' }, { number: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.journalEntry.count({ where }),
    ])

    return NextResponse.json({
      journalEntries,
      period: {
        from: from || null,
        to: to || null,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Journal report error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
