import { prisma } from '../config/database'
import type { Channel } from '@prisma/client'
import type { UpdateTemplateDto } from '../types'
import { AppError } from '../middleware/error'

export class TemplateService {
  // List all templates for an event (system + tenant overrides)
  async listByEvent(eventCode: string, tenantId: string) {
    // Get system templates and tenant-specific overrides for this event
    return prisma.notificationTemplate.findMany({
      where: {
        eventCode,
        OR: [{ tenantId: null }, { tenantId }],
        isActive: true,
      },
      orderBy: [{ channel: 'asc' }, { tenantId: 'asc' }],
    })
  }

  // List all templates visible to a tenant (grouped by event)
  async listAll(tenantId: string, channel?: Channel) {
    return prisma.notificationTemplate.findMany({
      where: {
        OR: [{ tenantId: null }, { tenantId }],
        ...(channel ? { channel } : {}),
        isActive: true,
      },
      include: { event: true },
      orderBy: [{ event: { category: 'asc' } }, { eventCode: 'asc' }, { channel: 'asc' }],
    })
  }

  async getById(id: string, tenantId: string) {
    const template = await prisma.notificationTemplate.findFirst({
      where: { id, OR: [{ tenantId }, { tenantId: null }] },
      include: { event: true },
    })
    if (!template) throw new AppError('Template not found', 404)
    return template
  }

  // Resolve the effective template for an event+channel+tenant
  // Tenant override first, then system default
  async resolve(eventCode: string, channel: Channel, tenantId: string) {
    return (
      await prisma.notificationTemplate.findFirst({
        where: { eventCode, channel, tenantId, isActive: true },
      })
    ) ?? (
      await prisma.notificationTemplate.findFirst({
        where: { eventCode, channel, tenantId: null, isActive: true },
      })
    )
  }

  // Copy-on-write: tenant admin customizes a system template
  // Creates a tenant-specific copy if one doesn't exist, or updates existing
  async customize(eventCode: string, channel: Channel, tenantId: string, dto: UpdateTemplateDto) {
    // Verify the event exists
    const event = await prisma.notificationEvent.findUnique({ where: { code: eventCode } })
    if (!event) throw new AppError('Event not found: ' + eventCode, 404)

    // Check if tenant already has an override
    const existing = await prisma.notificationTemplate.findUnique({
      where: { eventCode_channel_tenantId: { eventCode, channel, tenantId } },
    })

    if (existing) {
      // Tenant already has a copy — update it
      if (existing.isSystem) throw new AppError('Cannot edit system template directly', 403)
      return prisma.notificationTemplate.update({
        where: { id: existing.id },
        data: { ...dto, version: { increment: 1 } },
      })
    }

    // No tenant copy — create one based on system default
    const systemTemplate = await prisma.notificationTemplate.findFirst({
      where: { eventCode, channel, tenantId: null, isActive: true },
    })

    const base = systemTemplate ?? {}
    return prisma.notificationTemplate.create({
      data: {
        eventCode,
        channel,
        tenantId,
        name:     dto.name     ?? (systemTemplate?.name ?? event.name + ' – ' + channel),
        subject:  dto.subject  ?? systemTemplate?.subject ?? null,
        body:     dto.body     ?? systemTemplate?.body ?? '',
        bodyHtml: dto.bodyHtml ?? systemTemplate?.bodyHtml ?? null,
        isSystem: false,
        isActive: true,
        version:  1,
      },
    })
  }

  // Superadmin: update system templates
  async updateSystem(id: string, dto: UpdateTemplateDto) {
    const template = await prisma.notificationTemplate.findUnique({ where: { id } })
    if (!template) throw new AppError('Template not found', 404)
    if (!template.isSystem) throw new AppError('This is not a system template', 400)
    return prisma.notificationTemplate.update({
      where: { id },
      data: { ...dto, version: { increment: 1 } },
    })
  }

  // Tenant admin: reset to system default (delete tenant copy)
  async resetToDefault(eventCode: string, channel: Channel, tenantId: string) {
    const existing = await prisma.notificationTemplate.findUnique({
      where: { eventCode_channel_tenantId: { eventCode, channel, tenantId } },
    })
    if (!existing) throw new AppError('No tenant customization found', 404)
    if (existing.isSystem) throw new AppError('Cannot delete system template', 403)
    await prisma.notificationTemplate.delete({ where: { id: existing.id } })
  }

  // Legacy method kept for notification.service.ts compatibility
  async getByCode(code: string, channel: Channel, tenantId: string) {
    return this.resolve(code, channel, tenantId)
  }
}

export const templateService = new TemplateService()
