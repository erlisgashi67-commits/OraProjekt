import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireManager } from '@/lib/auth'

// Helper: shape a Prisma employee (with includes) into the frontend Employee type
async function shapeEmployee(e: any) {
  const aggregated = await db.timesheet.aggregate({
    where: { employeeId: e.id },
    _sum: { hours: true },
  })
  return {
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
    assignmentsCount: (e.assignments ?? []).length,
    timesheetsCount: e._count?.timesheets ?? 0,
    totalHours: aggregated._sum.hours ?? 0,
    projects: (e.assignments ?? []).map((a: any) => ({
      id: a.project.id,
      name: a.project.name,
      color: a.project.color,
      role: a.role,
    })),
  }
}

const FULL_INCLUDES = {
  user: { select: { role: true } },
  assignments: { include: { project: { select: { id: true, name: true, color: true } } } },
  _count: { select: { timesheets: true } },
} as const

// GET /api/employees
export async function GET() {
  try {
    const session = await requireAuth()
    const employees = await db.employee.findMany({
      where: { tenantId: session.tenantId },
      include: FULL_INCLUDES,
      orderBy: { firstName: 'asc' },
    })

    const result = []
    for (const e of employees) {
      result.push(await shapeEmployee(e))
    }

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

    let body: any
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'JSON i pavlefshëm' }, { status: 400 })
    }

    const { firstName, lastName, email, phone, position, hourlyRate, password, role } = body

    if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'Emri, mbiemri dhe email kërkohen' }, { status: 400 })
    }

    // Validate email format
    const normalizedEmail = email.toLowerCase().trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Email i pavlefshëm' }, { status: 400 })
    }

    // Validate lengths
    if (firstName.trim().length > 100 || lastName.trim().length > 100) {
      return NextResponse.json({ error: 'Emri/mbiemri shumë i gjatë (max 100)' }, { status: 400 })
    }

    // Validate hourlyRate
    const parsedRate = hourlyRate !== undefined && hourlyRate !== '' ? Number(hourlyRate) : 0
    if (isNaN(parsedRate) || parsedRate < 0) {
      return NextResponse.json({ error: 'Tarifa/orë duhet të jetë një numër pozitiv' }, { status: 400 })
    }

    // Validate password length
    const finalPassword = password?.trim() || '123456'
    if (finalPassword.length < 4) {
      return NextResponse.json({ error: 'Fjalëkalimi duhet të ketë të paktën 4 karaktere' }, { status: 400 })
    }

    // Check for existing email
    const existingUser = await db.user.findUnique({ where: { email: normalizedEmail } })
    if (existingUser) {
      return NextResponse.json({ error: 'Email ekziston tashmë. Përdor email tjetër.' }, { status: 409 })
    }

    // Use a transaction so both User and Employee are created atomically
    const employee = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          password: finalPassword,
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
        include: FULL_INCLUDES,
      })
    })

    return NextResponse.json({ employee: await shapeEmployee(employee) }, { status: 201 })
  } catch (e: any) {
    if (e instanceof Response) return e as any
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
