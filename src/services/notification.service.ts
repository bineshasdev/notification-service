import { prisma } from '../config/database'
import { deliveryQueue } from './delivery.service'
import { templateService } from './template.service'
import { preferenceService } from './preference.service'
import { renderTemplate } from '../utils/template.engine'
import { AppError } from '../middleware/error'
import { logger } from '../utils/logger'
import type { Channel, NotificationCategory, NotificationType } from '@prisma/client'
import type { CreateNotificationDto } from '../types'

export class NotificationService {
  async create(dto: CreateNotificationDto) {
    // Idempotency check
    if (dto.idempotencyKey) {
      const existing = await prisma.notification.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      })
      if (existing) {
        logger.debug('Idempotent notification skipped', { key: dto.idempotencyKey })
        return existing
      }
    }

    const notifications = await Promise.all(
      dto.channels.map((channel) =>
        this.createForChannel(dto, channel as Channel),
      ),
    )

    return notifications.filter(Boolean)
  }

  private async createForChannel(dto: CreateNotificationDto, channel: Channel) {
    // Preference check for INAPP/user notifications
    if (dto.userId && dto.type === 'USER') {
      const enabled = await preferenceService.isChannelEnabled(dto.tenantId, dto.userId, channel)
      if (!enabled) {
        logger.debug('Channel disabled by user preference', { channel, userId: dto.userId })
        return null
      }
    }

    let subject = dto.subject
    let body    = dto.body ?? ''
    const payload = dto.payload ?? {}

    let resolvedTemplateId = dto.templateId ?? null

    // Resolve template
    if (dto.templateCode) {
      const template = await templateService.getByCode(dto.templateCode, channel, dto.tenantId)
      if (!template) {
        logger.warn(`Template not found: ${dto.templateCode} channel=${channel}`)
        return null
      }
      resolvedTemplateId = template.id
      subject = template.subject ? renderTemplate(template.subject, payload) : subject
      body    = renderTemplate(template.body, payload)
    } else if (dto.templateId) {
      const template = await prisma.notificationTemplate.findUnique({ where: { id: dto.templateId } })
      if (template) {
        subject = template.subject ? renderTemplate(template.subject, payload) : subject
        body    = renderTemplate(template.body, payload)
      }
    } else if (body) {
      body = renderTemplate(body, payload)
    }

    if (!body) throw new AppError('Notification body is required when no template is specified', 400)

    const notification = await prisma.notification.create({
      data: {
        tenantId:        dto.tenantId,
        userId:          dto.userId ?? null,
        type:            dto.type as NotificationType,
        category:        (dto.category ?? 'MESSAGE') as NotificationCategory,
        channel,
        eventCode:       dto.templateCode ?? null,
        templateId:      resolvedTemplateId,
        subject:         subject ?? null,
        body,
        metadata:        (dto.payload ?? null) as any,
        status:          dto.scheduledAt ? 'SCHEDULED' : 'PENDING',
        scheduledAt:     dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        expiresAt:       dto.expiresAt ? new Date(dto.expiresAt) : null,
        idempotencyKey:  dto.idempotencyKey ?? null,
      },
    })

    // Queue for delivery (with delay if scheduled)
    const delay = dto.scheduledAt
      ? Math.max(0, new Date(dto.scheduledAt).getTime() - Date.now())
      : 0

    await deliveryQueue.add(
      `deliver:${notification.id}`,
      { notificationId: notification.id, channel, attempt: 1 },
      { delay, jobId: notification.id },
    )

    logger.info('Notification queued', { id: notification.id, channel, type: dto.type })
    return notification
  }

  async list(tenantId: string, userId?: string, type?: string, page = 0, size = 20) {
    const where = {
      tenantId,
      ...(userId ? { userId } : {}),
      ...(type   ? { type: type as NotificationType } : {}),
    }
    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy:  { createdAt: 'desc' },
        skip:     page * size,
        take:     size,
        include:  { deliveryLogs: { orderBy: { createdAt: 'desc' }, take: 1 } },
      }),
      prisma.notification.count({ where }),
    ])
    return { content: items, totalElements: total, totalPages: Math.ceil(total / size), number: page, size }
  }

  async markRead(id: string, tenantId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id, tenantId, userId, channel: 'INAPP' },
    })
    if (!notification) throw new AppError('Notification not found', 404)

    const updated = await prisma.notification.update({
      where: { id },
      data:  { status: 'READ', readAt: new Date() },
    })

    // Decrement unread count in Redis
    const { redis: redisClient, REDIS_CHANNELS } = await import('../config/redis')
    const key = REDIS_CHANNELS.UNREAD_COUNT(tenantId, userId)
    const cur = await redisClient.get(key)
    if (cur !== null && parseInt(cur) > 0) {
      await redisClient.decr(key)
    }

    return updated
  }

  async markAllRead(tenantId: string, userId: string) {
    await prisma.notification.updateMany({
      where:  { tenantId, userId, channel: 'INAPP', status: { not: 'READ' } },
      data:   { status: 'READ', readAt: new Date() },
    })
    const { redis: redisClient, REDIS_CHANNELS } = await import('../config/redis')
    await redisClient.set(REDIS_CHANNELS.UNREAD_COUNT(tenantId, userId), '0')
  }

  async getUnreadCount(tenantId: string, userId: string): Promise<number> {
    return preferenceService.getUnreadCount(tenantId, userId)
  }
}

export const notificationService = new NotificationService()
