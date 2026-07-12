import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// GET /api/reports/summary?from=...&to=...
// Returns aggregated KPIs for the tenant (or for current employee if EMPLOYEE role)
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth()
    const url = new URL(req.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')

    const dateFilter: any = {}
    if (from) dateFilter.gte = new Date(from)
    if (to) dateFilter.lte = new Date(to)

    const where: any = { tenantId: session.tenantId }
    if (Object.keys(dateFilter).length > 0) where.date = dateFilter

    // Employees only see their own
    if (session.role === 'EMPLOYEE' && session.employeeId) {
      where.employeeId = session.employeeId
    }

    const [totalHours, totalCount, byStatus, byProjectRaw, byEmployeeRaw, byDateRaw] = await Promise.all([
      db.timesheet.aggregate({ where, _sum: { hours: true } }),
      db.timesheet.count({ where }),
      db.timesheet.groupBy({ by: ['status'], where, _sum: { hours: true }, _count: true }),
      db.timesheet.groupBy({
        by: ['projectId'],
        where,
        _sum: { hours: true },
        _count: true,
      }),
      session.role === 'MANAGER'
        ? db.timesheet.groupBy({
            by: ['employeeId'],
            where,
            _sum: { hours: true },
            _count: true,
          })
        : Promise.resolve([]),
      db.timesheet.groupBy({
        by: ['date'],
        where,
        _sum: { hours: true },
        _count: true,
      }),
    ])

    // Hydrate project names
    const projectIds = byProjectRaw.map(p => p.projectId)
    const projects = projectIds.length
      ? await db.project.findMany({ where: { id: { in: projectIds } }, select: { id: true, name: true, color: true, budgetHours: true } })
      : []
    const projectMap = new Map(projects.map(p => [p.id, p]))

    const byProject = byProjectRaw.map(p => {
      const proj = projectMap.get(p.projectId)
      return {
        projectId: p.projectId,
        name: proj?.name ?? 'I panjohur',
        color: proj?.color ?? '#888',
        budgetHours: proj?.budgetHours ?? null,
        hours: p._sum.hours ?? 0,
        entries: p._count,
      }
    }).sort((a, b) => b.hours - a.hours)

    // Hydrate employee names
    const employeeIds = byEmployeeRaw.map((e: any) => e.employeeId)
    const employees = employeeIds.length
      ? await db.employee.findMany({ where: { id: { in: employeeIds } }, select: { id: true, firstName: true, lastName: true, position: true, hourlyRate: true } })
      : []
    const empMap = new Map(employees.map(e => [e.id, e]))

    const byEmployee = byEmployeeRaw.map((e: any) => {
      const emp = empMap.get(e.employeeId)
      return {
        employeeId: e.employeeId,
        name: emp ? `${emp.firstName} ${emp.lastName}` : 'I panjohur',
        position: emp?.position ?? null,
        hourlyRate: emp?.hourlyRate ?? 0,
        hours: e._sum.hours ?? 0,
        entries: e._count,
        cost: (e._sum.hours ?? 0) * (emp?.hourlyRate ?? 0),
      }
    }).sort((a, b) => b.hours - a.hours)

    // Build daily time series
    const byDate = byDateRaw
      .map(d => ({
        date: d.date,
        hours: d._sum.hours ?? 0,
        entries: d._count,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Status breakdown
    const statusMap: Record<string, { hours: number; count: number }> = {
      DRAFT: { hours: 0, count: 0 },
      SUBMITTED: { hours: 0, count: 0 },
      APPROVED: { hours: 0, count: 0 },
      REJECTED: { hours: 0, count: 0 },
    }
    for (const s of byStatus) {
      statusMap[s.status] = { hours: s._sum.hours ?? 0, count: s._count }
    }

    // Counts for header
    const [projectCount, employeeCount, pendingCount] = await Promise.all([
      db.project.count({ where: { tenantId: session.tenantId, status: 'ACTIVE' } }),
      db.employee.count({ where: { tenantId: session.tenantId } }),
      db.timesheet.count({ where: { tenantId: session.tenantId, status: 'SUBMITTED', ...(session.role === 'EMPLOYEE' && session.employeeId ? { employeeId: session.employeeId } : {}) } }),
    ])

    return NextResponse.json({
      summary: {
        totalHours: totalHours._sum.hours ?? 0,
        totalEntries: totalCount,
        activeProjects: projectCount,
        totalEmployees: employeeCount,
        pendingApprovals: pendingCount,
      },
      byStatus: statusMap,
      byProject,
      byEmployee,
      byDate,
    })
  } catch (e: any) {
    if (e instanceof Response) return e as any
    console.error('GET /api/reports/summary error', e)
    return NextResponse.json({ error: 'Gabim i brendshëm' }, { status: 500 })
  }
}
