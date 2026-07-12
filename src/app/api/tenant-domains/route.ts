import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireManager } from '@/lib/auth'

// GET /api/tenant-domains — list domains for current tenant
export async function GET() {
  try {
    const session = await requireManager()
    const domains = await db.tenantDomain.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ domains })
  } catch (e: any) {
    if (e instanceof Response) return e as any
    console.error('GET /api/tenant-domains error', e)
    return NextResponse.json({ error: 'Gabim i brendshëm' }, { status: 500 })
  }
}

// POST /api/tenant-domains — add a domain to current tenant
// body: { domain: "kompania-ks.com" }
export async function POST(req: NextRequest) {
  try {
    const session = await requireManager()

    let body: any
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'JSON i pavlefshëm' }, { status: 400 })
    }

    const rawDomain = body.domain?.toLowerCase().trim()
    if (!rawDomain) {
      return NextResponse.json({ error: 'Domeni kërkohet' }, { status: 400 })
    }

    // Strip "http://" / "https://" / "www." / "@" prefixes
    const domain = rawDomain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/^@/, '')
      .split('/')[0]

    // Validate domain format
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
      return NextResponse.json(
        { error: 'Format domeni i pavlefshëm (p.sh. kompania-ks.com)' },
        { status: 400 }
      )
    }

    // Check if domain is already claimed by another tenant
    const existing = await db.tenantDomain.findUnique({ where: { domain } })
    if (existing) {
      if (existing.tenantId === session.tenantId) {
        return NextResponse.json({ error: 'Ky domen është tashmë i lidhur me tenant-in tuaj' }, { status: 409 })
      }
      return NextResponse.json(
        { error: 'Ky domen është tashmë i regjistruar nga një organizatë tjetër' },
        { status: 409 }
      )
    }

    const mapping = await db.tenantDomain.create({
      data: {
        tenantId: session.tenantId,
        domain,
        status: 'PENDING', // admin must verify ownership (e.g. via DNS TXT record)
      },
    })

    return NextResponse.json({ domain: mapping }, { status: 201 })
  } catch (e: any) {
    if (e instanceof Response) return e as any
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'Ky domen ekziston tashmë' }, { status: 409 })
    }
    console.error('POST /api/tenant-domains error', e)
    return NextResponse.json({ error: 'Gabim i brendshëm i serverit' }, { status: 500 })
  }
}
