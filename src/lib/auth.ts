// Session management using signed tokens.
// Token is sent via Authorization header (primary) and cookie (fallback).
// This dual approach ensures auth works in both top-level and iframe/preview contexts.
import { cookies, headers } from 'next/headers'
import { db } from './db'
import crypto from 'crypto'

const SESSION_COOKIE = 'op_session'
const SECRET = process.env.SESSION_SECRET || 'oraprojekt-dev-secret-2026'

// Token format: base64(JSON).signature
function sign(payload: string): string {
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
  return `${payload}.${sig}`
}

function verify(token: string): string | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payload, sig] = parts
  const expectedSig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
  if (sig !== expectedSig) return null
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
  const payload = Buffer.from(JSON.stringify(user)).toString('base64')
  const token = sign(payload)
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

// Get session from Authorization header (primary) or cookie (fallback)
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
  const payload = verify(token)
  if (!payload) return null

  try {
    return JSON.parse(Buffer.from(payload, 'base64').toString()) as SessionUser
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
