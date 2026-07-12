import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireManager } from '@/lib/auth'

// POST /api/projects/[id]/assign — assign employee to project
// body: { employeeId, role? }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireManager()
    const { id } = await params
    const { employeeId, role } = await req.json()

    if (!employeeId) {
      return NextResponse.json({ error: 'Punetori kërkohet' }, { status: 400 })
    }

    const project = await db.project.findFirst({
      where: { id, tenantId: session.tenantId },
    })
    if (!project) {
      return NextResponse.json({ error: 'Projekti nuk u gjet' }, { status: 404 })
    }

    const employee = await db.employee.findFirst({
      where: { id: employeeId, tenantId: session.tenantId },
    })
    if (!employee) {
      return NextResponse.json({ error: 'Punetori nuk u gjet' }, { status: 404 })
    }

    const assignment = await db.projectAssignment.create({
      data: {
        projectId: id,
        employeeId,
        role: role?.trim() || null,
      },
    })

    return NextResponse.json({ assignment }, { status: 201 })
  } catch (e: any) {
    if (e instanceof Response) return e as any
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'Punetori është tashmë i caktuar' }, { status: 409 })
    }
    console.error('POST /api/projects/[id]/assign error', e)
    return NextResponse.json({ error: 'Gabim i brendshëm' }, { status: 500 })
  }
}

// DELETE /api/projects/[id]/assign?employeeId=... — unassign
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireManager()
    const { id } = await params
    const url = new URL(req.url)
    const employeeId = url.searchParams.get('employeeId')
    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId kërkohet' }, { status: 400 })
    }

    await db.projectAssignment.deleteMany({
      where: { projectId: id, employeeId },
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e instanceof Response) return e as any
    console.error('DELETE /api/projects/[id]/assign error', e)
    return NextResponse.json({ error: 'Gabim i brendshëm' }, { status: 500 })
  }
}
