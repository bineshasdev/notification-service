import { kafkaConsumer } from '../config/kafka'
import { notificationService } from '../services/notification.service'
import { prisma } from '../config/database'
import { env } from '../config/env'
import { logger } from '../utils/logger'
import type { KafkaNotificationEvent } from '../types'

export async function startKafkaConsumer(): Promise<void> {
  await kafkaConsumer.connect()
  await kafkaConsumer.subscribe({
    topics: [env.KAFKA_TOPIC_NOTIFICATIONS, env.KAFKA_TOPIC_EVENTS],
    fromBeginning: false,
  })

  await kafkaConsumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      if (!message.value) return

      try {
        const event: KafkaNotificationEvent = JSON.parse(message.value.toString())
        logger.debug('Kafka event received', { topic, eventType: event.eventType })

        if (topic === env.KAFKA_TOPIC_NOTIFICATIONS) {
          // Direct notification dispatch
          await notificationService.create({
            tenantId:       event.tenantId,
            userId:         event.userId,
            type:           'USER',
            channels:       ['INAPP'],
            payload:        event.payload,
            idempotencyKey: event.idempotencyKey,
            body:           String(event.payload?.['message'] ?? ''),
          } as any)
        } else if (topic === env.KAFKA_TOPIC_EVENTS) {
          // Look up the event in the database
          const notifEvent = await prisma.notificationEvent.findUnique({
            where: { code: event.eventType, isActive: true },
          })
          if (!notifEvent) {
            logger.debug('No notification event configured for: ' + event.eventType)
            return
          }

          await notificationService.create({
            tenantId:       event.tenantId,
            userId:         event.userId,
            type:           notifEvent.scope,
            channels:       notifEvent.defaultChannels,
            templateCode:   notifEvent.code,
            payload:        event.payload,
            idempotencyKey: event.idempotencyKey,
          } as any)
        }
      } catch (err) {
        logger.error('Kafka message processing failed', { err, topic, partition })
      }
    },
  })

  logger.info('Kafka consumer started')
}
