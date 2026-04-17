import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAudit } from '@/lib/with-audit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const journalEntry = await db.journalEntry.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            account: {
              select: { id: true, code: true, name: true, type: true },
            },
          },
          orderBy: { id: 'asc' },
        },
      },
    })

    if (!journalEntry) {
      return NextResponse.json(
        { error: 'Journal entry not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ journalEntry })
  } catch (error) {
    console.error('Get journal entry error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const PUT = withAudit('journal-entry', 'PUT')(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params
    const body = await request.json()

    const existingEntry = await db.journalEntry.findUnique({
      where: { id },
    })

    if (!existingEntry) {
      return NextResponse.json(
        { error: 'Journal entry not found' },
        { status: 404 }
      )
    }

    // Only allow editing if status is "borrador"
    if (existingEntry.status !== 'borrador') {
      return NextResponse.json(
        { error: 'Can only edit journal entries with status "borrador"' },
        { status: 400 }
      )
    }

    const { date, description, concept, lines } = body

    // If lines are provided, re-validate double-entry
    if (lines && lines.length > 0) {
      const totalDebit = lines.reduce((sum: number, line: { debit: number }) => sum + (line.debit || 0), 0)
      const totalCredit = lines.reduce((sum: number, line: { credit: number }) => sum + (line.credit || 0), 0)

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return NextResponse.json(
          {
            error: `Double-entry validation failed: total debit (${totalDebit}) must equal total credit (${totalCredit})`,
          },
          { status: 400 }
        )
      }

      // Validate all account IDs exist in the company
      const accountIds = lines.map((line: { accountId: string }) => line.accountId)
      const accounts = await db.account.findMany({
        where: {
          id: { in: accountIds },
          companyId: existingEntry.companyId,
        },
      })

      if (accounts.length !== accountIds.length) {
        const foundIds = accounts.map((a) => a.id)
        const missingIds = accountIds.filter((aid: string) => !foundIds.includes(aid))
        return NextResponse.json(
          { error: `Some accounts not found in this company: ${missingIds.join(', ')}` },
          { status: 400 }
        )
      }

      // Delete existing lines and create new ones
      await db.journalEntryLine.deleteMany({
        where: { journalEntryId: id },
      })

      const totalDebitVal = lines.reduce((sum: number, line: { debit: number }) => sum + (line.debit || 0), 0)
      const totalCreditVal = lines.reduce((sum: number, line: { credit: number }) => sum + (line.credit || 0), 0)

      const journalEntry = await db.journalEntry.update({
        where: { id },
        data: {
          ...(date && { date: new Date(date) }),
          ...(description && { description }),
          ...(concept !== undefined && { concept: concept || null }),
          totalDebit: totalDebitVal,
          totalCredit: totalCreditVal,
          lines: {
            create: lines.map((line: { accountId: string; debit: number; credit: number; description?: string }) => ({
              accountId: line.accountId,
              debit: line.debit || 0,
              credit: line.credit || 0,
              description: line.description || null,
            })),
          },
        },
        include: {
          lines: {
            include: {
              account: {
                select: { id: true, code: true, name: true },
              },
            },
          },
        },
      })

      return NextResponse.json({ journalEntry })
    }

    // If only fields are updated (no lines), just update those
    const journalEntry = await db.journalEntry.update({
      where: { id },
      data: {
        ...(date && { date: new Date(date) }),
        ...(description && { description }),
        ...(concept !== undefined && { concept: concept || null }),
      },
      include: {
        lines: {
          include: {
            account: {
              select: { id: true, code: true, name: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ journalEntry })
  } catch (error) {
    console.error('Update journal entry error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

export const PATCH = withAudit('journal-entry', 'PATCH')(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status || !['confirmado', 'anulado', 'borrador'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status is required: confirmado, anulado, or borrador' },
        { status: 400 }
      )
    }

    const existingEntry = await db.journalEntry.findUnique({
      where: { id },
    })

    if (!existingEntry) {
      return NextResponse.json(
        { error: 'Journal entry not found' },
        { status: 404 }
      )
    }

    // Only allow status changes from borrador
    if (existingEntry.status !== 'borrador' && status !== 'anulado') {
      return NextResponse.json(
        { error: `Cannot change status from "${existingEntry.status}" to "${status}"` },
        { status: 400 }
      )
    }

    // Allow annulling confirmed entries
    if (status === 'anulado' && existingEntry.status !== 'confirmado' && existingEntry.status !== 'borrador') {
      return NextResponse.json(
        { error: 'Only borrador or confirmado entries can be annulled' },
        { status: 400 }
      )
    }

    const journalEntry = await db.journalEntry.update({
      where: { id },
      data: { status },
      include: {
        lines: {
          include: {
            account: {
              select: { id: true, code: true, name: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ journalEntry })
  } catch (error) {
    console.error('Patch journal entry error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

export const DELETE = withAudit('journal-entry', 'DELETE')(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params

    const existingEntry = await db.journalEntry.findUnique({
      where: { id },
    })

    if (!existingEntry) {
      return NextResponse.json(
        { error: 'Journal entry not found' },
        { status: 404 }
      )
    }

    // Only delete if status is "borrador"
    if (existingEntry.status !== 'borrador') {
      return NextResponse.json(
        { error: 'Can only delete journal entries with status "borrador"' },
        { status: 400 }
      )
    }

    await db.journalEntry.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Journal entry deleted successfully' })
  } catch (error) {
    console.error('Delete journal entry error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
