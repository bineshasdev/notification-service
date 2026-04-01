import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import { env } from './config/env'
import routes from './routes'
import healthRouter from './health'
import { errorMiddleware } from './middleware/error'
import { logger } from './utils/logger'

export function createApp() {
  const app = express()

  // Trust the gateway's proxy (needed for rate-limit IP, X-Forwarded-* headers)
  app.set('trust proxy', 1)

  app.use(helmet())

  // Apply CORS only for direct connections.
  // When the request comes through the gateway, the gateway's globalcors already
  // set the headers and DedupeResponseHeader removes the duplicates from here.
  app.use(cors({
    origin: env.SOCKET_CORS_ORIGIN.split(','),
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Number', 'X-Page-Size'],
  }))
  app.use(compression() as any)
  app.use(express.json({ limit: '1mb' }))
  app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }))

  app.use(rateLimit({
    windowMs:        60 * 1000,
    max:             300,
    standardHeaders: true,
    legacyHeaders:   false,
  }))

  app.use('/health', healthRouter)

  app.use('/api/v1', routes)

  app.use(errorMiddleware)

  return app
}
