export const KAFKA_TOPICS = {
  JOURNAL_ENTRIES: 'contaflow.journal-entries',
  INVOICES: 'contaflow.invoices',
  PAYMENTS: 'contaflow.payments',
  USERS: 'contaflow.users',
  ACCOUNTS: 'contaflow.accounts',
  AUDIT: 'contaflow.audit',
} as const

export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS]

export const EVENT_TYPES = {
  // Journal Entries
  JOURNAL_ENTRY_CREATED: 'journal-entry.created',
  JOURNAL_ENTRY_CONFIRMED: 'journal-entry.confirmed',
  JOURNAL_ENTRY_DELETED: 'journal-entry.deleted',

  // Invoices
  INVOICE_CREATED: 'invoice.created',
  INVOICE_UPDATED: 'invoice.updated',
  INVOICE_STATUS_CHANGED: 'invoice.status-changed',
  INVOICE_DELETED: 'invoice.deleted',

  // Payments
  PAYMENT_CREATED: 'payment.created',
  PAYMENT_DELETED: 'payment.deleted',

  // Users & Roles
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  ROLE_CHANGED: 'user.role-changed',

  // Accounts
  ACCOUNT_BALANCE_CHANGED: 'account.balance-changed',
} as const

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES]

// Mapping from event type to its Kafka topic
export function getTopicForEvent(eventType: string): string {
  if (eventType.startsWith('journal-entry')) return KAFKA_TOPICS.JOURNAL_ENTRIES
  if (eventType.startsWith('invoice')) return KAFKA_TOPICS.INVOICES
  if (eventType.startsWith('payment')) return KAFKA_TOPICS.PAYMENTS
  if (eventType.startsWith('user') || eventType.startsWith('role')) return KAFKA_TOPICS.USERS
  if (eventType.startsWith('account')) return KAFKA_TOPICS.ACCOUNTS
  return KAFKA_TOPICS.AUDIT
}
