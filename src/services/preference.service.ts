import { prisma } from '../config/database'
import { redis, REDIS_CHANNELS } from '../config/redis'
import type { Channel } from '@prisma/client'
import type { UpdatePreferenceDto } from '../types'

const ALL_CHANNELS: Channel[] = ['EMAIL', 'SMS', 'PUSH', 'INAPP']

export class PreferenceService {
  async getAll(tenantId: string, userId: string) {
    const existing = await prisma.userPreference.findMany({ where: { tenantId, userId } })
    const map = new Map(existing.map((p) => [p.channel, p]))

    // Return preferences for ALL channels, creating defaults for missing ones
    return ALL_CHANNELS.map((channel) =>
      map.get(channel) ?? { tenantId, userId, channel, enabled: true, dndStart: null, dndEnd: null, dndTimezone: 'UTC' }
    )
  }

  async upsert(tenantId: string, userId: string, channel: Channel, dto: UpdatePreferenceDto) {
    return prisma.userPreference.upsert({
      where:  { tenantId_userId_channel: { tenantId, userId, channel } },
      create: { tenantId, userId, channel, ...dto },
      update: dto,
    })
  }

  async isChannelEnabled(tenantId: string, userId: string, channel: Channel): Promise<boolean> {
    const pref = await prisma.userPreference.findUnique({
      where: { tenantId_userId_channel: { tenantId, userId, channel } },
    })
    if (!pref) return true // default: enabled

    if (!pref.enabled) return false

    // DND check
    if (pref.dndStart && pref.dndEnd) {
      const now    = new Date()
      const tz     = pref.dndTimezone ?? 'UTC'
      const locale = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz })
      const [h, m] = locale.split(':').map(Number)
      const current = h * 60 + m
      const [sh, sm] = pref.dndStart.split(':').map(Number)
      const [eh, em] = pref.dndEnd.split(':').map(Number)
      const start = sh * 60 + sm
      const end   = eh * 60 + em
      // Handle overnight DND (e.g. 22:00 – 08:00)
      const inDnd = start <= end ? current >= start && current < end : current >= start || current < end
      if (inDnd) return false
    }

    return true
  }

  async getUnreadCount(tenantId: string, userId: string): Promise<number> {
    const cached = await redis.get(REDIS_CHANNELS.UNREAD_COUNT(tenantId, userId))
    if (cached !== null) return parseInt(cached, 10)

    const count = await prisma.notification.count({
      where: { tenantId, userId, channel: 'INAPP', status: { not: 'READ' } },
    })
    await redis.setex(REDIS_CHANNELS.UNREAD_COUNT(tenantId, userId), 3600, String(count))
    return count
  }
}

export const preferenceService = new PreferenceService()
