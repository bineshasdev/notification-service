import { Kafka } from 'kafkajs'
import { schemaRegistry, registerNotificationEventSchema } from '../config/schema-registry'
import { notificationService } from '../services/notification.service'
import { prisma } from '../config/database'
import { env } from '../config/env'
import { logger } from '../utils/logger'
import type { NotificationEventPayload, AudienceScope } from '../schemas/notification-event'

// Separate consumer group so this consumer doesn't interfere with the legacy one
const kafka = new Kafka({
  clientId: `${env.KAFKA_CLIENT_ID}-avro`,
  brokers:  env.KAFKA_BROKERS.split(','),
})

const consumer = kafka.consumer({ groupId: `${env.KAFKA_GROUP_ID}-avro` })

export async function startNotificationEventConsumer(): Promise<void> {
  // Ensure schema is registered / resolve its ID before consuming
  await registerNotificationEventSchema()

  await consumer.connect()
  await consumer.subscribe({
    topic:         env.KAFKA_TOPIC_NOTIFICATION_EVENTS,
    fromBeginning: false,
  })

  await consumer.run({
    eachMessage: async ({ partition, message }) => {
      if (!message.value) return

      let event: NotificationEventPayload
      try {
        event = await schemaRegistry.decode(message.value) as NotificationEventPayload
      } catch (err) {
        logger.error('Avro decode failed for notification event', { err, partition })
        return
      }

      logger.debug('NotificationEvent received', {
        eventType: event.eventType,
        tenantId:  event.audience.tenantId,
        scope:     event.audience.scope,
      })

      try {
        await dispatch(event)
      } catch (err) {
        logger.error('NotificationEvent dispatch failed', { err, eventType: event.eventType })
      }
    },
  })

  logger.info(`Avro notification-event consumer started on topic [${env.KAFKA_TOPIC_NOTIFICATION_EVENTS}]`)
}

// ── Dispatch ────────────────────────────────────────────────────────────────

async function dispatch(event: NotificationEventPayload): Promise<void> {
  // Map Avro eventType → notification event code (matches seeded NotificationEvent.code)
  const eventCode = toEventCode(event.eventType)
  if (!eventCode) {
    logger.debug('No event code mapping for eventType', { eventType: event.eventType })
    return
  }

  const notifEvent = await prisma.notificationEvent.findUnique({
    where: { code: eventCode, isActive: true },
  })
  if (!notifEvent) {
    logger.debug('NotificationEvent not configured in DB', { eventCode })
    return
  }

  const tenantId = event.audience.tenantId

  // Resolve recipient user IDs from the audience
  const userIds = resolveUserIds(event.audience.scope, event.audience.userIds)

  if (userIds.length === 0) {
    // TENANT or SYSTEM scope — create one notification without a specific userId
    await notificationService.create({
      tenantId,
      type:           notifEvent.scope as 'USER' | 'SYSTEM' | 'TENANT',
      channels:       notifEvent.defaultChannels as any[],
      templateCode:   notifEvent.code,
      payload:        event.data,
      idempotencyKey: event.idempotencyKey ?? undefined,
    })
  } else {
    // USER scope — one notification per recipient
    await Promise.all(
      userIds.map((userId) =>
        notificationService.create({
          tenantId,
          userId,
          type:           notifEvent.scope as 'USER' | 'SYSTEM' | 'TENANT',
          channels:       notifEvent.defaultChannels as any[],
          templateCode:   notifEvent.code,
          payload:        event.data,
          idempotencyKey: event.idempotencyKey
            ? `${event.idempotencyKey}:${userId}`
            : undefined,
        }),
      ),
    )
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Maps platform-service Avro eventType values to the seeded notification event codes.
 * Add entries here as new event types are introduced.
 */
const EVENT_CODE_MAP: Record<string, string> = {
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',   // re-uses the role_changed template for updates
  USER_DELETED: 'user.deactivated',    // re-uses the deactivated template for deletes
}

function toEventCode(eventType: string): string | null {
  return EVENT_CODE_MAP[eventType] ?? null
}

function resolveUserIds(scope: AudienceScope, userIds: string[]): string[] {
  if (scope === 'USER') return userIds
  return []   // TENANT/SYSTEM: let the service create a single tenant-level notification
}
