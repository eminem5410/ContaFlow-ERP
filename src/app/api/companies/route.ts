import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    const company = await db.company.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            accounts: true,
            journalEntries: true,
            clients: true,
            providers: true,
            bankAccounts: true,
          },
        },
      },
    })

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ company })
  } catch (error) {
    console.error('Get company error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
