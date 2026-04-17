import { db } from './db'

export async function logAction(params: {
  userId: string
  userName: string
  action: string
  entity: string
  entityId?: string
  details?: string
  companyId: string
}) {
  try {
    await db.auditLog.create({ data: params })
  } catch (error) {
    console.error('Audit log error:', error)
  }
}
