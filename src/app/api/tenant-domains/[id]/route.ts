import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireManager } from '@/lib/auth'

// DELETE /api/tenant-domains/[id] — remove domain mapping
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireManager()
    const { id } = await params

    // Verify ownership
    const existing = await db.tenantDomain.findFirst({
      where: { id, tenantId: session.tenantId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Domeni nuk u gjet' }, { status: 404 })
    }

    await db.tenantDomain.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e instanceof Response) return e as any
    console.error('DELETE /api/tenant-domains/[id] error', e)
    return NextResponse.json({ error: 'Gabim i brendshëm' }, { status: 500 })
  }
}

// PATCH /api/tenant-domains/[id] — verify domain (admin action)
// body: { status: 'ACTIVE' | 'REJECTED' }
export async function PATCH(
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

    const existing = await db.tenantDomain.findFirst({
      where: { id, tenantId: session.tenantId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Domeni nuk u gjet' }, { status: 404 })
    }

    const validStatuses = ['PENDING', 'ACTIVE', 'REJECTED']
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: 'Status i pavlefshëm' }, { status: 400 })
    }

    const updated = await db.tenantDomain.update({
      where: { id },
      data: {
        status: body.status,
        verifiedAt: body.status === 'ACTIVE' ? new Date() : null,
      },
    })

    return NextResponse.json({ domain: updated })
  } catch (e: any) {
    if (e instanceof Response) return e as any
    console.error('PATCH /api/tenant-domains/[id] error', e)
    return NextResponse.json({ error: 'Gabim i brendshëm' }, { status: 500 })
  }
}
