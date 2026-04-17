import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken, generateAccessToken, generateRefreshToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { refreshToken: token } = body

    if (!token) {
      return NextResponse.json(
        { error: 'refreshToken is required' },
        { status: 400 }
      )
    }

    // Verify the refresh token
    const payload = await verifyToken(token)

    if (!payload || !payload.userId) {
      return NextResponse.json(
        { error: 'Token de refresh inválido o expirado' },
        { status: 401 }
      )
    }

    // Look up the user from the database
    const user = await db.user.findUnique({
      where: { id: payload.userId as string },
      include: {
        company: {
          select: { id: true, name: true, cuit: true },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 401 }
      )
    }

    // Generate new tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      companyId: user.companyId,
      roleId: user.roleId,
      role: user.role,
    }

    const newAccessToken = await generateAccessToken(tokenPayload)
    const newRefreshToken = await generateRefreshToken({ userId: user.id })

    return NextResponse.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        roleId: user.roleId,
        companyId: user.companyId,
      },
      company: {
        id: user.company.id,
        name: user.company.name,
        cuit: user.company.cuit,
      },
    })
  } catch (error) {
    console.error('Refresh token error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
