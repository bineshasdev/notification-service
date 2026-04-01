import { z } from 'zod'

const schema = z.object({
  NODE_ENV:  z.enum(['development', 'production', 'test']).default('development'),
  PORT:      z.coerce.number().default(3002),

  DATABASE_URL: z.string(),

  REDIS_URL:    z.string().default('redis://localhost:6379'),
  REDIS_PREFIX: z.string().default('notif:'),

  KAFKA_BROKERS:                      z.string().default('localhost:9092'),
  KAFKA_GROUP_ID:                     z.string().default('notification-service'),
  KAFKA_CLIENT_ID:                    z.string().default('notification-service'),
  KAFKA_TOPIC_NOTIFICATIONS:          z.string().default('platform.notifications'),
  KAFKA_TOPIC_EVENTS:                 z.string().default('platform.events'),
  KAFKA_TOPIC_NOTIFICATION_EVENTS:    z.string().default('platform.notification.events'),
  SCHEMA_REGISTRY_URL:                z.string().default('http://localhost:8081'),

  SOCKET_CORS_ORIGIN: z.string().default('http://localhost:3000'),

  JWKS_URI:   z.string(),
  JWT_ISSUER: z.string(),

  EMAIL_PROVIDER: z.enum(['smtp', 'ses']).default('smtp'),
  SMTP_HOST:      z.string().default('localhost'),
  SMTP_PORT:      z.coerce.number().default(587),
  SMTP_USER:      z.string().optional(),
  SMTP_PASS:      z.string().optional(),
  EMAIL_FROM:     z.string().default('noreply@hashiflow.io'),

  TWILIO_ACCOUNT_SID:  z.string().optional(),
  TWILIO_AUTH_TOKEN:   z.string().optional(),
  TWILIO_FROM_NUMBER:  z.string().optional(),

  FCM_SERVER_KEY: z.string().optional(),

  MAX_RETRY_ATTEMPTS: z.coerce.number().default(3),
  RETRY_DELAY_MS:     z.coerce.number().default(5000),
})

const _env = schema.safeParse(process.env)
if (!_env.success) {
  console.error('❌ Invalid environment variables:', _env.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = _env.data
