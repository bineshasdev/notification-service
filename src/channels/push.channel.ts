import type { Notification } from '@prisma/client'
import { env } from '../config/env'
import { renderTemplate } from '../utils/template.engine'
import { logger } from '../utils/logger'
import type { IChannel } from './channel.interface'
import type { DeliveryResult } from '../types'

export class PushChannel implements IChannel {
  readonly channel = 'PUSH'

  async send(notification: Notification, variables: Record<string, unknown>): Promise<DeliveryResult> {
    const meta  = notification.metadata as Record<string, unknown> | null
    const token = meta?.['fcmToken'] as string | undefined

    if (!token) {
      return { success: false, error: 'No FCM token in notification metadata' }
    }

    if (!env.FCM_SERVER_KEY) {
      logger.warn('Push channel not configured: missing FCM_SERVER_KEY')
      return { success: false, error: 'Push provider not configured' }
    }

    const title = notification.subject
      ? renderTemplate(notification.subject, variables)
      : 'HashiFlow'
    const body = renderTemplate(notification.body, variables)

    try {
      const res = await fetch('https://fcm.googleapis.com/fcm/send', {
        method:  'POST',
        headers: {
          Authorization:  `key=${env.FCM_SERVER_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: token,
          notification: { title, body },
          data: { notificationId: notification.id, category: notification.category },
        }),
      })

      const data = await res.json()
      if (!res.ok || data.failure) {
        throw new Error(data.results?.[0]?.error ?? `FCM error ${res.status}`)
      }

      logger.debug('Push sent', { messageId: data.multicast_id })
      return { success: true, providerResponse: data }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      logger.error('Push delivery failed', { error })
      return { success: false, error }
    }
  }
}
