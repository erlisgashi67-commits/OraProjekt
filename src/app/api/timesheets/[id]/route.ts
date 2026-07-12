import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

const VALID_STATUSES = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'] as const
type TimesheetStatus = typeof VALID_STATUSES[number]

const FULL_INCLUDES = {
  employee: { select: { id: true, firstName: true, lastName: true, position: true, hourlyRate: true } },
  project: { select: { id: true, name: true, color: true } },
} as const

function shapeTimesheet(t: any) {
  return {
    id: t.id,
    date: t.date,
    hours: t.hours,
    description: t.description,
    status: t.status,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    employee: {
      id: t.employee.id,
      name: `${t.employee.firstName} ${t.employee.lastName}`,
      position: t.employee.position,
      hourlyRate: t.employee.hourlyRate,
    },
    project: {
      id: t.project.id,
      name: t.project.name,
      color: t.project.color,
    },
    cost: t.hours * t.employee.hourlyRate,
  }
}

// PUT /api/timesheets/[id] — update entry
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params

    let body: any
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'JSON i pavlefshëm' }, { status: 400 })
    }

    const existing = await db.timesheet.findFirst({
      where: { id, tenantId: session.tenantId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Regjistrimi nuk u gjet' }, { status: 404 })
    }

    // Employees can only edit their own and only DRAFT/SUBMITTED/REJECTED entries
    if (session.role === 'EMPLOYEE') {
      if (existing.employeeId !== session.employeeId) {
        return NextResponse.json({ error: 'Nuk keni leje' }, { status: 403 })
      }
      if (existing.status === 'APPROVED') {
        return NextResponse.json({ error: 'Nuk mund të editohet — është aprovuar' }, { status: 400 })
      }
    }

    const data: any = {}

    // Validate hours
    if (body.hours !== undefined) {
      const h = Number(body.hours)
      if (isNaN(h) || h < 0.25 || h > 24) {
        return NextResponse.json({ error: 'Orët duhet të jenë mes 0.25 dhe 24' }, { status: 400 })
      }
      data.hours = h
    }

    // Validate date
    if (body.date !== undefined) {
      const d = new Date(body.date + 'T00:00:00')
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Data është e pavlefshme' }, { status: 400 })
      }
      data.date = d
    }

    // Validate projectId + tenant ownership
    if (body.projectId !== undefined) {
      const p = await db.project.findFirst({
        where: { id: body.projectId, tenantId: session.tenantId },
      })
      if (!p) {
        return NextResponse.json({ error: 'Projekti nuk u gjet' }, { status: 404 })
      }
      data.projectId = body.projectId
    }

    if (body.description !== undefined) {
      data.description = body.description?.trim() || null
    }

    // Validate status — employees can only set DRAFT or SUBMITTED
    if (body.status !== undefined) {
      const validForEmployee: TimesheetStatus[] = ['DRAFT', 'SUBMITTED']
      const validForManager: TimesheetStatus[] = VALID_STATUSES
      const allowed = session.role === 'MANAGER' ? validForManager : validForEmployee
      if (!allowed.includes(body.status)) {
        return NextResponse.json(
          { error: 'Nuk keni leje për të vendosur këtë status' },
          { status: 403 }
        )
      }
      data.status = body.status
    }

    const updated = await db.timesheet.update({
      where: { id },
      data,
      include: FULL_INCLUDES,
    })

    return NextResponse.json({ timesheet: shapeTimesheet(updated) })
  } catch (e: any) {
    if (e instanceof Response) return e as any
    console.error('PUT /api/timesheets/[id] error', e)
    return NextResponse.json({ error: 'Gabim i brendshëm' }, { status: 500 })
  }
}

// DELETE /api/timesheets/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params

    const existing = await db.timesheet.findFirst({
      where: { id, tenantId: session.tenantId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Regjistrimi nuk u gjet' }, { status: 404 })
    }

    if (session.role === 'EMPLOYEE') {
      if (existing.employeeId !== session.employeeId) {
        return NextResponse.json({ error: 'Nuk keni leje' }, { status: 403 })
      }
      if (existing.status === 'APPROVED') {
        return NextResponse.json({ error: 'Nuk mund të fshihet — është aprovuar' }, { status: 400 })
      }
    }

    await db.timesheet.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e instanceof Response) return e as any
    console.error('DELETE /api/timesheets/[id] error', e)
    return NextResponse.json({ error: 'Gabim i brendshëm' }, { status: 500 })
  }
}
