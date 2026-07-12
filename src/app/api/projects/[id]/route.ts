import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireManager } from '@/lib/auth'

// PUT /api/projects/[id] — update project (manager only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireManager()
    const { id } = await params
    const body = await req.json()

    const existing = await db.project.findFirst({
      where: { id, tenantId: session.tenantId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Projekti nuk u gjet' }, { status: 404 })
    }

    const updated = await db.project.update({
      where: { id },
      data: {
        name: body.name?.trim() ?? existing.name,
        description: body.description !== undefined ? (body.description?.trim() || null) : existing.description,
        status: body.status ?? existing.status,
        budgetHours: body.budgetHours !== undefined ? (body.budgetHours ? Number(body.budgetHours) : null) : existing.budgetHours,
        startDate: body.startDate !== undefined ? (body.startDate ? new Date(body.startDate) : null) : existing.startDate,
        endDate: body.endDate !== undefined ? (body.endDate ? new Date(body.endDate) : null) : existing.endDate,
        color: body.color ?? existing.color,
      },
    })

    return NextResponse.json({ project: updated })
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

    await db.project.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e instanceof Response) return e as any
    console.error('DELETE /api/projects/[id] error', e)
    return NextResponse.json({ error: 'Gabim i brendshëm' }, { status: 500 })
  }
}
