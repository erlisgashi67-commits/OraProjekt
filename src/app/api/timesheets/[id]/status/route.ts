import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireManager } from '@/lib/auth'

// PATCH /api/timesheets/[id]/status — change status (manager only)
// body: { status: 'APPROVED' | 'REJECTED' | 'SUBMITTED' | 'DRAFT' }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireManager()
    const { id } = await params
    const { status } = await req.json()

    if (!['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Status i pavlefshëm' }, { status: 400 })
    }

    const existing = await db.timesheet.findFirst({
      where: { id, tenantId: session.tenantId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Regjistrimi nuk u gjet' }, { status: 404 })
    }

    const updated = await db.timesheet.update({
      where: { id },
      data: { status },
    })

    return NextResponse.json({ timesheet: updated })
  } catch (e: any) {
    if (e instanceof Response) return e as any
    console.error('PATCH /api/timesheets/[id]/status error', e)
    return NextResponse.json({ error: 'Gabim i brendshëm' }, { status: 500 })
  }
}
