import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAudit } from '@/lib/with-audit'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const companyId = searchParams.get('companyId')
    const search = searchParams.get('search') || ''
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
        { name: { contains: search } },
        { cuit: { contains: search } },
        { email: { contains: search } },
      ]
    }

    const [clients, total] = await Promise.all([
      db.client.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.client.count({ where }),
    ])

    return NextResponse.json({
      clients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Get clients error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withAudit('client', 'POST')(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { name, cuit, email, phone, address, city, province, notes, companyId, code } = body

    if (!name || !companyId) {
      return NextResponse.json(
        { error: 'name and companyId are required' },
        { status: 400 }
      )
    }

    // Check if CUIT already exists
    if (cuit) {
      const existingClient = await db.client.findUnique({
        where: { cuit },
      })

      if (existingClient) {
        return NextResponse.json(
          { error: 'CUIT already registered' },
          { status: 409 }
        )
      }
    }

    // Auto-generate code if not provided
    let clientCode = code
    if (!clientCode) {
      const lastClient = await db.client.findFirst({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        select: { code: true },
      })

      let nextNum = 1
      if (lastClient?.code) {
        const match = lastClient.code.match(/\d+/)
        if (match) {
          nextNum = parseInt(match[0]) + 1
        }
      }
      clientCode = `CL${String(nextNum).padStart(3, '0')}`
    }

    const client = await db.client.create({
      data: {
        code: clientCode,
        name,
        cuit: cuit || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        city: city || null,
        province: province || null,
        notes: notes || null,
        companyId,
      },
    })

    return NextResponse.json({ client }, { status: 201 })
  } catch (error) {
    console.error('Create client error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
