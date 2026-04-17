import { db } from '@/lib/db'

// Cuentas contables automáticas para cheques (plan contable argentino)
const CHEQUE_ACCOUNTS = {
  CHEQUES_TERCEROS: '1.1.2.02',
  CHEQUES_TRANSITO: '1.1.2.01',
  CHEQUES_RECHAZADOS: '1.1.2.99',
  CHEQUES_ENDOSADOS: '1.1.2.03',
  BANCO_PREFIX: '1.1.1',
} as const

interface AccountConfig {
  code: string
  name: string
  type: string
  subtype?: string
}

const DEFAULT_ACCOUNTS: Record<string, AccountConfig> = {
  [CHEQUE_ACCOUNTS.CHEQUES_TERCEROS]: {
    code: '1.1.2.02',
    name: 'Cheques de Terceros',
    type: 'activo',
    subtype: 'cheques_terceros',
  },
  [CHEQUE_ACCOUNTS.CHEQUES_TRANSITO]: {
    code: '1.1.2.01',
    name: 'Cheques en Transito',
    type: 'activo',
    subtype: 'cheques_transito',
  },
  [CHEQUE_ACCOUNTS.CHEQUES_RECHAZADOS]: {
    code: '1.1.2.99',
    name: 'Cheques Rechazados',
    type: 'activo',
    subtype: 'cheques_rechazados',
  },
  [CHEQUE_ACCOUNTS.CHEQUES_ENDOSADOS]: {
    code: '1.1.2.03',
    name: 'Cheques Endosados',
    type: 'activo',
    subtype: 'cheques_endosados',
  },
}

async function findOrCreateAccount(companyId: string, config: AccountConfig): Promise<string> {
  try {
    const existing = await db.account.findUnique({
      where: { companyId_code: { companyId, code: config.code } },
    })
    if (existing) return existing.id

    const created = await db.account.create({
      data: {
        code: config.code,
        name: config.name,
        type: config.type,
        subtype: config.subtype || null,
        companyId,
        level: config.code.split('.').length,
      },
    })
    console.log(`[cheque-journal] Cuenta creada: ${config.code} - ${config.name}`)
    return created.id
  } catch (error) {
    console.error(`[cheque-journal] Error creando cuenta ${config.code}:`, error)
    throw error
  }
}

async function findOrCreateBankAccount(companyId: string, bankName: string): Promise<string> {
  try {
    const existing = await db.account.findFirst({
      where: { companyId, type: 'activo', subtype: 'banco' },
    })
    if (existing) return existing.id

    const created = await db.account.create({
      data: {
        code: `${CHEQUE_ACCOUNTS.BANCO_PREFIX}.01`,
        name: `Banco ${bankName || 'General'}`,
        type: 'activo',
        subtype: 'banco',
        companyId,
        level: 4,
      },
    })
    console.log(`[cheque-journal] Cuenta banco creada: ${created.name}`)
    return created.id
  } catch (error) {
    console.error('[cheque-journal] Error creando cuenta banco:', error)
    throw error
  }
}

async function getNextJournalNumber(companyId: string): Promise<number> {
  const lastEntry = await db.journalEntry.findFirst({
    where: { companyId },
    orderBy: { number: 'desc' },
    select: { number: true },
  })
  return (lastEntry?.number || 0) + 1
}

export async function createChequeJournalEntry(params: {
  companyId: string
  cheque: { id: string; number: string; amount: number; bank: string }
  operation: 'depositar' | 'acreditar' | 'rechazar' | 'endosar'
  bankName?: string
}): Promise<{ journalEntryId: string } | null> {
  const { companyId, cheque, operation, bankName } = params
  const amount = Math.abs(cheque.amount)

  if (amount <= 0) {
    console.warn(`[cheque-journal] Monto invalido: ${amount}`)
    return null
  }

  try {
    let lines: { accountId: string; debit: number; credit: number; description: string }[] = []

    switch (operation) {
      case 'depositar': {
        const acctTransito = await findOrCreateAccount(companyId, DEFAULT_ACCOUNTS[CHEQUE_ACCOUNTS.CHEQUES_TRANSITO])
        const acctTerceros = await findOrCreateAccount(companyId, DEFAULT_ACCOUNTS[CHEQUE_ACCOUNTS.CHEQUES_TERCEROS])
        lines = [
          { accountId: acctTransito, debit: amount, credit: 0, description: `Cheque ${cheque.number} depositado` },
          { accountId: acctTerceros, debit: 0, credit: amount, description: `Cheque ${cheque.number} depositado` },
        ]
        break
      }
      case 'acreditar': {
        const acctBanco = await findOrCreateBankAccount(companyId, bankName || cheque.bank)
        const acctTransito = await findOrCreateAccount(companyId, DEFAULT_ACCOUNTS[CHEQUE_ACCOUNTS.CHEQUES_TRANSITO])
        lines = [
          { accountId: acctBanco, debit: amount, credit: 0, description: `Cheque ${cheque.number} acreditado - ${cheque.bank}` },
          { accountId: acctTransito, debit: 0, credit: amount, description: `Cheque ${cheque.number} acreditado` },
        ]
        break
      }
      case 'rechazar': {
        const acctRechazados = await findOrCreateAccount(companyId, DEFAULT_ACCOUNTS[CHEQUE_ACCOUNTS.CHEQUES_RECHAZADOS])
        const acctTransito = await findOrCreateAccount(companyId, DEFAULT_ACCOUNTS[CHEQUE_ACCOUNTS.CHEQUES_TRANSITO])
        lines = [
          { accountId: acctRechazados, debit: amount, credit: 0, description: `Cheque ${cheque.number} rechazado` },
          { accountId: acctTransito, debit: 0, credit: amount, description: `Cheque ${cheque.number} rechazado` },
        ]
        break
      }
      case 'endosar': {
        const acctEndosados = await findOrCreateAccount(companyId, DEFAULT_ACCOUNTS[CHEQUE_ACCOUNTS.CHEQUES_ENDOSADOS])
        const acctTerceros = await findOrCreateAccount(companyId, DEFAULT_ACCOUNTS[CHEQUE_ACCOUNTS.CHEQUES_TERCEROS])
        lines = [
          { accountId: acctEndosados, debit: amount, credit: 0, description: `Cheque ${cheque.number} endosado` },
          { accountId: acctTerceros, debit: 0, credit: amount, description: `Cheque ${cheque.number} endosado` },
        ]
        break
      }
    }

    if (lines.length === 0) return null

    const nextNumber = await getNextJournalNumber(companyId)
    const labels: Record<string, string> = {
      depositar: 'Deposito',
      acreditar: 'Acreditacion',
      rechazar: 'Rechazo',
      endosar: 'Endoso',
    }

    const entry = await db.journalEntry.create({
      data: {
        number: nextNumber,
        date: new Date(),
        description: `${labels[operation]} de Cheque Nro ${cheque.number} - ${cheque.bank}`,
        concept: `Asiento automatico por ${labels[operation].toLowerCase()} de cheque`,
        status: 'confirmado',
        companyId,
        totalDebit: amount,
        totalCredit: amount,
        lines: { create: lines },
      },
    })

    console.log(`[cheque-journal] Asiento #${nextNumber} creado (${labels[operation]}): ${entry.id}`)
    return { journalEntryId: entry.id }
  } catch (error) {
    console.error(`[cheque-journal] Error creando asiento (${operation}):`, error)
    return null
  }
}
