import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAudit } from '@/lib/with-audit'

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

    const bankAccounts = await db.bankAccount.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ bankAccounts })
  } catch (error) {
    console.error('Get bank accounts error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withAudit('bank-account', 'POST')(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { name, bank, number, type, currency, companyId } = body

    if (!name || !companyId) {
      return NextResponse.json(
        { error: 'name and companyId are required' },
        { status: 400 }
      )
    }

    const bankAccount = await db.bankAccount.create({
      data: {
        name,
        bank: bank || null,
        number: number || null,
        type: type || 'cta_corriente',
        currency: currency || 'ARS',
        companyId,
      },
    })

    return NextResponse.json({ bankAccount }, { status: 201 })
  } catch (error) {
    console.error('Create bank account error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
