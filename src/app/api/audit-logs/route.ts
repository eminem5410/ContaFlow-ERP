import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const companyId = searchParams.get('companyId')
    const entity = searchParams.get('entity') || ''
    const action = searchParams.get('action') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const dateFrom = searchParams.get('from') || ''
    const dateTo = searchParams.get('to') || ''

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      )
    }

    const where: Record<string, unknown> = { companyId }

    if (entity) {
      where.entity = entity
    }

    if (action) {
      where.action = action
    }

    if (dateFrom && dateTo) {
      const toDate = new Date(dateTo)
      toDate.setHours(23, 59, 59, 999)
      where.createdAt = { gte: new Date(dateFrom), lte: toDate }
    } else if (dateFrom) {
      where.createdAt = { gte: new Date(dateFrom) }
    } else if (dateTo) {
      const toDate = new Date(dateTo)
      toDate.setHours(23, 59, 59, 999)
      where.createdAt = { lte: toDate }
    }

    // Export mode: limit=0 returns all matching records
    const exportMode = limit === 0

    const [auditLogs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        ...(!exportMode ? { skip: (page - 1) * limit, take: limit } : {}),
      }),
      db.auditLog.count({ where }),
    ])

    return NextResponse.json({
      auditLogs,
      pagination: {
        page: exportMode ? 1 : page,
        limit: exportMode ? total : limit,
        total,
        totalPages: exportMode ? 1 : Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Get audit logs error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
