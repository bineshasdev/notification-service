import { Request, Response, NextFunction } from 'express'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { env } from '../config/env'
import { logger } from '../utils/logger'

const JWKS = createRemoteJWKSet(new URL(env.JWKS_URI))

function extractOrgId(payload: Record<string, unknown>): string | undefined {
  const org = payload['organization']
  if (typeof org !== 'object' || org === null) return undefined
  const first = Object.values(org as Record<string, unknown>)[0]
  if (typeof first !== 'object' || first === null) return undefined
  return (first as Record<string, string>)['id']
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Missing or invalid Authorization header' })
    return
  }

  const token = authHeader.slice(7)
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: env.JWT_ISSUER,
    })

    const tenantId = extractOrgId(payload as Record<string, unknown>)
    if (!tenantId) {
      res.status(403).json({ message: 'No tenant context in token' })
      return
    }

    ;(req as any).userId   = payload.sub as string
    ;(req as any).tenantId = tenantId
    ;(req as any).email    = payload['email'] as string | undefined
    ;(req as any).roles    = ((payload as any)['realm_access']?.roles as string[]) ?? []

    next()
  } catch (err) {
    logger.debug('JWT validation failed', { err })
    res.status(401).json({ message: 'Invalid or expired token' })
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRoles: string[] = (req as any).roles ?? []
    if (!roles.some((r) => userRoles.includes(r))) {
      res.status(403).json({ message: 'Insufficient permissions' })
      return
    }
    next()
  }
}
