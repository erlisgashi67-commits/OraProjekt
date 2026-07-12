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
    await prisma.$disconnect()
  } catch (e: any) {
    debug.database = `❌ ${e.message}`
  }

  return NextResponse.json(debug, { status: 200 })
}
