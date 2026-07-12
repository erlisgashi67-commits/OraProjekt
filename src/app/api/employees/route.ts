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

    // Validate hourlyRate is a valid number
    const parsedRate = hourlyRate !== undefined && hourlyRate !== '' ? Number(hourlyRate) : 0
    if (isNaN(parsedRate) || parsedRate < 0) {
      return NextResponse.json({ error: 'Tarifa/orë duhet të jetë një numër pozitiv' }, { status: 400 })
    }

    // Check for existing email — check both User and Employee tables
    const existingUser = await db.user.findUnique({ where: { email: normalizedEmail } })
    if (existingUser) {
      return NextResponse.json({ error: 'Email ekziston tashmë. Përdor email tjetër.' }, { status: 409 })
    }

    // Use a transaction so both User and Employee are created atomically.
    // If either fails, both are rolled back — no orphaned records.
    const employee = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          password: password?.trim() || '123456',
          name: `${firstName.trim()} ${lastName.trim()}`,
          role: role === 'MANAGER' ? 'MANAGER' : 'EMPLOYEE',
          tenantId: session.tenantId,
        },
      })

      return tx.employee.create({
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: normalizedEmail,
          phone: phone?.trim() || null,
          position: position?.trim() || null,
          hourlyRate: parsedRate,
          tenantId: session.tenantId,
          userId: user.id,
        },
      })
    })

    return NextResponse.json({ employee }, { status: 201 })
  } catch (e: any) {
    if (e instanceof Response) return e as any
    // Prisma unique constraint violation
    if (e?.code === 'P2002') {
      const target = e?.meta?.target?.join(', ') || 'fusha'
      return NextResponse.json(
        { error: `Vlera e dhënë për "${target}" ekziston tashmë.` },
        { status: 409 }
      )
    }
    console.error('POST /api/employees error', e)
    return NextResponse.json({ error: 'Gabim i brendshëm i serverit' }, { status: 500 })
  }
}
