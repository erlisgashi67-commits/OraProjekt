// Simple session management using signed cookies (no JWT lib needed)
import { cookies } from 'next/headers'
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

export async function createSession(user: SessionUser): Promise<void> {
  const payload = Buffer.from(JSON.stringify(user)).toString('base64')
  const token = sign(payload)
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

export async function destroySession(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null
  const payload = verify(token)
  if (!payload) return null
  try {
    return JSON.parse(Buffer.from(payload, 'base64').toString()) as SessionUser
  } catch {
    return null
  }
}

export async function getCurrentUserWithEmployee(): Promise<{
  user: SessionUser
  employee: Awaited<ReturnType<typeof db.employee.findUnique>>
} | null> {
  const session = await getSession()
  if (!session) return null
  const employee = session.employeeId
    ? await db.employee.findUnique({ where: { id: session.employeeId } })
    : null
  return { user: session, employee }
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
