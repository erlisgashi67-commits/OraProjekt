import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// Helper: shape a Prisma timesheet (with includes) into the frontend Timesheet type
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

const FULL_INCLUDES = {
  employee: { select: { id: true, firstName: true, lastName: true, position: true, hourlyRate: true } },
  project: { select: { id: true, name: true, color: true } },
} as const

const VALID_STATUSES = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'] as const
type TimesheetStatus = typeof VALID_STATUSES[number]

// GET /api/timesheets?projectId=...&employeeId=...&from=...&to=...&status=...
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth()
    const url = new URL(req.url)
    const projectId = url.searchParams.get('projectId')
    const employeeId = url.searchParams.get('employeeId')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const status = url.searchParams.get('status')
    const limit = parseInt(url.searchParams.get('limit') || '200')

    const where: any = { tenantId: session.tenantId }

    // Employees only see their own timesheets
    if (session.role === 'EMPLOYEE' && session.employeeId) {
      where.employeeId = session.employeeId
    } else if (employeeId) {
      where.employeeId = employeeId
    }

    if (projectId) where.projectId = projectId
    if (status && VALID_STATUSES.includes(status as TimesheetStatus)) where.status = status
    if (from || to) {
      where.date = {}
      if (from) where.date.gte = new Date(from + 'T00:00:00')
      // Include the entire `to` day (until end of day)
      if (to) where.date.lte = new Date(to + 'T23:59:59')
    }

    const timesheets = await db.timesheet.findMany({
      where,
      include: FULL_INCLUDES,
      orderBy: { date: 'desc' },
      take: Math.min(Math.max(limit, 1), 1000),
    })

    return NextResponse.json({ timesheets: timesheets.map(shapeTimesheet) })
  } catch (e: any) {
    if (e instanceof Response) return e as any
    console.error('GET /api/timesheets error', e)
    return NextResponse.json({ error: 'Gabim i brendshëm' }, { status: 500 })
  }
}

// POST /api/timesheets — create entry
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth()

    let body: any
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'JSON i pavlefshëm' }, { status: 400 })
    }

    const { projectId, employeeId, date, hours, description, status } = body

    if (!projectId || !date || hours === undefined) {
      return NextResponse.json({ error: 'Projekti, data dhe orët kërkohen' }, { status: 400 })
    }

    const hrs = Number(hours)
    if (isNaN(hrs) || hrs < 0.25 || hrs > 24) {
      return NextResponse.json({ error: 'Orët duhet të jenë mes 0.25 dhe 24' }, { status: 400 })
    }

    // Validate date
    const parsedDate = new Date(date + 'T00:00:00')
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: 'Data është e pavlefshme' }, { status: 400 })
    }

    // Employees can only log for themselves
    const targetEmployeeId = session.role === 'EMPLOYEE' ? session.employeeId : employeeId
    if (!targetEmployeeId) {
      return NextResponse.json({ error: 'Punetori nuk u gjet' }, { status: 400 })
    }

    // Validate status — employees can only set DRAFT or SUBMITTED
    const validForEmployee: TimesheetStatus[] = ['DRAFT', 'SUBMITTED']
    const validForManager: TimesheetStatus[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']
    const allowedStatuses = session.role === 'MANAGER' ? validForManager : validForEmployee
    const finalStatus: TimesheetStatus =
      status && allowedStatuses.includes(status) ? status : 'DRAFT'

    // Validate project belongs to tenant
    const project = await db.project.findFirst({
      where: { id: projectId, tenantId: session.tenantId },
    })
    if (!project) {
      return NextResponse.json({ error: 'Projekti nuk u gjet' }, { status: 404 })
    }

    // Validate employee belongs to tenant
    const employee = await db.employee.findFirst({
      where: { id: targetEmployeeId, tenantId: session.tenantId },
    })
    if (!employee) {
      return NextResponse.json({ error: 'Punetori nuk u gjet' }, { status: 404 })
    }

    const ts = await db.timesheet.create({
      data: {
        employeeId: targetEmployeeId,
        projectId,
        date: parsedDate,
        hours: hrs,
        description: description?.trim() || null,
        status: finalStatus,
        tenantId: session.tenantId,
      },
      include: FULL_INCLUDES,
    })

    return NextResponse.json({ timesheet: shapeTimesheet(ts) }, { status: 201 })
  } catch (e: any) {
    if (e instanceof Response) return e as any
    console.error('POST /api/timesheets error', e)
    return NextResponse.json({ error: 'Gabim i brendshëm i serverit' }, { status: 500 })
  }
}
