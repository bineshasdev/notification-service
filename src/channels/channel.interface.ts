import type { Notification } from '@prisma/client'
import type { DeliveryResult } from '../types'

/**
 * Channel delivery interface.
 * Supported channels: EMAIL, SMS, PUSH, INAPP, WHATSAPP
 */
export interface IChannel {
  readonly channel: string
  send(notification: Notification, variables: Record<string, unknown>): Promise<DeliveryResult>
}
