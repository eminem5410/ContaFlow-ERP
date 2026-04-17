import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAudit } from '@/lib/with-audit'
import { createChequeJournalEntry } from '@/lib/cheque-journal'

export const POST = withAudit('cheque', 'POST')(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params
    const body = await request.json()
    const { bankAccountId } = body
    if (!bankAccountId) {
      return NextResponse.json({ error: 'bankAccountId is required' }, { status: 400 })
    }

    const existing = await db.cheque.findUnique({
      where: { id },
      include: {
        bankAccount: { select: { name: true, bank: true } },
        company: { select: { id: true } },
      },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Cheque not found' }, { status: 404 })
    }
    if (existing.status !== 'en_cartera') {
      return NextResponse.json(
        { error: `Cannot deposit a cheque with status "${existing.status}". Only cheques in "en_cartera" can be deposited.` },
        { status: 400 }
      )
    }

    // Actualizar cheque
    const cheque = await db.cheque.update({
      where: { id },
      data: { status: 'depositado', depositDate: new Date(), bankAccountId },
    })

    // Crear asiento contable automatico: Debe Cheques en Transito | Haber Cheques de Terceros
    const journalResult = await createChequeJournalEntry({
      companyId: existing.companyId,
      cheque: { id: cheque.id, number: cheque.number, amount: cheque.amount, bank: existing.bank },
      operation: 'depositar',
    })

    return NextResponse.json({
      cheque,
      journalEntry: journalResult,
    })
  } catch (error) {
    console.error('Deposit cheque error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
