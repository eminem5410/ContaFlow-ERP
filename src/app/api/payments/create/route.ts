import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createPaymentPreference } from '@/lib/mercadopago'
import { getPlan } from '@/lib/plan-config'

export async function POST(request: NextRequest) {
  try {
    const { planId, companyId, userEmail } = await request.json()
    if (!planId || !companyId || !userEmail) {
      return NextResponse.json({ error: 'planId, companyId y userEmail son requeridos' }, { status: 400 })
    }
    const plan = getPlan(planId)
    if (plan.price === 0) {
      await db.company.update({ where: { id: companyId }, data: { plan: planId } })
      return NextResponse.json({ message: 'Plan gratuito activado', plan: planId })
    }
    const { initPoint, preferenceId } = await createPaymentPreference(planId, companyId, userEmail)
    await db.planPayment.create({
      data: {
        companyId, plan: planId, amount: plan.price, currency: 'ARS',
        status: 'pending', mercadopagoPrefId: preferenceId,
        externalReference: `${companyId}:${planId}`,
      },
    })
    return NextResponse.json({ initPoint, preferenceId, planId })
  } catch (error: any) {
    console.error('Create payment error:', error)
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}
