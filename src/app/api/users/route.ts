import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAudit } from '@/lib/with-audit'
import { getPlan } from '@/lib/plan-config'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const companyId = searchParams.get('companyId')
    const role = searchParams.get('role') || ''
    if (!companyId) return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    const where: Record<string, unknown> = { companyId }
    if (role) where.role = role
    const users = await db.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ users })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, role, companyId } = body
    if (!email || !password || !name || !companyId) return NextResponse.json({ error: 'Email, password, name and companyId are required' }, { status: 400 })
    const company = await db.company.findUnique({ where: { id: companyId } })
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    const planDef = getPlan(company.plan || 'starter')
    const userCount = await db.user.count({ where: { companyId } })
    if (planDef.maxUsers !== -1 && userCount >= planDef.maxUsers) {
      return NextResponse.json({ error: 'Plan ' + planDef.name + ' limit: ' + planDef.maxUsers + ' users' }, { status: 403 })
    }
    const existingUser = await db.user.findUnique({ where: { email } })
    if (existingUser) return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    const validRoles = ['admin', 'contador', 'visualizador']
    const userRole = validRoles.includes(role) ? role : 'visualizador'
    const user = await db.user.create({
      data: { email, password, name, role: userRole, companyId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })
    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
