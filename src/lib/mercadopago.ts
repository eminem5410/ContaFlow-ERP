import { PLANS } from './plan-config'

export const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || ''

export const MP_BASE_URL = 'https://api.mercadopago.com/v1'

export function getMpHeaders() {
  return {
    'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

export async function createPaymentPreference(planId: string, companyId: string, userEmail: string) {
  const plan = PLANS[planId]
  if (!plan || plan.price === 0) {
    throw new Error('Plan no valido o gratis')
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const body = {
    items: [{
      title: `ContaFlow ERP - Plan ${plan.name}`,
      description: `Suscripcion mensual al plan ${plan.name}`,
      quantity: 1,
      unit_price: plan.price,
      currency_id: 'ARS',
    }],
    payer: { email: userEmail },
    external_reference: `${companyId}:${planId}`,
    notification_url: `${appUrl}/api/payments/webhook`,
  }

  const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: getMpHeaders(),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`MercadoPago error: ${err}`)
  }

  const data = await res.json()
  return { initPoint: data.init_point, preferenceId: data.id }
}
