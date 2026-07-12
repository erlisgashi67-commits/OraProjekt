import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireManager } from '@/lib/auth'

const FULL_INCLUDES = {
  user: { select: { role: true } },
  assignments: { include: { project: { select: { id: true, name: true, color: true } } } },
  _count: { select: { timesheets: true } },
} as const

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

// PUT /api/employees/[id] — update employee (manager only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireManager()
    const { id } = await params

    let body: any
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'JSON i pavlefshëm' }, { status: 400 })
    }

    const existing = await db.employee.findFirst({
      where: { id, tenantId: session.tenantId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Punetori nuk u gjet' }, { status: 404 })
    }

    // Validate hourlyRate if provided
    let parsedRate: number | undefined
    if (body.hourlyRate !== undefined) {
      parsedRate = body.hourlyRate === '' ? 0 : Number(body.hourlyRate)
      if (isNaN(parsedRate) || parsedRate < 0) {
        return NextResponse.json(
          { error: 'Tarifa/orë duhet të jetë një numër pozitiv' },
          { status: 400 }
        )
      }
    }

    // Validate role
    if (body.role !== undefined && !['MANAGER', 'EMPLOYEE'].includes(body.role)) {
      return NextResponse.json({ error: 'Rol i pavlefshëm' }, { status: 400 })
    }

    // Validate firstName/lastName if provided
    if (body.firstName !== undefined && !body.firstName.trim()) {
      return NextResponse.json({ error: 'Emri nuk mund të jetë bosh' }, { status: 400 })
    }
    if (body.lastName !== undefined && !body.lastName.trim()) {
      return NextResponse.json({ error: 'Mbiemri nuk mund të jetë bosh' }, { status: 400 })
    }

    // If email is changing, validate format and check for duplicates
    const newEmail = body.email?.toLowerCase().trim()
    if (newEmail && newEmail !== existing.email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        return NextResponse.json({ error: 'Email i pavlefshëm' }, { status: 400 })
      }
      const emailTaken = await db.user.findUnique({ where: { email: newEmail } })
      if (emailTaken) {
        return NextResponse.json(
          { error: 'Email ekziston tashmë. Përdor email tjetër.' },
          { status: 409 }
        )
      }
    }

    const updated = await db.employee.update({
      where: { id },
      data: {
        firstName: body.firstName?.trim() ?? existing.firstName,
        lastName: body.lastName?.trim() ?? existing.lastName,
        email: newEmail ?? existing.email,
        phone: body.phone !== undefined ? (body.phone?.trim() || null) : existing.phone,
        position: body.position !== undefined ? (body.position?.trim() || null) : existing.position,
        hourlyRate: parsedRate !== undefined ? parsedRate : existing.hourlyRate,
      },
      include: FULL_INCLUDES,
    })

    // Update linked user: email + role + name (in a transaction-like manner)
    if (existing.userId) {
      try {
        await db.user.update({
          where: { id: existing.userId },
          data: {
            ...(newEmail ? { email: newEmail } : {}),
            ...(body.role ? { role: body.role === 'MANAGER' ? 'MANAGER' : 'EMPLOYEE' } : {}),
            name: `${updated.firstName} ${updated.lastName}`,
          },
        })
      } catch (err) {
        // Non-fatal — log but don't fail the employee update
        console.warn('Failed to update linked user for employee', id, err)
      }
    }

    return NextResponse.json({ employee: await shapeEmployee(updated) })
  } catch (e: any) {
    if (e instanceof Response) return e as any
    if (e?.code === 'P2002') {
      const target = e?.meta?.target?.join(', ') || 'fusha'
      return NextResponse.json(
        { error: `Vlera e dhënë për "${target}" ekziston tashmë.` },
        { status: 409 }
      )
    }
    console.error('PUT /api/employees/[id] error', e)
    return NextResponse.json({ error: 'Gabim i brendshëm' }, { status: 500 })
  }
}

// DELETE /api/employees/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireManager()
    const { id } = await params

    const existing = await db.employee.findFirst({
      where: { id, tenantId: session.tenantId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Punetori nuk u gjet' }, { status: 404 })
    }

    // Use a transaction: delete employee's timesheets/assignments, then employee, then user
    await db.$transaction(async (tx) => {
      await tx.timesheet.deleteMany({ where: { employeeId: id } })
      await tx.projectAssignment.deleteMany({ where: { employeeId: id } })
      await tx.employee.delete({ where: { id } })
      if (existing.userId) {
        try {
          await tx.user.delete({ where: { id: existing.userId } })
        } catch {
          // Non-fatal — user may already be gone
        }
      }
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e instanceof Response) return e as any
    console.error('DELETE /api/employees/[id] error', e)
    return NextResponse.json({ error: 'Gabim i brendshëm' }, { status: 500 })
  }
}
