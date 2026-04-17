import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAudit } from '@/lib/with-audit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const payment = await db.payment.findUnique({
      where: { id },
      include: {
        client: {
          select: { id: true, name: true },
        },
        provider: {
          select: { id: true, name: true },
        },
        invoice: {
          select: { id: true, number: true },
        },
        bankAccount: {
          select: { id: true, name: true },
        },
      },
    })

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ payment })
  } catch (error) {
    console.error('Get payment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const PUT = withAudit('payment', 'PUT')(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params
    const body = await request.json()

    const existingPayment = await db.payment.findUnique({
      where: { id },
    })

    if (!existingPayment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    const { date, amount, method, reference, type, notes } = body
    const amountChanged = amount !== undefined && amount !== existingPayment.amount

    if (amountChanged && existingPayment.invoiceId) {
      // Update payment and recalculate invoice in a transaction
      const result = await db.$transaction(async (tx) => {
        const payment = await tx.payment.update({
          where: { id },
          data: {
            ...(date !== undefined && { date: new Date(date) }),
            ...(amount !== undefined && { amount }),
            ...(method !== undefined && { method }),
            ...(reference !== undefined && { reference: reference || null }),
            ...(type !== undefined && { type }),
            ...(notes !== undefined && { notes: notes || null }),
          },
        })

        // Recalculate invoice amountPaid by summing all related payments
        const relatedPayments = await tx.payment.findMany({
          where: { invoiceId: existingPayment.invoiceId! },
          select: { amount: true },
        })

        const totalPaid = relatedPayments.reduce((sum, p) => sum + p.amount, 0)

        const invoice = await tx.invoice.findUnique({
          where: { id: existingPayment.invoiceId! },
        })

        if (invoice) {
          let status = invoice.status
          if (totalPaid >= invoice.total) {
            status = 'pagada'
          } else if (totalPaid > 0) {
            status = 'pagada_parcial'
          } else {
            status = 'pendiente'
          }

          await tx.invoice.update({
            where: { id: existingPayment.invoiceId! },
            data: {
              amountPaid: totalPaid,
              status,
            },
          })
        }

        return payment
      })

      return NextResponse.json({ payment: result })
    }

    // Update without invoice recalculation
    const payment = await db.payment.update({
      where: { id },
      data: {
        ...(date !== undefined && { date: new Date(date) }),
        ...(amount !== undefined && { amount }),
        ...(method !== undefined && { method }),
        ...(reference !== undefined && { reference: reference || null }),
        ...(type !== undefined && { type }),
        ...(notes !== undefined && { notes: notes || null }),
      },
    })

    return NextResponse.json({ payment })
  } catch (error) {
    console.error('Update payment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

export const DELETE = withAudit('payment', 'DELETE')(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params

    const existingPayment = await db.payment.findUnique({
      where: { id },
    })

    if (!existingPayment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    if (existingPayment.invoiceId) {
      // Delete payment and recalculate invoice in a transaction
      await db.$transaction(async (tx) => {
        await tx.payment.delete({
          where: { id },
        })

        // Recalculate invoice amountPaid by summing remaining payments
        const relatedPayments = await tx.payment.findMany({
          where: { invoiceId: existingPayment.invoiceId! },
          select: { amount: true },
        })

        const totalPaid = relatedPayments.reduce((sum, p) => sum + p.amount, 0)

        const invoice = await tx.invoice.findUnique({
          where: { id: existingPayment.invoiceId! },
        })

        if (invoice) {
          let status = invoice.status
          if (totalPaid >= invoice.total) {
            status = 'pagada'
          } else if (totalPaid > 0) {
            status = 'pagada_parcial'
          } else {
            status = 'pendiente'
          }

          await tx.invoice.update({
            where: { id: existingPayment.invoiceId! },
            data: {
              amountPaid: totalPaid,
              status,
            },
          })
        }
      })
    } else {
      await db.payment.delete({
        where: { id },
      })
    }

    return NextResponse.json({ message: 'Payment deleted successfully' })
  } catch (error) {
    console.error('Delete payment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
