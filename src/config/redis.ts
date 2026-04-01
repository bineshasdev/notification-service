import Redis from 'ioredis'
import { env } from './env'
import { logger } from '../utils/logger'

// General-purpose client — keyPrefix applied for all cache / pub-sub keys
export const redis = new Redis(env.REDIS_URL, {
  keyPrefix:     env.REDIS_PREFIX,
  lazyConnect:   true,
  retryStrategy: (times) => Math.min(times * 100, 3000),
})

redis.on('connect',       () => logger.info('Redis connected'))
redis.on('error',  (err) => logger.error('Redis error', { err }))
redis.on('reconnecting',  () => logger.warn('Redis reconnecting'))

// Separate subscriber client (pub/sub requires its own connection)
export const redisSub = new Redis(env.REDIS_URL, {
  lazyConnect:   true,
  retryStrategy: (times) => Math.min(times * 100, 3000),
})

// BullMQ connection — must NOT have keyPrefix; BullMQ owns this connection's lifecycle
// No lazyConnect: BullMQ calls connect itself; manual connect would cause "already connecting" error
export const redisBullMQ = new Redis(env.REDIS_URL, {
  retryStrategy:        (times) => Math.min(times * 100, 3000),
  maxRetriesPerRequest: null, // required by BullMQ
})

export async function connectRedis(): Promise<void> {
  await redis.connect()
  await redisSub.connect()
  // redisBullMQ is intentionally excluded — BullMQ manages its own connection
  logger.info('Redis clients connected')
}

// Channel keys
export const REDIS_CHANNELS = {
  NOTIFICATION: (tenantId: string, userId?: string) =>
    userId ? `notification:${tenantId}:${userId}` : `notification:tenant:${tenantId}`,
  SYSTEM: () => 'notification:system',
  UNREAD_COUNT: (tenantId: string, userId: string) =>
    `${env.REDIS_PREFIX}unread:${tenantId}:${userId}`,
}
