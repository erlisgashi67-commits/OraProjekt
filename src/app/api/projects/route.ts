import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireManager } from '@/lib/auth'

// GET /api/projects — list projects for current tenant
export async function GET() {
  try {
    const session = await requireAuth()
    const projects = await db.project.findMany({
      where: { tenantId: session.tenantId },
      include: {
        _count: { select: { timesheets: true, assignments: true } },
        assignments: { include: { employee: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // For each project, aggregate hours
    const aggregated = await db.timesheet.groupBy({
      by: ['projectId'],
      where: { tenantId: session.tenantId },
      _sum: { hours: true },
    })
    const hoursMap = new Map(aggregated.map(a => [a.projectId, a._sum.hours ?? 0]))

    const result = projects.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      status: p.status,
      budgetHours: p.budgetHours,
      startDate: p.startDate,
      endDate: p.endDate,
      color: p.color,
      createdAt: p.createdAt,
      assignmentsCount: p._count.assignments,
      timesheetsCount: p._count.timesheets,
      loggedHours: hoursMap.get(p.id) ?? 0,
      team: p.assignments.map(a => ({
        id: a.employee.id,
        name: `${a.employee.firstName} ${a.employee.lastName}`,
        position: a.employee.position,
        role: a.role,
      })),
    }))

    return NextResponse.json({ projects: result })
  } catch (e: any) {
    if (e instanceof Response) return e as any
    console.error('GET /api/projects error', e)
    return NextResponse.json({ error: 'Gabim i brendshëm' }, { status: 500 })
  }
}

// POST /api/projects — create new project (manager only)
export async function POST(req: NextRequest) {
  try {
    const session = await requireManager()
    const body = await req.json()
    const { name, description, status, budgetHours, startDate, endDate, color } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Emri i projektit kërkohet' }, { status: 400 })
    }

    // Validate budgetHours
    let parsedBudget: number | null = null
    if (budgetHours !== undefined && budgetHours !== '' && budgetHours !== null) {
      parsedBudget = Number(budgetHours)
      if (isNaN(parsedBudget) || parsedBudget < 0) {
        return NextResponse.json(
          { error: 'Buxheti i orëve duhet të jetë numër pozitiv' },
          { status: 400 }
        )
      }
    }

    // Validate status
    const validStatuses = ['ACTIVE', 'ON_HOLD', 'COMPLETED']
    const finalStatus = validStatuses.includes(status) ? status : 'ACTIVE'

    // Validate dates
    let parsedStart: Date | null = null
    let parsedEnd: Date | null = null
    if (startDate) {
      parsedStart = new Date(startDate)
      if (isNaN(parsedStart.getTime())) {
        return NextResponse.json({ error: 'Data e fillimit është e pavlefshme' }, { status: 400 })
      }
    }
    if (endDate) {
      parsedEnd = new Date(endDate)
      if (isNaN(parsedEnd.getTime())) {
        return NextResponse.json({ error: 'Data e mbarimit është e pavlefshme' }, { status: 400 })
      }
    }

    const project = await db.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        status: finalStatus,
        budgetHours: parsedBudget,
        startDate: parsedStart,
        endDate: parsedEnd,
        color: color || '#10b981',
        tenantId: session.tenantId,
      },
    })

    return NextResponse.json({ project }, { status: 201 })
  } catch (e: any) {
    if (e instanceof Response) return e as any
    if (e?.code === 'P2002') {
      const target = e?.meta?.target?.join(', ') || 'fusha'
      return NextResponse.json(
        { error: `Vlera e dhënë për "${target}" ekziston tashmë.` },
        { status: 409 }
      )
    }
    console.error('POST /api/projects error', e)
    return NextResponse.json({ error: 'Gabim i brendshëm i serverit' }, { status: 500 })
  }
}
