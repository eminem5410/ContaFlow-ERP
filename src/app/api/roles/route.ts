import { NextRequest, NextResponse } from 'next/server'
import { getPlan, isPermAllowed } from '@/lib/plan-config'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    if (!companyId) return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    const roles = await db.role.findMany({
      where: { companyId },
      include: { _count: { select: { permissions: true, users: true } } },
      orderBy: { level: 'desc' },
    })
    return NextResponse.json({ roles })
  } catch (error) {
    console.error('List roles error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, level, companyId, permissionIds } = body
    if (!name || !companyId) return NextResponse.json({ error: 'Name and companyId are required' }, { status: 400 })
    const company = await db.company.findUnique({ where: { id: companyId } })
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    const planDef = getPlan(company.plan || 'starter')
    const validPerms = (permissionIds || []).filter(pid => {
      const parts = pid.split('.')
      if (parts.length < 2) return false
      const mod = parts.slice(0, -1).join('.')
      const act = parts[parts.length - 1]
      return isPermAllowed(company.plan || 'starter', mod, act)
    })
    const existingPerms = await db.permission.findMany({ where: { id: { in: validPerms } } })
    const role = await db.role.create({
      data: {
        name, description: description || '', level: level || 0, companyId,
        permissions: { connect: existingPerms.map(p => ({ id: p.id })) },
      },
      include: { permissions: true },
    })
    return NextResponse.json({ role }, { status: 201 })
  } catch (error) {
    console.error('Create role error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
