import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { comparePassword, generateAccessToken, generateRefreshToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, companyId } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son obligatorios' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await db.user.findUnique({
      where: { email },
      include: {
        company: {
          select: { id: true, name: true, cuit: true, plan: true },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    // If companyId is provided, verify it matches
    if (companyId && user.companyId !== companyId) {
      return NextResponse.json(
        { error: 'El usuario no pertenece a esta empresa' },
        { status: 401 }
      )
    }

    // Compare password using bcrypt
    let passwordValid = await comparePassword(password, user.password)

    // Legacy fallback: if bcrypt comparison fails, try direct comparison
    // This supports accounts created before bcrypt migration
    if (!passwordValid && user.password === password) {
      passwordValid = true
    }

    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    // Generate JWT tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      companyId: user.companyId,
      roleId: user.roleId,
      role: user.role,
    }

    const accessToken = await generateAccessToken(tokenPayload)
    const refreshToken = await generateRefreshToken({ userId: user.id })

    return NextResponse.json({
      accessToken,
      refreshToken,
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
        plan: user.company.plan,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
