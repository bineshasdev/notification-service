export type Channel = 'EMAIL' | 'SMS' | 'PUSH' | 'INAPP' | 'WHATSAPP'
export type NotificationType = 'USER' | 'SYSTEM' | 'TENANT'
export type NotificationCategory = 'MESSAGE' | 'WARNING' | 'ANNOUNCEMENT' | 'ALERT'
export type DeliveryStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'RETRYING' | 'READ' | 'SCHEDULED'
export type EventCategory = 'AUTH' | 'USER_MANAGEMENT' | 'TENANT' | 'BILLING' | 'DOCUMENT' | 'SYSTEM'

export interface JwtPayload {
  sub: string        // userId (Keycloak UUID)
  tenantId?: string  // extracted from organization claim
  email?: string
  realm_access?: { roles: string[] }
  organization?: Record<string, { id: string }>
}

export interface AuthenticatedRequest extends Express.Request {
  userId: string
  tenantId: string
  email?: string
  roles: string[]
}

export interface EventVariable {
  key: string
  description: string
  example?: string
}

export interface NotificationEventDto {
  code: string
  name: string
  description?: string
  category: EventCategory
  scope: NotificationType
  defaultChannels: Channel[]
  variables: EventVariable[]
  isActive: boolean
}

export interface CreateNotificationDto {
  tenantId: string
  userId?: string
  type: NotificationType
  category?: NotificationCategory
  channels: Channel[]
  templateCode?: string
  templateId?: string
  subject?: string
  body?: string
  payload?: Record<string, unknown>
  scheduledAt?: string
  expiresAt?: string
  idempotencyKey?: string
}

export interface BulkCreateNotificationDto {
  notifications: CreateNotificationDto[]
}

export interface CreateTemplateDto {
  eventCode: string
  name: string
  channel: Channel
  subject?: string
  body: string
  bodyMjml?: string
  bodyHtml?: string
  tenantId?: string
  isSystem?: boolean
}

export interface CustomizeTemplateDto {
  eventCode: string
  channel: Channel
  name?: string
  subject?: string
  body?: string
  bodyMjml?: string
  bodyHtml?: string
}

export interface UpdateTemplateDto {
  name?: string
  subject?: string
  body?: string
  bodyMjml?: string
  bodyHtml?: string
  isActive?: boolean
}

export interface UpdatePreferenceDto {
  enabled?: boolean
  dndStart?: string
  dndEnd?: string
  dndTimezone?: string
}

export interface KafkaNotificationEvent {
  eventType: string
  tenantId: string
  userId?: string
  payload: Record<string, unknown>
  idempotencyKey?: string
}

export interface DeliveryResult {
  success: boolean
  providerResponse?: unknown
  error?: string
}

export interface NotificationJobData {
  notificationId: string
  channel: Channel
  attempt: number
}
