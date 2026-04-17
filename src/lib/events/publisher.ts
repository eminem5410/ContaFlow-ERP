// Stub implementation - will be replaced with actual Kafka producer
// For now, events are logged to console and audit log

import { logAction } from '@/lib/audit'
import { getTopicForEvent } from './topics'
import type { BaseEvent } from './types'

export interface PublishEventParams {
  eventType: string
  entityId: string
  companyId: string
  userId: string
  data: Record<string, unknown>
}

export async function publishEvent(params: PublishEventParams): Promise<BaseEvent<Record<string, unknown>>> {
  const event: BaseEvent<Record<string, unknown>> = {
    eventId: crypto.randomUUID(),
    eventType: params.eventType,
    timestamp: new Date().toISOString(),
    version: '1.0',
    source: 'contaflow-api',
    correlationId: crypto.randomUUID(),
    data: params.data,
  }

  // Log to audit trail
  await logAction({
    userId: params.userId,
    userName: 'system',
    action: `event:${params.eventType}`,
    entity: params.eventType.split('.')[0],
    entityId: params.entityId,
    details: JSON.stringify(event),
    companyId: params.companyId,
  })

  // TODO: When Kafka is connected, publish to topic
  // const topic = getTopicForEvent(params.eventType)
  // await kafkaProducer.send({ topic, messages: [{ value: JSON.stringify(event) }] })
  // console.log(`[EventBus] Published ${params.eventType} to ${topic}`, event)

  return event
}
