import { Server as HttpServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { redisSub } from '../config/redis'
import { env } from '../config/env'
import { logger } from '../utils/logger'

const JWKS = createRemoteJWKSet(new URL(env.JWKS_URI))

function extractOrgId(payload: Record<string, unknown>): string | undefined {
  const org = payload['organization']
  if (typeof org !== 'object' || org === null) return undefined
  const first = Object.values(org as Record<string, unknown>)[0]
  if (typeof first !== 'object' || first === null) return undefined
  return (first as Record<string, string>)['id']
}

export function createSocketServer(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin:      env.SOCKET_CORS_ORIGIN.split(','),
      credentials: true,
    },
    path: '/ws/notifications',
  })

  // JWT auth handshake
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string
      if (!token) return next(new Error('Missing auth token'))

      const { payload } = await jwtVerify(token, JWKS, { issuer: env.JWT_ISSUER })

      const tenantId = extractOrgId(payload as Record<string, unknown>)
      if (!tenantId) return next(new Error('No tenant context in token'))

      socket.data.userId   = payload.sub as string
      socket.data.tenantId = tenantId
      next()
    } catch (err) {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    const { userId, tenantId } = socket.data as { userId: string; tenantId: string }
    logger.debug('Socket connected', { userId, tenantId })

    // Join user-specific and tenant rooms
    socket.join(`user:${tenantId}:${userId}`)
    socket.join(`tenant:${tenantId}`)
    socket.join('system')

    socket.on('disconnect', () => {
      logger.debug('Socket disconnected', { userId })
    })
  })

  // Subscribe to Redis and forward to Socket.io rooms
  subscribeToRedis(io)

  return io
}

function subscribeToRedis(io: SocketServer): void {
  // Subscribe to all notification channels using pattern
  redisSub.psubscribe('notification:*', (err) => {
    if (err) logger.error('Redis psubscribe failed', { err })
    else logger.info('Subscribed to Redis notification channels')
  })

  redisSub.on('pmessage', (_pattern, channel, message) => {
    try {
      const data = JSON.parse(message)

      if (channel.startsWith('notification:system')) {
        io.to('system').emit('notification', data)
      } else if (channel.startsWith('notification:tenant:')) {
        const tenantId = channel.replace('notification:tenant:', '')
        io.to(`tenant:${tenantId}`).emit('notification', data)
      } else {
        // notification:{tenantId}:{userId}
        const parts    = channel.split(':')
        const tenantId = parts[1]
        const userId   = parts[2]
        if (tenantId && userId) {
          io.to(`user:${tenantId}:${userId}`).emit('notification', data)
        }
      }
    } catch (err) {
      logger.error('Redis message parse error', { err, channel })
    }
  })
}
