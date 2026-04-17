import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const companyId = searchParams.get('companyId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      )
    }

    const dateFilter: Record<string, unknown> = {}
    if (from || to) {
      if (from) dateFilter.gte = new Date(from)
      if (to) dateFilter.lte = new Date(to + 'T23:59:59.999Z')
    }

    // Fetch all confirmed journal entries in the date range
    const journalEntries = await db.journalEntry.findMany({
      where: {
        companyId,
        status: 'confirmado',
        ...(from || to ? { date: dateFilter } : {}),
      },
      include: {
        lines: {
          include: {
            account: {
              select: { id: true, code: true, name: true, type: true },
            },
          },
        },
      },
      orderBy: [{ date: 'asc' }, { number: 'asc' }],
    })

    // Build the IVA Ventas report entries
    const entries: Array<{
      date: string
      number: number
      description: string
      client: string | null
      netAmount: number
      taxAmount: number
      taxRate: number
      total: number
    }> = []

    const totals = {
      gravado21: 0,
      gravado105: 0,
      gravado27: 0,
      noGravado: 0,
      exento: 0,
      iva21: 0,
      iva105: 0,
      iva27: 0,
      total: 0,
    }

    for (const entry of journalEntries) {
      // Only consider entries that have lines in ingreso-type accounts
      const ingresoLines = entry.lines.filter(l => l.account.type === 'ingreso')
      if (ingresoLines.length === 0) continue

      // Try to parse client name from description (format: "concepto - Cliente")
      let client: string | null = null
      if (entry.description) {
        const dashIdx = entry.description.lastIndexOf(' - ')
        if (dashIdx > 0) {
          client = entry.description.substring(dashIdx + 3).trim()
        }
      }

      // Identify IVA lines and their corresponding net lines
      const ivaLines = entry.lines.filter(l =>
        l.account.code.startsWith('2.01.02') || // IVA Debito Fiscal
        l.account.name.toLowerCase().includes('iva')
      )

      // Calculate total ingreso credits (sales)
      const totalIngresoCredit = ingresoLines.reduce((sum, l) => sum + l.credit, 0)
      const totalIngresoDebit = ingresoLines.reduce((sum, l) => sum + l.debit, 0)
      const netAmount = totalIngresoCredit - totalIngresoDebit

      // Calculate total IVA debits
      const totalIvaDebit = ivaLines.reduce((sum, l) => sum + l.debit, 0)
      const totalIvaCredit = ivaLines.reduce((sum, l) => sum + l.credit, 0)
      const taxAmount = totalIvaDebit - totalIvaCredit

      if (netAmount <= 0) continue // Skip entries that don't represent sales

      // Determine tax rate based on IVA amount vs net amount
      let taxRate = 21 // default
      if (netAmount > 0) {
        const impliedRate = (taxAmount / netAmount) * 100
        if (Math.abs(impliedRate - 10.5) < 2) taxRate = 10.5
        else if (Math.abs(impliedRate - 27) < 2) taxRate = 27
        else if (taxAmount === 0) taxRate = 0
      }

      const entryTotal = netAmount + taxAmount

      entries.push({
        date: entry.date.toISOString(),
        number: entry.number,
        description: entry.description,
        client,
        netAmount,
        taxAmount,
        taxRate,
        total: entryTotal,
      })

      // Accumulate totals by tax rate
      if (taxRate === 21) {
        totals.gravado21 += netAmount
        totals.iva21 += taxAmount
      } else if (taxRate === 10.5) {
        totals.gravado105 += netAmount
        totals.iva105 += taxAmount
      } else if (taxRate === 27) {
        totals.gravado27 += netAmount
        totals.iva27 += taxAmount
      } else if (taxRate === 0) {
        totals.exento += netAmount
      } else {
        totals.noGravado += netAmount
      }
      totals.total += entryTotal
    }

    return NextResponse.json({
      entries,
      totals,
      period: {
        from: from || null,
        to: to || null,
      },
    })
  } catch (error) {
    console.error('IVA Sales report error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
