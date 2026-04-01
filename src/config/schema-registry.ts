import { SchemaRegistry, SchemaType } from '@kafkajs/confluent-schema-registry'
import { NOTIFICATION_EVENT_SCHEMA } from '../schemas/notification-event'
import { env } from './env'
import { logger } from '../utils/logger'

export const schemaRegistry = new SchemaRegistry({ host: env.SCHEMA_REGISTRY_URL })

/**
 * Returns the numeric schema ID for NotificationEvent, registering it first
 * if it does not exist in the registry yet.
 * Called once on consumer startup — cached by the registry client after that.
 */
export async function registerNotificationEventSchema(): Promise<number> {
  const subject = `${env.KAFKA_TOPIC_NOTIFICATION_EVENTS}-value`
  const { id } = await schemaRegistry.register(
    { type: SchemaType.AVRO, schema: JSON.stringify(NOTIFICATION_EVENT_SCHEMA) },
    { subject },
  )
  logger.info(`NotificationEvent schema registered/resolved: id=${id} subject=${subject}`)
  return id
}
