// Session management using signed tokens (primary) + NextAuth (OAuth).
// Token is sent via Authorization header (primary) and cookie (fallback).
// NextAuth handles Google/Microsoft OAuth sign-ins and also sets a JWT cookie.
//
// NOTE: auth.config.ts (NextAuth) is loaded lazily — only when the NextAuth
// route handler is hit. This avoids loading heavy OAuth providers on every request.
import { cookies, headers } from 'next/headers'
import { db } from './db'
import crypto from 'crypto'

const SESSION_COOKIE = 'op_session'
const NEXTAUTH_COOKIE = 'next-auth.session-token'
const NEXTAUTH_COOKIE_SECURE = '__Secure-next-auth.session-token'
const SECRET = process.env.AUTH_SECRET || process.env.SESSION_SECRET || 'oraprojekt-dev-secret-2026'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

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

// Timing-safe verification
function verify(token: string): string | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payload, sig] = parts
  const expectedSig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex')

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
  image?: string | null
}

// Create session — returns the token so the API route can send it in the response body.
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
    maxAge: 60 * 60 * 24 * 7,
  })
  return token
}

export async function destroySession(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

// Get session from multiple sources (in priority order):
// 1. Authorization header (Bearer token) — primary for API calls
// 2. op_session cookie — our custom JWT
// 3. NextAuth session — for OAuth sign-ins (Google/Microsoft)
export async function getSession(): Promise<SessionUser | null> {
  let token: string | undefined

  // 1. Try Authorization header
  const hdrs = await headers()
  const authHeader = hdrs.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7)
  }

  // 2. Fall back to our custom cookie
  if (!token) {
    const store = await cookies()
    token = store.get(SESSION_COOKIE)?.value
  }

  // 3. Try our custom token first
  if (token) {
    const payloadStr = verify(token)
    if (payloadStr) {
      try {
        const payload = JSON.parse(Buffer.from(payloadStr, 'base64').toString()) as TokenPayload

        // Check session expiry
        if (!payload.iat || Date.now() - payload.iat > SESSION_TTL_MS) {
          const store = await cookies()
          store.delete(SESSION_COOKIE)
          return null
        }

        // Validate user still exists in DB
        const dbUser = await db.user.findUnique({
          where: { id: payload.id },
          select: {
            id: true, role: true, tenantId: true, email: true, name: true, image: true,
            tenant: { select: { name: true } },
            employee: { select: { id: true } },
          },
        })
        if (!dbUser) {
          const store = await cookies()
          store.delete(SESSION_COOKIE)
          return null
        }

        return {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role as 'MANAGER' | 'EMPLOYEE',
          tenantId: dbUser.tenantId,
          tenantName: dbUser.tenant.name,
          employeeId: dbUser.employee?.id ?? null,
          image: dbUser.image,
        }
      } catch {
        return null
      }
    }
  }

  // 4. NextAuth session check is intentionally omitted here to avoid loading
  // the heavy NextAuth module on every request. NextAuth sessions are checked
  // only when the user visits /api/auth/* endpoints. For API routes that need
  // to accept NextAuth sessions, they can call auth() from auth.config.ts directly.
  // For now, our custom token-based auth handles all session needs.

  return null
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

// Resolve tenant from email domain — used by public sign-up & invite flows
export async function resolveTenantFromEmail(email: string): Promise<{ tenantId: string; tenantName: string } | null> {
  const domain = email.toLowerCase().split('@')[1]
  if (!domain) return null

  const mapping = await db.tenantDomain.findFirst({
    where: { domain, status: 'ACTIVE' },
    include: { tenant: { select: { id: true, name: true } } },
  })

  if (mapping) {
    return { tenantId: mapping.tenant.id, tenantName: mapping.tenant.name }
  }

  return null
}
