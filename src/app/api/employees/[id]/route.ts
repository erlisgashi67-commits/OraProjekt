import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireManager } from '@/lib/auth'

// PUT /api/employees/[id] — update employee (manager only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireManager()
    const { id } = await params
    const body = await req.json()

    const existing = await db.employee.findFirst({
      where: { id, tenantId: session.tenantId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Punetori nuk u gjet' }, { status: 404 })
    }

    const updated = await db.employee.update({
      where: { id },
      data: {
        firstName: body.firstName?.trim() ?? existing.firstName,
        lastName: body.lastName?.trim() ?? existing.lastName,
        email: body.email?.toLowerCase().trim() ?? existing.email,
        phone: body.phone !== undefined ? (body.phone?.trim() || null) : existing.phone,
        position: body.position !== undefined ? (body.position?.trim() || null) : existing.position,
        hourlyRate: body.hourlyRate !== undefined ? Number(body.hourlyRate) : existing.hourlyRate,
      },
    })

    // update user role if provided
    if (body.role && existing.userId) {
      await db.user.update({
        where: { id: existing.userId },
        data: { role: body.role === 'MANAGER' ? 'MANAGER' : 'EMPLOYEE' },
      })
    }

    return NextResponse.json({ employee: updated })
  } catch (e: any) {
    if (e instanceof Response) return e as any
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

    // delete linked user too
    if (existing.userId) {
      await db.user.delete({ where: { id: existing.userId } }).catch(() => {})
    }
    await db.employee.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e instanceof Response) return e as any
    console.error('DELETE /api/employees/[id] error', e)
    return NextResponse.json({ error: 'Gabim i brendshëm' }, { status: 500 })
  }
}
