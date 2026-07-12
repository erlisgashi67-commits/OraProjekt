import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireManager } from '@/lib/auth'

// GET /api/employees
export async function GET() {
  try {
    const session = await requireAuth()
    const employees = await db.employee.findMany({
      where: { tenantId: session.tenantId },
      include: {
        user: { select: { role: true } },
        assignments: { include: { project: { select: { id: true, name: true, color: true } } } },
        _count: { select: { timesheets: true } },
      },
      orderBy: { firstName: 'asc' },
    })

    const aggregated = await db.timesheet.groupBy({
      by: ['employeeId'],
      where: { tenantId: session.tenantId },
      _sum: { hours: true },
    })
    const hoursMap = new Map(aggregated.map(a => [a.employeeId, a._sum.hours ?? 0]))

    const result = employees.map(e => ({
      id: e.id,
      firstName: e.firstName,
      lastName: e.lastName,
      fullName: `${e.firstName} ${e.lastName}`,
      email: e.email,
      phone: e.phone,
      position: e.position,
      hourlyRate: e.hourlyRate,
      role: e.user?.role ?? 'EMPLOYEE',
      createdAt: e.createdAt,
      assignmentsCount: e.assignments.length,
      timesheetsCount: e._count.timesheets,
      totalHours: hoursMap.get(e.id) ?? 0,
      projects: e.assignments.map(a => ({
        id: a.project.id,
        name: a.project.name,
        color: a.project.color,
        role: a.role,
      })),
    }))

    return NextResponse.json({ employees: result })
  } catch (e: any) {
    if (e instanceof Response) return e as any
    console.error('GET /api/employees error', e)
    return NextResponse.json({ error: 'Gabim i brendshëm' }, { status: 500 })
  }
}

// POST /api/employees — create employee + linked user account (manager only)
export async function POST(req: NextRequest) {
  try {
    const session = await requireManager()
    const body = await req.json()
    const { firstName, lastName, email, phone, position, hourlyRate, password, role } = body

    if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'Emri, mbiemri dhe email kërkohen' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const existing = await db.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return NextResponse.json({ error: 'Email ekziston tashmë' }, { status: 409 })
    }

    // Create user + employee in a transaction
    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        password: password || '123456',
        name: `${firstName} ${lastName}`,
        role: role === 'MANAGER' ? 'MANAGER' : 'EMPLOYEE',
        tenantId: session.tenantId,
      },
    })

    const employee = await db.employee.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        phone: phone?.trim() || null,
        position: position?.trim() || null,
        hourlyRate: hourlyRate ? Number(hourlyRate) : 0,
        tenantId: session.tenantId,
        userId: user.id,
      },
    })

    return NextResponse.json({ employee }, { status: 201 })
  } catch (e: any) {
    if (e instanceof Response) return e as any
    console.error('POST /api/employees error', e)
    return NextResponse.json({ error: 'Gabim i brendshëm' }, { status: 500 })
  }
}
