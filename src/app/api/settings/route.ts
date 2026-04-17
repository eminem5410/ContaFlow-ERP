import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAudit } from '@/lib/with-audit'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      )
    }

    const company = await db.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        cuit: true,
        email: true,
        phone: true,
        address: true,
        plan: true,
        logo: true,
      },
    })

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ company })
  } catch (error) {
    console.error('Get settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const PUT = withAudit('settings', 'PUT')(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { companyId, name, cuit, email, phone, address, logo } = body

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      )
    }

    const existingCompany = await db.company.findUnique({
      where: { id: companyId },
    })

    if (!existingCompany) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    // Check CUIT uniqueness if being changed
    if (cuit && cuit !== existingCompany.cuit) {
      const duplicateCuit = await db.company.findUnique({
        where: { cuit },
      })
      if (duplicateCuit) {
        return NextResponse.json(
          { error: 'CUIT already registered to another company' },
          { status: 409 }
        )
      }
    }

    const company = await db.company.update({
      where: { id: companyId },
      data: {
        ...(name !== undefined && { name }),
        ...(cuit !== undefined && { cuit: cuit || null }),
        ...(email !== undefined && { email: email || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(address !== undefined && { address: address || null }),
        ...(logo !== undefined && { logo: logo || null }),
      },
      select: {
        id: true,
        name: true,
        cuit: true,
        email: true,
        phone: true,
        address: true,
        plan: true,
        logo: true,
      },
    })

    return NextResponse.json({ company })
  } catch (error) {
    console.error('Update settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
