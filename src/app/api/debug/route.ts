import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  const debug: any = {
    timestamp: new Date().toISOString(),
    env: {
      DATABASE_URL: process.env.DATABASE_URL ? `${process.env.DATABASE_URL.slice(0, 30)}...` : 'NOT SET',
      AUTH_SECRET: process.env.AUTH_SECRET ? 'SET' : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV,
    },
  }

  try {
    const prisma = new PrismaClient()
    const userCount = await prisma.user.count()
    debug.database = `✅ Connected! Users: ${userCount}`

    // Test login flow
    const user = await prisma.user.findUnique({
      where: { email: 'menaxher@oraprojekt.demo' },
      include: { tenant: true, employee: true },
    })
    debug.userFound = user ? `✅ ${user.email} (${user.role})` : '❌ Not found'

    if (user) {
      debug.passwordMatch = user.password === '123456' ? '✅ Match' : '❌ No match'
      debug.tenantName = user.tenant?.name
      debug.employeeId = user.employee?.id || 'none'
    }

    await prisma.$disconnect()
  } catch (e: any) {
    debug.database = `❌ ${e.message}`
  }

  // Test crypto
  try {
    const crypto = await import('crypto')
    const sig = crypto.createHmac('sha256', 'test').update('test').digest('hex')
    debug.crypto = `✅ Works (${sig.slice(0, 10)}...)`
  } catch (e: any) {
    debug.crypto = `❌ ${e.message}`
  }

  // Test cookies
  try {
    const { cookies } = await import('next/headers')
    const store = await cookies()
    debug.cookies = '✅ Accessible'
  } catch (e: any) {
    debug.cookies = `❌ ${e.message}`
  }

  return NextResponse.json(debug, { status: 200 })
}
