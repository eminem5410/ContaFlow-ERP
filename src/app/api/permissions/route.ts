import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/permissions – List all available permissions (global), grouped by module
export async function GET() {
  try {
    const permissions = await db.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    })

    // Group by module
    const groupedByModule: Record<string, typeof permissions> = {}
    for (const p of permissions) {
      if (!groupedByModule[p.module]) {
        groupedByModule[p.module] = []
      }
      groupedByModule[p.module].push(p)
    }

    return NextResponse.json({
      permissions,
      groupedByModule,
    })
  } catch (error) {
    console.error('List permissions error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
