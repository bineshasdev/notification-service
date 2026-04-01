import type { Notification } from '@prisma/client'
import { redis, REDIS_CHANNELS } from '../config/redis'
import { renderTemplate } from '../utils/template.engine'
import { logger } from '../utils/logger'
import type { IChannel } from './channel.interface'
import type { DeliveryResult } from '../types'

export class InAppChannel implements IChannel {
  readonly channel = 'INAPP'

  async send(notification: Notification, variables: Record<string, unknown>): Promise<DeliveryResult> {
    const body = renderTemplate(notification.body, variables)
    const subject = notification.subject
      ? renderTemplate(notification.subject, variables)
      : undefined

    const event = {
      id:         notification.id,
      tenantId:   notification.tenantId,
      userId:     notification.userId,
      type:       notification.type,
      category:   notification.category,
      subject,
      body,
      metadata:   notification.metadata,
      createdAt:  notification.createdAt,
      readAt:     notification.readAt,
    }

    try {
      // Publish to the appropriate Redis channel
      // Socket.io server subscribes to these channels and emits to connected clients
      let redisChannel: string
      if (notification.type === 'USER' && notification.userId) {
        redisChannel = REDIS_CHANNELS.NOTIFICATION(notification.tenantId, notification.userId)
        // Increment unread count
        await redis.incr(REDIS_CHANNELS.UNREAD_COUNT(notification.tenantId, notification.userId))
        await redis.expire(REDIS_CHANNELS.UNREAD_COUNT(notification.tenantId, notification.userId), 86400 * 7)
      } else if (notification.type === 'TENANT') {
        redisChannel = REDIS_CHANNELS.NOTIFICATION(notification.tenantId)
      } else {
        redisChannel = REDIS_CHANNELS.SYSTEM()
      }

      await redis.publish(redisChannel, JSON.stringify(event))
      logger.debug('In-app notification published', { id: notification.id, channel: redisChannel })
      return { success: true }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      logger.error('In-app delivery failed', { error, id: notification.id })
      return { success: false, error }
    }
  }
}
