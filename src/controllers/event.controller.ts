import { Request, Response, NextFunction } from 'express'
import { eventService } from '../services/event.service'

export const eventController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const category = req.query.category as any
      res.json(await eventService.listAll(category))
    } catch (err) { next(err) }
  },

  async getByCode(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).tenantId as string | undefined
      if (tenantId) {
        res.json(await eventService.getForTenant(req.params.code, tenantId))
      } else {
        res.json(await eventService.getByCode(req.params.code))
      }
    } catch (err) { next(err) }
  },
}
