import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// PUT /api/timesheets/[id] — update entry
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params
    const body = await req.json()

    const existing = await db.timesheet.findFirst({
      where: { id, tenantId: session.tenantId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Regjistrimi nuk u gjet' }, { status: 404 })
    }

    // Employees can only edit their own and only DRAFT/SUBMITTED/REJECTED
    if (session.role === 'EMPLOYEE') {
      if (existing.employeeId !== session.employeeId) {
        return NextResponse.json({ error: 'Nuk keni leje' }, { status: 403 })
      }
      if (existing.status === 'APPROVED') {
        return NextResponse.json({ error: 'Nuk mund të editohet — është aprovuar' }, { status: 400 })
      }
    }

    const updated = await db.timesheet.update({
      where: { id },
      data: {
        projectId: body.projectId ?? existing.projectId,
        date: body.date ? new Date(body.date) : existing.date,
        hours: body.hours ? Number(body.hours) : existing.hours,
        description: body.description !== undefined ? (body.description?.trim() || null) : existing.description,
        status: body.status ?? existing.status,
      },
    })

    return NextResponse.json({ timesheet: updated })
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
