import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { preferenceService } from '../services/preference.service'

const updateSchema = z.object({
  enabled:     z.boolean().optional(),
  dndStart:    z.string().regex(/^\d{2}:\d{2}$/).optional(),
  dndEnd:      z.string().regex(/^\d{2}:\d{2}$/).optional(),
  dndTimezone: z.string().optional(),
})

export const preferenceController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId   = (req as any).userId   as string
      const tenantId = (req as any).tenantId as string
      res.json(await preferenceService.getAll(tenantId, userId))
    } catch (err) { next(err) }
  },

  async upsert(req: Request, res: Response, next: NextFunction) {
    try {
      const { channel } = req.params
      const dto         = updateSchema.parse(req.body)
      const userId      = (req as any).userId   as string
      const tenantId    = (req as any).tenantId as string
      res.json(await preferenceService.upsert(tenantId, userId, channel as any, dto))
    } catch (err) { next(err) }
  },
}
