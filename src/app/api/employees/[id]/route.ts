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

    // If email is changing, check for duplicates and update the User email too
    const newEmail = body.email?.toLowerCase().trim()
    if (newEmail && newEmail !== existing.email) {
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
    })

    // Update linked user: email + role
    if (existing.userId) {
      await db.user.update({
        where: { id: existing.userId },
        data: {
          ...(newEmail ? { email: newEmail } : {}),
          ...(body.role ? { role: body.role === 'MANAGER' ? 'MANAGER' : 'EMPLOYEE' } : {}),
          name: `${updated.firstName} ${updated.lastName}`,
        },
      }).catch(() => {}) // non-fatal if user update fails
    }

    return NextResponse.json({ employee: updated })
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

    // Use a transaction: delete employee first, then linked user
    await db.$transaction(async (tx) => {
      // Delete employee's timesheets and assignments first (cascade)
      await tx.timesheet.deleteMany({ where: { employeeId: id } })
      await tx.projectAssignment.deleteMany({ where: { employeeId: id } })
      await tx.employee.delete({ where: { id } })
      // Delete linked user
      if (existing.userId) {
        await tx.user.delete({ where: { id: existing.userId } }).catch(() => {})
      }
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e instanceof Response) return e as any
    console.error('DELETE /api/employees/[id] error', e)
    return NextResponse.json({ error: 'Gabim i brendshëm' }, { status: 500 })
  }
}
