import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const companyId = searchParams.get('companyId')
    const accountId = searchParams.get('accountId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!companyId || !accountId) {
      return NextResponse.json(
        { error: 'companyId and accountId are required' },
        { status: 400 }
      )
    }

    // Verify account belongs to company
    const account = await db.account.findFirst({
      where: { id: accountId, companyId },
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found in this company' },
        { status: 404 }
      )
    }

    // Build date filter
    const entryWhere: Record<string, unknown> = {
      companyId,
      status: 'confirmado',
      ...(from || to ? { date: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      } } : {}),
    }

    // Get all lines for this account across confirmed entries
    const lines = await db.journalEntryLine.findMany({
      where: {
        accountId,
        journalEntry: entryWhere,
      },
      include: {
        journalEntry: {
          select: {
            id: true,
            number: true,
            date: true,
            description: true,
          },
        },
        account: {
          select: { id: true, code: true, name: true, type: true },
        },
      },
      orderBy: {
        journalEntry: { date: 'asc' },
      },
    })

    // Calculate running balance
    interface LedgerLine {
      id: string
      date: string
      entryNumber: number
      entryDescription: string
      entryId: string
      concept: string | null
      debit: number
      credit: number
      balance: number
    }

    let runningBalance = 0
    const ledgerLines: LedgerLine[] = lines.map((line) => {
      const isDebitNature = account.type === 'activo' || account.type === 'egreso' || account.type === 'costoVenta'
      runningBalance += isDebitNature ? line.debit - line.credit : line.credit - line.debit

      return {
        id: line.id,
        date: line.journalEntry.date.toISOString().split('T')[0],
        entryNumber: line.journalEntry.number,
        entryDescription: line.journalEntry.description,
        entryId: line.journalEntryId,
        concept: line.description,
        debit: line.debit,
        credit: line.credit,
        balance: Math.round(runningBalance * 100) / 100,
      }
    })

    // Totals
    const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0)
    const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0)

    return NextResponse.json({
      account: {
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
      },
      period: {
        from: from || null,
        to: to || null,
      },
      lines: ledgerLines,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      finalBalance: Math.round(runningBalance * 100) / 100,
    })
  } catch (error) {
    console.error('Ledger report error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
