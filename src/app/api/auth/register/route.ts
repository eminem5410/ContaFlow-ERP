import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, generateAccessToken, generateRefreshToken } from '@/lib/auth'
import { getPlan, isPermAllowed } from '@/lib/plan-config'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, companyName, cuit } = body

    if (!email || !password || !name || !companyName) {
      return NextResponse.json(
        { error: 'Email, password, name, and companyName are required' },
        { status: 400 }
      )
    }

    // Check if user email already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      )
    }

    // Check if company CUIT already exists
    if (cuit) {
      const existingCompany = await db.company.findUnique({
        where: { cuit },
      })
      if (existingCompany) {
        return NextResponse.json(
          { error: 'Company with this CUIT already exists' },
          { status: 409 }
        )
      }
    }

    const hashedPassword = await hashPassword(password)
    const plan = 'starter'
    const planDef = getPlan(plan)

    const company = await db.company.create({
      data: {
        name: companyName,
        cuit: cuit || null,
        plan,
     },
    })

    // Get all permissions and filter by plan

    const allPermissions = await db.permission.findMany()
    const starterPerms = allPermissions.filter(p => {
      const parts = p.id.split('.')
      if (parts.length < 2) return false
      const mod = parts.slice(0, -1).join('.')
      const act = parts[parts.length - 1]
      return isPermAllowed(plan, mod, act)
    })

    const role = await db.$transaction(async (tx) => {
      const newRole = await tx.role.create({
        data: {
          name: 'Admin',
          description: 'Administrator role',
          level: 10,
          companyId: company.id,
        },
      })

      if (starterPerms.length > 0) {
        await tx.rolePermission.createMany({
          data: starterPerms.map(p => ({
            roleId: newRole.id,
            permissionId: p.id,
          })),
        })
      }

      return tx.role.findUnique({
        where: { id: newRole.id },
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      })
    })

    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'admin',
        companyId: company.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    })

    const accessToken = generateAccessToken({ userId: user.id, email: user.email, role: user.role, companyId: company.id, roleId: null })
    const refreshToken = await generateRefreshToken({ userId: user.id })

    return NextResponse.json({
      user,
      company: { id: company.id, name: company.name, cuit: company.cuit, plan: company.plan },
      role,
      accessToken,
      refreshToken,
    }, { status: 201 })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
