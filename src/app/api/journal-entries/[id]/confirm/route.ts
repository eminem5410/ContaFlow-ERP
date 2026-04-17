import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAudit } from '@/lib/with-audit'

export const POST = withAudit('journal-entry', 'POST')(async (
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

    if (existingEntry.status !== 'borrador') {
      return NextResponse.json(
        { error: 'Only journal entries with status "borrador" can be confirmed' },
        { status: 400 }
      )
    }

    const journalEntry = await db.journalEntry.update({
      where: { id },
      data: { status: 'confirmado' },
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
    console.error('Confirm journal entry error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
