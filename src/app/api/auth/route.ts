import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSession, destroySession, getSession } from '@/lib/auth'
import type { SessionUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email dhe fjalëkalimi kërkohen' }, { status: 400 })
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { tenant: true, employee: true },
    })

    if (!user || user.password !== password) {
      return NextResponse.json({ error: 'Kredenciale të gabuara' }, { status: 401 })
    }

    const sessionUser: SessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'MANAGER' | 'EMPLOYEE',
      tenantId: user.tenantId,
      tenantName: user.tenant.name,
      employeeId: user.employee?.id ?? null,
    }

    // createSession returns the token — we send it to the client
    // so it can be stored in localStorage and sent via Authorization header
    const token = await createSession(sessionUser)

    return NextResponse.json({
      ...sessionUser,
      token,
    })
  } catch (e) {
    console.error('Login error', e)
    return NextResponse.json({ error: 'Gabim i brendshëm i serverit' }, { status: 500 })
  }
}

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 })
  }
  return NextResponse.json({ user: session })
}

export async function DELETE() {
  await destroySession()
  return NextResponse.json({ ok: true })
}
