import { prisma } from '../config/database'
import type { EventCategory } from '@prisma/client'

export class EventService {
  async listAll(category?: EventCategory) {
    return prisma.notificationEvent.findMany({
      where: {
        isActive: true,
        ...(category ? { category } : {}),
      },
      include: {
        templates: {
          where: { isActive: true, tenantId: null }, // only system defaults in listing
          orderBy: { channel: 'asc' },
        },
      },
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
    })
  }

  async getByCode(code: string) {
    const event = await prisma.notificationEvent.findUnique({
      where: { code },
      include: { templates: { where: { isActive: true }, orderBy: { channel: 'asc' } } },
    })
    if (!event) throw new Error('Event not found: ' + code)
    return event
  }

  // Get event with resolved templates for a specific tenant
  async getForTenant(code: string, tenantId: string) {
    const event = await prisma.notificationEvent.findUnique({
      where: { code },
      include: {
        templates: {
          where: { isActive: true, OR: [{ tenantId: null }, { tenantId }] },
          orderBy: [{ channel: 'asc' }, { tenantId: 'asc' }],
        },
      },
    })
    if (!event) throw new Error('Event not found: ' + code)

    // For each channel, pick the tenant override if it exists, else the system default
    const channels = [...new Set(event.templates.map(t => t.channel))]
    const resolvedTemplates = channels.map(ch => {
      const tenantTpl = event.templates.find(t => t.channel === ch && t.tenantId === tenantId)
      const systemTpl = event.templates.find(t => t.channel === ch && t.tenantId === null)
      return {
        ...(tenantTpl ?? systemTpl),
        isCustomized: !!tenantTpl,
      }
    }).filter(Boolean)

    return { ...event, templates: resolvedTemplates }
  }
}

export const eventService = new EventService()
