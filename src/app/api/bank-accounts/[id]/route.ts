import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAudit } from '@/lib/with-audit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const bankAccount = await db.bankAccount.findUnique({
      where: { id },
    })

    if (!bankAccount) {
      return NextResponse.json(
        { error: 'Bank account not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ bankAccount })
  } catch (error) {
    console.error('Get bank account error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const PUT = withAudit('bank-account', 'PUT')(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params
    const body = await request.json()

    const existingBankAccount = await db.bankAccount.findUnique({
      where: { id },
    })

    if (!existingBankAccount) {
      return NextResponse.json(
        { error: 'Bank account not found' },
        { status: 404 }
      )
    }

    const { name, bank, number, type, currency, balance } = body

    const bankAccount = await db.bankAccount.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(bank !== undefined && { bank: bank || null }),
        ...(number !== undefined && { number: number || null }),
        ...(type && { type }),
        ...(currency && { currency }),
        ...(balance !== undefined && { balance }),
      },
    })

    return NextResponse.json({ bankAccount })
  } catch (error) {
    console.error('Update bank account error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

export const DELETE = withAudit('bank-account', 'DELETE')(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params

    const existingBankAccount = await db.bankAccount.findUnique({
      where: { id },
    })

    if (!existingBankAccount) {
      return NextResponse.json(
        { error: 'Bank account not found' },
        { status: 404 }
      )
    }

    await db.bankAccount.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Bank account deleted successfully' })
  } catch (error) {
    console.error('Delete bank account error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
