import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { templateService } from '../services/template.service'
import { renderTemplate, renderMjmlTemplate } from '../utils/template.engine'

const CHANNELS = ['EMAIL', 'SMS', 'PUSH', 'INAPP', 'WHATSAPP'] as const

const customizeSchema = z.object({
  eventCode: z.string().min(1),
  channel:   z.enum(CHANNELS),
  name:      z.string().optional(),
  subject:   z.string().optional(),
  body:      z.string().optional(),
  bodyMjml:  z.string().optional(),
  bodyHtml:  z.string().optional(),
})

const updateSystemSchema = z.object({
  name:     z.string().optional(),
  subject:  z.string().optional(),
  body:     z.string().optional(),
  bodyMjml: z.string().optional(),
  bodyHtml: z.string().optional(),
})

const resetSchema = z.object({
  eventCode: z.string().min(1),
  channel:   z.enum(CHANNELS),
})

const previewSchema = z.object({
  subject:   z.string().optional(),
  body:      z.string().default(''),
  bodyMjml:  z.string().optional(),
  bodyHtml:  z.string().optional(),
  variables: z.record(z.string(), z.string()).default({}),
})

export const templateController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).tenantId as string
      const channel  = req.query.channel as any
      res.json(await templateService.listAll(tenantId, channel))
    } catch (err) { next(err) }
  },

  async listByEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).tenantId as string
      res.json(await templateService.listByEvent(req.params.eventCode, tenantId))
    } catch (err) { next(err) }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).tenantId as string
      res.json(await templateService.getById(req.params.id, tenantId))
    } catch (err) { next(err) }
  },

  // Tenant admin: customize (copy-on-write)
  async customize(req: Request, res: Response, next: NextFunction) {
    try {
      const dto      = customizeSchema.parse(req.body)
      const tenantId = (req as any).tenantId as string
      const result   = await templateService.customize(dto.eventCode, dto.channel as any, tenantId, dto)
      res.status(200).json(result)
    } catch (err) { next(err) }
  },

  // Superadmin: update system template
  async updateSystem(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = updateSystemSchema.parse(req.body)
      res.json(await templateService.updateSystem(req.params.id, dto))
    } catch (err) { next(err) }
  },

  // Render a template with supplied variables — used by the live preview UI
  async preview(req: Request, res: Response, next: NextFunction) {
    try {
      const dto  = previewSchema.parse(req.body)
      const vars = dto.variables

      const subject  = dto.subject  ? renderTemplate(dto.subject, vars) : undefined
      const body     = renderTemplate(dto.body, vars)
      // bodyMjml takes priority: compile MJML → HTML, then render variables
      const bodyHtml = dto.bodyMjml
        ? renderMjmlTemplate(dto.bodyMjml, vars)
        : dto.bodyHtml ? renderTemplate(dto.bodyHtml, vars) : undefined

      res.json({ subject, body, bodyHtml })
    } catch (err) { next(err) }
  },

  // Tenant admin: reset customization back to system default
  async resetToDefault(req: Request, res: Response, next: NextFunction) {
    try {
      const dto      = resetSchema.parse(req.body)
      const tenantId = (req as any).tenantId as string
      await templateService.resetToDefault(dto.eventCode, dto.channel as any, tenantId)
      res.status(204).send()
    } catch (err) { next(err) }
  },
}
