import { Router, Request, Response } from 'express'
import { prisma } from './config/database'
import { redis } from './config/redis'
import { kafka } from './config/kafka'
import { deliveryQueue } from './services/delivery.service'
import { env } from './config/env'

const router = Router()

interface CheckResult {
  status: 'up' | 'down'
  latencyMs?: number
  detail?: string
}

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return { status: 'up', latencyMs: Date.now() - start }
  } catch (err) {
    return { status: 'down', detail: err instanceof Error ? err.message : String(err) }
  }
}

async function checkRedis(): Promise<CheckResult> {
  const start = Date.now()
  try {
    const pong = await redis.ping()
    return { status: pong === 'PONG' ? 'up' : 'down', latencyMs: Date.now() - start }
  } catch (err) {
    return { status: 'down', detail: err instanceof Error ? err.message : String(err) }
  }
}

async function checkKafka(): Promise<CheckResult> {
  const start = Date.now()
  const admin = kafka.admin()
  try {
    await admin.connect()
    await admin.listTopics()
    return { status: 'up', latencyMs: Date.now() - start }
  } catch (err) {
    return { status: 'down', detail: err instanceof Error ? err.message : String(err) }
  } finally {
    admin.disconnect().catch(() => {})
  }
}

async function checkQueue(): Promise<CheckResult & { counts?: object }> {
  try {
    const counts = await deliveryQueue.getJobCounts('waiting', 'active', 'failed', 'delayed')
    return { status: 'up', counts }
  } catch (err) {
    return { status: 'down', detail: err instanceof Error ? err.message : String(err) }
  }
}

// GET /health — lightweight liveness probe (no dependency checks)
router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'notification-service',
    version: process.env.npm_package_version ?? '1.0.0',
    timestamp: new Date().toISOString(),
  })
})

// GET /health/ready — readiness probe (checks all dependencies)
router.get('/ready', async (_req: Request, res: Response) => {
  const [db, redisCheck, kafkaCheck, queue] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkKafka(),
    checkQueue(),
  ])

  const checks = {
    database: db,
    redis:    redisCheck,
    kafka:    kafkaCheck,
    queue,
  }

  const allUp = Object.values(checks).every(c => c.status === 'up')

  res.status(allUp ? 200 : 503).json({
    status:  allUp ? 'ok' : 'degraded',
    service: 'notification-service',
    uptime:  Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    checks,
  })
})

// GET /health/live — kubernetes liveness probe (process is alive)
router.get('/live', (_req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: Math.floor(process.uptime()) })
})

export default router
