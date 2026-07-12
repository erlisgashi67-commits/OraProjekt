// Session management using signed tokens.
// Token is sent via Authorization header (primary) and cookie (fallback).
import { cookies, headers } from 'next/headers'
import { db } from './db'
import crypto from 'crypto'

const SESSION_COOKIE = 'op_session'
const SECRET = process.env.SESSION_SECRET || 'oraprojekt-dev-secret-2026'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

// Token payload now includes `iat` (issued-at) for expiry enforcement
type TokenPayload = {
  id: string
  email: string
  name: string
  role: 'MANAGER' | 'EMPLOYEE'
  tenantId: string
  tenantName: string
  employeeId: string | null
  iat: number
}

// Token format: base64(JSON).signature
function sign(payload: string): string {
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
  return `${payload}.${sig}`
}

// Timing-safe verification to prevent timing attacks
function verify(token: string): string | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payload, sig] = parts
  const expectedSig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex')

  // Constant-time comparison
  try {
    const sigBuf = Buffer.from(sig)
    const expectedBuf = Buffer.from(expectedSig)
    if (sigBuf.length !== expectedBuf.length) return null
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null
  } catch {
    return null
  }

  return payload
}

export type SessionUser = {
  id: string
  email: string
  name: string
  role: 'MANAGER' | 'EMPLOYEE'
  tenantId: string
  tenantName: string
  employeeId: string | null
}

// Create session — returns the token so the API route can send it in the response body.
// Also sets the cookie as a fallback for same-origin navigation.
export async function createSession(user: SessionUser): Promise<string> {
  const payload: TokenPayload = {
    ...user,
    iat: Date.now(),
  }
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64')
  const token = sign(payloadStr)
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
  return token
}

export async function destroySession(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

// Get session from Authorization header (primary) or cookie (fallback).
// Validates: signature, expiry, and that the user still exists in the DB.
export async function getSession(): Promise<SessionUser | null> {
  let token: string | undefined

  // Try Authorization header first (works in all contexts including iframes)
  const hdrs = await headers()
  const authHeader = hdrs.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7)
  }

  // Fall back to cookie
  if (!token) {
    const store = await cookies()
    token = store.get(SESSION_COOKIE)?.value
  }

  if (!token) return null
  const payloadStr = verify(token)
  if (!payloadStr) return null

  try {
    const payload = JSON.parse(Buffer.from(payloadStr, 'base64').toString()) as TokenPayload

    // Check session expiry
    if (!payload.iat || Date.now() - payload.iat > SESSION_TTL_MS) {
      // Session expired — destroy it
      const store = await cookies()
      store.delete(SESSION_COOKIE)
      return null
    }

    // Validate the user still exists in the DB (catches stale sessions after user deletion)
    const dbUser = await db.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        role: true,
        tenantId: true,
        email: true,
        name: true,
        tenant: { select: { name: true } },
        employee: { select: { id: true } },
      },
    })
    if (!dbUser) {
      const store = await cookies()
      store.delete(SESSION_COOKIE)
      return null
    }

    // Return fresh data from DB in case role/tenant changed
    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role as 'MANAGER' | 'EMPLOYEE',
      tenantId: dbUser.tenantId,
      tenantName: dbUser.tenant.name,
      employeeId: dbUser.employee?.id ?? null,
    }
  } catch {
    return null
  }
}

// Helper for API routes — returns 401 if not authenticated
export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession()
  if (!session) {
    throw new Response(JSON.stringify({ error: 'I paidentifikuar' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return session
}

export async function requireManager(): Promise<SessionUser> {
  const session = await requireAuth()
  if (session.role !== 'MANAGER') {
    throw new Response(JSON.stringify({ error: 'Nuk keni leje menaxheri' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return session
}
