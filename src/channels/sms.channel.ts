import type { Notification } from '@prisma/client'
import { env } from '../config/env'
import { renderTemplate } from '../utils/template.engine'
import { logger } from '../utils/logger'
import type { IChannel } from './channel.interface'
import type { DeliveryResult } from '../types'

export class SmsChannel implements IChannel {
  readonly channel = 'SMS'

  async send(notification: Notification, variables: Record<string, unknown>): Promise<DeliveryResult> {
    const meta = notification.metadata as Record<string, unknown> | null
    const to   = meta?.['phone'] as string | undefined

    if (!to) {
      return { success: false, error: 'No phone number in notification metadata' }
    }

    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
      logger.warn('SMS channel not configured: missing Twilio credentials')
      return { success: false, error: 'SMS provider not configured' }
    }

    const body = renderTemplate(notification.body, variables)

    try {
      // Dynamic import to avoid bundling issues if Twilio SDK is added later
      const url = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`
      const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64')

      const res = await fetch(url, {
        method:  'POST',
        headers: {
          Authorization:  `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ From: env.TWILIO_FROM_NUMBER!, To: to, Body: body }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? `Twilio error ${res.status}`)

      logger.debug('SMS sent', { sid: data.sid, to })
      return { success: true, providerResponse: { sid: data.sid } }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      logger.error('SMS delivery failed', { error, to })
      return { success: false, error }
    }
  }
}
