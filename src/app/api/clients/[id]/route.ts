import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAudit } from '@/lib/with-audit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const client = await db.client.findUnique({
      where: { id },
      include: {
        _count: {
          select: { invoices: true },
        },
      },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ client })
  } catch (error) {
    console.error('Get client error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const PUT = withAudit('client', 'PUT')(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params
    const body = await request.json()

    const existingClient = await db.client.findUnique({
      where: { id },
    })

    if (!existingClient) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Check if CUIT is being changed and if it conflicts
    if (body.cuit && body.cuit !== existingClient.cuit) {
      const duplicateCuit = await db.client.findUnique({
        where: { cuit: body.cuit },
      })
      if (duplicateCuit) {
        return NextResponse.json(
          { error: 'CUIT already registered to another client' },
          { status: 409 }
        )
      }
    }

    const { name, cuit, email, phone, address, city, province, notes, code } = body

    const client = await db.client.update({
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

    return NextResponse.json({ client })
  } catch (error) {
    console.error('Update client error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

export const DELETE = withAudit('client', 'DELETE')(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params

    const client = await db.client.findUnique({
      where: { id },
      include: {
        _count: {
          select: { invoices: true },
        },
      },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    if (client._count.invoices > 0) {
      return NextResponse.json(
        { error: 'Cannot delete client with associated invoices' },
        { status: 400 }
      )
    }

    await db.client.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Client deleted successfully' })
  } catch (error) {
    console.error('Delete client error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
