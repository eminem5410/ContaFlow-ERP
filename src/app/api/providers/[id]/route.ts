import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAudit } from '@/lib/with-audit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const provider = await db.provider.findUnique({
      where: { id },
    })

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ provider })
  } catch (error) {
    console.error('Get provider error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const PUT = withAudit('provider', 'PUT')(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params
    const body = await request.json()

    const existingProvider = await db.provider.findUnique({
      where: { id },
    })

    if (!existingProvider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      )
    }

    // Check if CUIT is being changed and if it conflicts
    if (body.cuit && body.cuit !== existingProvider.cuit) {
      const duplicateCuit = await db.provider.findUnique({
        where: { cuit: body.cuit },
      })
      if (duplicateCuit) {
        return NextResponse.json(
          { error: 'CUIT already registered to another provider' },
          { status: 409 }
        )
      }
    }

    const { name, cuit, email, phone, address, city, province, notes, code } = body

    const provider = await db.provider.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(code && { code }),
        ...(cuit !== undefined && { cuit: cuit || null }),
        ...(email !== undefined && { email: email || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(address !== undefined && { address: address || null }),
        ...(city !== undefined && { city: city || null }),
        ...(province !== undefined && { province: province || null }),
        ...(notes !== undefined && { notes: notes || null }),
      },
    })

    return NextResponse.json({ provider })
  } catch (error) {
    console.error('Update provider error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

export const DELETE = withAudit('provider', 'DELETE')(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params

    const provider = await db.provider.findUnique({
      where: { id },
    })

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      )
    }

    await db.provider.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Provider deleted successfully' })
  } catch (error) {
    console.error('Delete provider error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
