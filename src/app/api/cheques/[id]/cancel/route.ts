import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAudit } from '@/lib/with-audit'

export const POST = withAudit('cheque', 'POST')(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params
    const existing = await db.cheque.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Cheque not found' }, { status: 404 })
    }
    if (existing.status !== 'emitido') {
      return NextResponse.json(
        { error: `Cannot cancel a cheque with status "${existing.status}". Only cheques in "emitido" can be cancelled.` },
        { status: 400 }
      )
    }
    const cheque = await db.cheque.update({
      where: { id },
      data: { status: 'anulado' },
    })
    return NextResponse.json({ cheque })
  } catch (error) {
    console.error('Cancel cheque error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
