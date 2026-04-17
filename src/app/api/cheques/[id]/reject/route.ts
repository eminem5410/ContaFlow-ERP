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
    const { rejectionReason } = body
    if (!rejectionReason) {
      return NextResponse.json({ error: 'rejectionReason is required' }, { status: 400 })
    }

    const existing = await db.cheque.findUnique({
      where: { id },
      include: {
        company: { select: { id: true } },
      },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Cheque not found' }, { status: 404 })
    }
    if (existing.status !== 'depositado') {
      return NextResponse.json(
        { error: `Cannot reject a cheque with status "${existing.status}". Only cheques in "depositado" can be rejected.` },
        { status: 400 }
      )
    }

    // Actualizar cheque
    const cheque = await db.cheque.update({
      where: { id },
      data: { status: 'rechazado', rejectionReason },
    })

    // Crear asiento contable automatico: Debe Cheques Rechazados | Haber Cheques en Transito
    const journalResult = await createChequeJournalEntry({
      companyId: existing.companyId,
      cheque: { id: cheque.id, number: cheque.number, amount: cheque.amount, bank: existing.bank },
      operation: 'rechazar',
    })

    return NextResponse.json({
      cheque,
      journalEntry: journalResult,
    })
  } catch (error) {
    console.error('Reject cheque error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
