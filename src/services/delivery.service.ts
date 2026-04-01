import { Queue, Worker } from 'bullmq'
import { redisBullMQ } from '../config/redis'
import { prisma } from '../config/database'
import { EmailChannel } from '../channels/email.channel'
import { SmsChannel } from '../channels/sms.channel'
import { PushChannel } from '../channels/push.channel'
import { InAppChannel } from '../channels/inapp.channel'
import type { IChannel } from '../channels/channel.interface'
import type { Channel } from '@prisma/client'
import type { NotificationJobData } from '../types'
import { env } from '../config/env'
import { logger } from '../utils/logger'

const QUEUE_NAME = 'notification-delivery'

const channels: Record<Channel, IChannel> = {
  EMAIL: new EmailChannel(),
  SMS:   new SmsChannel(),
  PUSH:  new PushChannel(),
  INAPP: new InAppChannel(),
}

export const deliveryQueue = new Queue<NotificationJobData>(QUEUE_NAME, {
  connection: redisBullMQ,
  defaultJobOptions: {
    attempts:    env.MAX_RETRY_ATTEMPTS,
    backoff:     { type: 'exponential', delay: env.RETRY_DELAY_MS },
    removeOnComplete: 100,
    removeOnFail:     200,
  },
})

export function startDeliveryWorker(): void {
  const worker = new Worker<NotificationJobData>(
    QUEUE_NAME,
    async (job) => {
      const { notificationId, channel, attempt } = job.data

      const notification = await prisma.notification.findUnique({ where: { id: notificationId } })
      if (!notification) {
        logger.warn(`Notification not found: ${notificationId}`)
        return
      }

      const payload = (notification.metadata as Record<string, unknown>) ?? {}
      const result  = await channels[channel].send(notification, payload)

      const status  = result.success ? 'DELIVERED' : 'FAILED'

      await prisma.$transaction([
        prisma.deliveryLog.create({
          data: {
            notificationId,
            channel,
            attempt,
            status,
            providerResponse: result.providerResponse ? (result.providerResponse as any) : undefined,
            error:       result.error,
            deliveredAt: result.success ? new Date() : undefined,
          },
        }),
        prisma.notification.update({
          where: { id: notificationId },
          data:  { status, updatedAt: new Date() },
        }),
      ])

      if (!result.success) throw new Error(result.error ?? 'Delivery failed')
    },
    {
      connection:  redisBullMQ,
      concurrency: 20,
    },
  )

  worker.on('failed', (job, err) => {
    if (!job) return
    const isLastAttempt = job.attemptsMade >= (job.opts.attempts ?? env.MAX_RETRY_ATTEMPTS)
    logger.error('Delivery job failed', { jobId: job.id, err: err.message, isLastAttempt })
    if (isLastAttempt) {
      prisma.notification.update({
        where: { id: job.data.notificationId },
        data:  { status: 'FAILED' },
      }).catch(() => {})
    } else {
      prisma.notification.update({
        where: { id: job.data.notificationId },
        data:  { status: 'RETRYING' },
      }).catch(() => {})
    }
  })

  logger.info('Delivery worker started')
}
