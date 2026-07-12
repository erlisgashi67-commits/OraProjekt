import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireManager } from '@/lib/auth'

const VALID_STATUSES = ['ACTIVE', 'ON_HOLD', 'COMPLETED']

// Helper: shape a Prisma project (with includes) into the frontend Project type
async function shapeProject(p: any) {
  const aggregated = await db.timesheet.aggregate({
    where: { projectId: p.id },
    _sum: { hours: true },
  })
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    status: p.status,
    budgetHours: p.budgetHours,
    startDate: p.startDate,
    endDate: p.endDate,
    color: p.color,
    createdAt: p.createdAt,
    assignmentsCount: p._count?.assignments ?? 0,
    timesheetsCount: p._count?.timesheets ?? 0,
    loggedHours: aggregated._sum.hours ?? 0,
    team: (p.assignments ?? []).map((a: any) => ({
      id: a.employee.id,
      name: `${a.employee.firstName} ${a.employee.lastName}`,
      position: a.employee.position,
      role: a.role,
    })),
  }
}

const FULL_INCLUDES = {
  _count: { select: { timesheets: true, assignments: true } },
  assignments: { include: { employee: true } },
} as const

// PUT /api/projects/[id] — update project (manager only)
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

    const existing = await db.project.findFirst({
      where: { id, tenantId: session.tenantId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Projekti nuk u gjet' }, { status: 404 })
    }

    const data: any = {}

    // Name
    if (body.name !== undefined) {
      const name = body.name?.trim()
      if (!name) {
        return NextResponse.json({ error: 'Emri nuk mund të jetë bosh' }, { status: 400 })
      }
      if (name.length > 200) {
        return NextResponse.json({ error: 'Emri është shumë i gjatë (max 200 karaktere)' }, { status: 400 })
      }
      data.name = name
    }

    // Description
    if (body.description !== undefined) {
      const desc = body.description?.trim() || null
      if (desc && desc.length > 5000) {
        return NextResponse.json({ error: 'Përshkrimi është shumë i gjatë (max 5000 karaktere)' }, { status: 400 })
      }
      data.description = desc
    }

    // Status
    if (body.status !== undefined) {
      if (typeof body.status !== 'string' || !VALID_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: 'Status i pavlefshëm' }, { status: 400 })
      }
      data.status = body.status
    }

    // Budget hours
    if (body.budgetHours !== undefined) {
      if (body.budgetHours === null || body.budgetHours === '') {
        data.budgetHours = null
      } else {
        const n = Number(body.budgetHours)
        if (isNaN(n) || n < 0) {
          return NextResponse.json({ error: 'Buxheti i orëve duhet të jetë numër pozitiv' }, { status: 400 })
        }
        data.budgetHours = n
      }
    }

    // Start date
    if (body.startDate !== undefined) {
      if (body.startDate === null || body.startDate === '') {
        data.startDate = null
      } else {
        const d = new Date(body.startDate + 'T00:00:00')
        if (isNaN(d.getTime())) {
          return NextResponse.json({ error: 'Data e fillimit është e pavlefshme' }, { status: 400 })
        }
        data.startDate = d
      }
    }

    // End date
    if (body.endDate !== undefined) {
      if (body.endDate === null || body.endDate === '') {
        data.endDate = null
      } else {
        const d = new Date(body.endDate + 'T00:00:00')
        if (isNaN(d.getTime())) {
          return NextResponse.json({ error: 'Data e mbarimit është e pavlefshme' }, { status: 400 })
        }
        data.endDate = d
      }
    }

    // Cross-field validation: end must be after start
    const newStart = data.startDate !== undefined ? data.startDate : existing.startDate
    const newEnd = data.endDate !== undefined ? data.endDate : existing.endDate
    if (newStart && newEnd && newEnd < newStart) {
      return NextResponse.json(
        { error: 'Data e mbarimit duhet të jetë pas datës së fillimit' },
        { status: 400 }
      )
    }

    // Color
    if (body.color !== undefined) {
      data.color = body.color
    }

    const updated = await db.project.update({
      where: { id },
      data,
      include: FULL_INCLUDES,
    })

    // Return the full shaped project (consistent with GET /api/projects)
    return NextResponse.json({ project: await shapeProject(updated) })
  } catch (e: any) {
    if (e instanceof Response) return e as any
    console.error('PUT /api/projects/[id] error', e)
    return NextResponse.json({ error: 'Gabim i brendshëm' }, { status: 500 })
  }
}

// DELETE /api/projects/[id] — delete project (manager only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireManager()
    const { id } = await params

    const existing = await db.project.findFirst({
      where: { id, tenantId: session.tenantId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Projekti nuk u gjet' }, { status: 404 })
    }

    // Use a transaction: delete timesheets + assignments first, then project
    await db.$transaction(async (tx) => {
      await tx.timesheet.deleteMany({ where: { projectId: id } })
      await tx.projectAssignment.deleteMany({ where: { projectId: id } })
      await tx.project.delete({ where: { id } })
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e instanceof Response) return e as any
    console.error('DELETE /api/projects/[id] error', e)
    return NextResponse.json({ error: 'Gabim i brendshëm' }, { status: 500 })
  }
}
