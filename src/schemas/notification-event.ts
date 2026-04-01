/**
 * Avro schema definition for platform.notification.events.
 * Must stay in sync with platform-service/src/main/avro/NotificationEvent.avsc.
 */
export const NOTIFICATION_EVENT_SCHEMA = {
  type: 'record',
  name: 'NotificationEvent',
  namespace: 'com.flowbinary.platform.event.avro',
  fields: [
    { name: 'eventId',    type: 'string' },
    { name: 'eventType',  type: 'string' },
    { name: 'occurredAt', type: 'string' },
    { name: 'source',     type: 'string', default: 'platform-service' },
    {
      name: 'audience',
      type: {
        type: 'record',
        name: 'EventAudience',
        fields: [
          { name: 'tenantId', type: 'string' },
          {
            name: 'scope',
            type: {
              type: 'enum',
              name: 'AudienceScope',
              symbols: ['USER', 'TENANT', 'SYSTEM'],
            },
          },
          { name: 'userIds', type: { type: 'array', items: 'string' }, default: [] },
        ],
      },
    },
    { name: 'data',           type: { type: 'map', values: 'string' }, default: {} },
    { name: 'idempotencyKey', type: ['null', 'string'],                default: null },
  ],
} as const

export type AudienceScope = 'USER' | 'TENANT' | 'SYSTEM'

export interface EventAudience {
  tenantId: string
  scope:    AudienceScope
  userIds:  string[]
}

export interface NotificationEventPayload {
  eventId:         string
  eventType:       string
  occurredAt:      string
  source:          string
  audience:        EventAudience
  data:            Record<string, string>
  idempotencyKey?: string | null
}
