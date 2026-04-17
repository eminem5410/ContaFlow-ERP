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
    const { endorsee } = body
    if (!endorsee) {
      return NextResponse.json({ error: 'endorsee is required' }, { status: 400 })
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
    if (existing.status !== 'en_cartera') {
      return NextResponse.json(
        { error: `Cannot endorse a cheque with status "${existing.status}". Only cheques in "en_cartera" can be endorsed.` },
        { status: 400 }
      )
    }

    // Actualizar cheque
    const cheque = await db.cheque.update({
      where: { id },
      data: { status: 'endosado', endorsee },
    })

    // Crear asiento contable automatico: Debe Cheques Endosados | Haber Cheques de Terceros
    const journalResult = await createChequeJournalEntry({
      companyId: existing.companyId,
      cheque: { id: cheque.id, number: cheque.number, amount: cheque.amount, bank: existing.bank },
      operation: 'endosar',
    })

    return NextResponse.json({
      cheque,
      journalEntry: journalResult,
    })
  } catch (error) {
    console.error('Endorse cheque error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
