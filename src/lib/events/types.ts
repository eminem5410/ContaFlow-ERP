// Base event envelope
export interface BaseEvent<T> {
  eventId: string
  eventType: string
  timestamp: string
  version: string
  source: string
  correlationId?: string
  data: T
}

// Domain events
export interface JournalEntryCreatedEvent {
  entryId: string
  entryNumber: number
  companyId: string
  userId: string
  description: string
  totalDebit: number
  totalCredit: number
  status: string
}

export interface JournalEntryConfirmedEvent {
  entryId: string
  entryNumber: number
  companyId: string
  userId: string
  description: string
  affectedAccounts: Array<{
    accountId: string
    accountCode: string
    accountName: string
    debit: number
    credit: number
    newBalance: number
  }>
}

export interface InvoiceCreatedEvent {
  invoiceId: string
  invoiceNumber: string
  type: string
  companyId: string
  clientId: string | null
  total: number
  tax: number
  netTotal: number
}

export interface InvoiceStatusChangedEvent {
  invoiceId: string
  invoiceNumber: string
  previousStatus: string
  newStatus: string
  companyId: string
  reason?: string
}

export interface PaymentCreatedEvent {
  paymentId: string
  paymentNumber: string
  type: string // cobro | pago
  amount: number
  method: string
  companyId: string
  invoiceId: string | null
  clientId: string | null
  providerId: string | null
}

export interface PaymentDeletedEvent {
  paymentId: string
  paymentNumber: string
  amount: number
  companyId: string
  invoiceId: string | null
}

export interface UserCreatedEvent {
  userId: string
  email: string
  name: string
  role: string
  companyId: string
}

export interface RoleChangedEvent {
  userId: string
  previousRole: string
  newRole: string
  companyId: string
  changedBy: string
}

export interface AccountBalanceChangedEvent {
  accountId: string
  accountCode: string
  previousBalance: number
  newBalance: number
  companyId: string
  reason: string
  journalEntryId?: string
}

// Union type of all event data payloads
export type EventData =
  | JournalEntryCreatedEvent
  | JournalEntryConfirmedEvent
  | InvoiceCreatedEvent
  | InvoiceStatusChangedEvent
  | PaymentCreatedEvent
  | PaymentDeletedEvent
  | UserCreatedEvent
  | RoleChangedEvent
  | AccountBalanceChangedEvent

// Full event type with envelope
export type DomainEvent = BaseEvent<EventData>
