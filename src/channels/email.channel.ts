import nodemailer from 'nodemailer'
import type { Notification } from '@prisma/client'
import { env } from '../config/env'
import { renderTemplate } from '../utils/template.engine'
import { logger } from '../utils/logger'
import type { IChannel } from './channel.interface'
import type { DeliveryResult } from '../types'

export class EmailChannel implements IChannel {
  readonly channel = 'EMAIL'
  private transporter: nodemailer.Transporter

  constructor() {
    this.transporter = nodemailer.createTransport({
      host:   env.SMTP_HOST,
      port:   env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth:   env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  }

  async send(notification: Notification, variables: Record<string, unknown>): Promise<DeliveryResult> {
    const meta = notification.metadata as Record<string, unknown> | null
    const to   = meta?.['email'] as string | undefined

    if (!to) {
      return { success: false, error: 'No recipient email in notification metadata' }
    }

    const subject = notification.subject
      ? renderTemplate(notification.subject, variables)
      : 'Notification from HashiFlow'

    const html = renderTemplate(notification.body, variables)

    try {
      const info = await this.transporter.sendMail({
        from:    env.EMAIL_FROM,
        to,
        subject,
        html,
      })
      logger.debug('Email sent', { messageId: info.messageId, to })
      return { success: true, providerResponse: { messageId: info.messageId } }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      logger.error('Email delivery failed', { error, to })
      return { success: false, error }
    }
  }
}
