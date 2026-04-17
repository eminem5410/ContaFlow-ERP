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
    if (existing.status !== 'depositado') {
      return NextResponse.json(
        { error: `Cannot clear a cheque with status "${existing.status}". Only cheques in "depositado" can be cleared.` },
        { status: 400 }
      )
    }

    // Actualizar cheque
    const cheque = await db.cheque.update({
      where: { id },
      data: { status: 'cobrado', clearanceDate: new Date() },
    })

    // Crear asiento contable automatico: Debe Banco | Haber Cheques en Transito
    const bankName = existing.bankAccount?.bank || existing.bank || 'General'
    const journalResult = await createChequeJournalEntry({
      companyId: existing.companyId,
      cheque: { id: cheque.id, number: cheque.number, amount: cheque.amount, bank: existing.bank },
      operation: 'acreditar',
      bankName,
    })

    return NextResponse.json({
      cheque,
      journalEntry: journalResult,
    })
  } catch (error) {
    console.error('Clear cheque error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
