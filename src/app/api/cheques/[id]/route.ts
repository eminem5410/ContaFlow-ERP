import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAudit } from '@/lib/with-audit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cheque = await db.cheque.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true, cuit: true } },
        provider: { select: { id: true, name: true, cuit: true } },
        bankAccount: { select: { id: true, name: true, bank: true } },
        company: { select: { id: true, name: true } },
      },
    })
    if (!cheque) {
      return NextResponse.json({ error: 'Cheque not found' }, { status: 404 })
    }
    return NextResponse.json({ cheque })
  } catch (error) {
    console.error('Get cheque error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const PUT = withAudit('cheque', 'PUT')(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params
    const body = await request.json()
    const existing = await db.cheque.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Cheque not found' }, { status: 404 })
    }
    if (!['en_cartera', 'emitido'].includes(existing.status)) {
      return NextResponse.json(
        { error: `Cannot edit a cheque with status "${existing.status}"` },
        { status: 400 }
      )
    }
    const { number, bank, branch, accountType, paymentDate, issuerName, issuerCuit, notes } = body
    const cheque = await db.cheque.update({
      where: { id },
      data: {
        ...(number !== undefined && { number }),
        ...(bank !== undefined && { bank }),
        ...(branch !== undefined && { branch }),
        ...(accountType !== undefined && { accountType }),
        ...(paymentDate !== undefined && { paymentDate: paymentDate ? new Date(paymentDate) : null }),
        ...(issuerName !== undefined && { issuerName }),
        ...(issuerCuit !== undefined && { issuerCuit }),
        ...(notes !== undefined && { notes }),
      },
    })
    return NextResponse.json({ cheque })
  } catch (error) {
    console.error('Update cheque error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const DELETE = withAudit('cheque', 'DELETE')(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params
    const existing = await db.cheque.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Cheque not found' }, { status: 404 })
    }
    if (!['en_cartera', 'emitido', 'anulado'].includes(existing.status)) {
      return NextResponse.json(
        { error: `Cannot delete a cheque with status "${existing.status}"` },
        { status: 400 }
      )
    }
    await db.cheque.delete({ where: { id } })
    return NextResponse.json({ message: 'Cheque deleted successfully' })
  } catch (error) {
    console.error('Delete cheque error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
