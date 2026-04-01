import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { notificationService } from '../services/notification.service'

const createSchema = z.object({
  userId:         z.string().uuid().optional(),
  type:           z.enum(['USER', 'SYSTEM', 'TENANT']),
  category:       z.enum(['MESSAGE', 'WARNING', 'ANNOUNCEMENT', 'ALERT']).optional(),
  channels:       z.array(z.enum(['EMAIL', 'SMS', 'PUSH', 'INAPP'])).min(1),
  templateCode:   z.string().optional(),
  templateId:     z.string().uuid().optional(),
  subject:        z.string().optional(),
  body:           z.string().optional(),
  payload:        z.record(z.unknown()).optional(),
  scheduledAt:    z.string().datetime().optional(),
  expiresAt:      z.string().datetime().optional(),
  idempotencyKey: z.string().optional(),
})

export const notificationController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const dto    = createSchema.parse(req.body)
      const result = await notificationService.create({
        ...dto,
        tenantId: (req as any).tenantId,
      })
      res.status(201).json(result)
    } catch (err) {
      next(err)
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { type, page = '0', size = '20' } = req.query
      const userId   = (req as any).userId   as string
      const tenantId = (req as any).tenantId as string

      const result = await notificationService.list(
        tenantId,
        userId,
        type as string | undefined,
        parseInt(page as string),
        parseInt(size as string),
      )
      res.json(result)
    } catch (err) {
      next(err)
    }
  },

  async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { id }   = req.params
      const userId   = (req as any).userId   as string
      const tenantId = (req as any).tenantId as string
      const result   = await notificationService.markRead(id, tenantId, userId)
      res.json(result)
    } catch (err) {
      next(err)
    }
  },

  async markAllRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId   = (req as any).userId   as string
      const tenantId = (req as any).tenantId as string
      await notificationService.markAllRead(tenantId, userId)
      res.status(204).send()
    } catch (err) {
      next(err)
    }
  },

  async unreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId   = (req as any).userId   as string
      const tenantId = (req as any).tenantId as string
      const count    = await notificationService.getUnreadCount(tenantId, userId)
      res.json({ count })
    } catch (err) {
      next(err)
    }
  },
}
