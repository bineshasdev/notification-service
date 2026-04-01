import 'dotenv/config'
import http from 'http'
import { createApp } from './app'
import { createSocketServer } from './realtime/socket.server'
import { connectDatabase, disconnectDatabase } from './config/database'
import { connectRedis } from './config/redis'
import { startDeliveryWorker } from './services/delivery.service'
import { startKafkaConsumer } from './consumers/kafka.consumer'
import { startNotificationEventConsumer } from './consumers/notification-event.consumer'
import { env } from './config/env'
import { logger } from './utils/logger'

async function bootstrap() {
  await connectDatabase()
  await connectRedis()

  const app        = createApp()
  const httpServer = http.createServer(app)

  createSocketServer(httpServer)
  startDeliveryWorker()

  startKafkaConsumer().catch((err) =>
    logger.warn('Kafka consumer failed to start (running without event consumption)', { err }),
  )

  startNotificationEventConsumer().catch((err) =>
    logger.warn('Avro notification-event consumer failed to start', { err }),
  )

  httpServer.listen(env.PORT, () => {
    logger.info(`Notification service running on port ${env.PORT}`)
  })

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down`)
    httpServer.close()
    await disconnectDatabase()
    process.exit(0)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT',  () => shutdown('SIGINT'))
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err)
  process.exit(1)
})
