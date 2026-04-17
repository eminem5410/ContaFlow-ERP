import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (body.type === 'payment') {
      const paymentId = body.data?.id
      if (!paymentId) return NextResponse.json({ ok: true })
      const mpToken = process.env.MP_ACCESS_TOKEN || ''
      const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${mpToken}` },
      })
      if (!res.ok) return NextResponse.json({ ok: true })
      const payment = await res.json()
      if (payment.status === 'approved') {
        const extRef = payment.external_reference || ''
        const [companyId, planId] = extRef.split(':')
        if (companyId && planId) {
          const { db } = await import('@/lib/db')
          await db.company.update({ where: { id: companyId }, data: { plan: planId } })
          await db.planPayment.updateMany({
            where: { mercadopagoPrefId: payment.preference_id },
            data: { status: 'approved', mercadopagoPaymentId: String(paymentId), approvalDate: payment.date_approved ? new Date(payment.date_approved) : null },
          })
        }
      }
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ ok: true })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'webhook active' })
}
