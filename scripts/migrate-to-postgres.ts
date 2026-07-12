// =============================================================================
// OraProjekt — SQLite to PostgreSQL Migration Script
// =============================================================================
// This script migrates data from SQLite (development) to PostgreSQL (production)
// with RLS (Row-Level Security) enabled.
//
// Usage:
//   1. Update prisma/schema.prisma: provider = "postgresql"
//   2. Set DATABASE_URL to PostgreSQL connection string
//   3. Run: bun run scripts/migrate-to-postgres.ts
//
// Prerequisites:
//   - Source SQLite DB exists at db/custom.db
//   - Target PostgreSQL DB is empty (schema pushed with db:push)
//   - RLS policies applied (scripts/postgres-rls.sql)
// =============================================================================

import { PrismaClient } from '@prisma/client'
import { Database } from 'sqlite3'
import { open } from 'sqlite'
import path from 'path'

// Source: SQLite
const sqliteDb = await open({
  filename: path.join(process.cwd(), 'db', 'custom.db'),
  driver: Database,
})

// Target: PostgreSQL (uses DATABASE_URL env var)
const pg = new PrismaClient()

async function migrate() {
  console.log('🚀 Starting migration SQLite → PostgreSQL...\n')

  // ===========================================================================
  // 1. Migrate Tenants
  // ===========================================================================
  console.log('📋 Migrating Tenants...')
  const tenants = await sqliteDb.all('SELECT * FROM Tenant')
  for (const t of tenants) {
    await pg.tenant.upsert({
      where: { id: t.id },
      create: {
        id: t.id,
        name: t.name,
        subdomain: t.subdomain,
        plan: t.plan,
        createdAt: new Date(t.createdAt),
      },
      update: {},
    })
  }
  console.log(`   ✅ ${tenants.length} tenants`)

  // ===========================================================================
  // 2. Migrate TenantDomains
  // ===========================================================================
  console.log('🌐 Migrating TenantDomains...')
  const domains = await sqliteDb.all('SELECT * FROM TenantDomain')
  for (const d of domains) {
    await pg.tenantDomain.upsert({
      where: { id: d.id },
      create: {
        id: d.id,
        tenantId: d.tenantId,
        domain: d.domain,
        status: d.status,
        verifiedAt: d.verifiedAt ? new Date(d.verifiedAt) : null,
        createdAt: new Date(d.createdAt),
      },
      update: {},
    })
  }
  console.log(`   ✅ ${domains.length} domains`)

  // ===========================================================================
  // 3. Migrate Users
  // ===========================================================================
  console.log('👥 Migrating Users...')
  const users = await sqliteDb.all('SELECT * FROM User')
  for (const u of users) {
    await pg.user.upsert({
      where: { id: u.id },
      create: {
        id: u.id,
        email: u.email,
        password: u.password,
        name: u.name,
        role: u.role,
        tenantId: u.tenantId,
        image: u.image,
        emailVerified: u.emailVerified ? new Date(u.emailVerified) : null,
        createdAt: new Date(u.createdAt),
      },
      update: {},
    })
  }
  console.log(`   ✅ ${users.length} users`)

  // ===========================================================================
  // 4. Migrate Accounts (NextAuth)
  // ===========================================================================
  console.log('🔐 Migrating Accounts...')
  const accounts = await sqliteDb.all('SELECT * FROM Account')
  for (const a of accounts) {
    await pg.account.upsert({
      where: { id: a.id },
      create: {
        id: a.id,
        userId: a.userId,
        type: a.type,
        provider: a.provider,
        providerAccountId: a.providerAccountId,
        refresh_token: a.refresh_token,
        access_token: a.access_token,
        expires_at: a.expires_at,
        token_type: a.token_type,
        scope: a.scope,
        id_token: a.id_token,
        session_state: a.session_state,
      },
      update: {},
    })
  }
  console.log(`   ✅ ${accounts.length} accounts`)

  // ===========================================================================
  // 5. Migrate Employees
  // ===========================================================================
  console.log('👔 Migrating Employees...')
  const employees = await sqliteDb.all('SELECT * FROM Employee')
  for (const e of employees) {
    await pg.employee.upsert({
      where: { id: e.id },
      create: {
        id: e.id,
        firstName: e.firstName,
        lastName: e.lastName,
        email: e.email,
        phone: e.phone,
        position: e.position,
        hourlyRate: e.hourlyRate,
        tenantId: e.tenantId,
        userId: e.userId,
        createdAt: new Date(e.createdAt),
      },
      update: {},
    })
  }
  console.log(`   ✅ ${employees.length} employees`)

  // ===========================================================================
  // 6. Migrate Projects
  // ===========================================================================
  console.log('📁 Migrating Projects...')
  const projects = await sqliteDb.all('SELECT * FROM Project')
  for (const p of projects) {
    await pg.project.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        budgetHours: p.budgetHours,
        startDate: p.startDate ? new Date(p.startDate) : null,
        endDate: p.endDate ? new Date(p.endDate) : null,
        color: p.color,
        tenantId: p.tenantId,
        createdAt: new Date(p.createdAt),
      },
      update: {},
    })
  }
  console.log(`   ✅ ${projects.length} projects`)

  // ===========================================================================
  // 7. Migrate ProjectAssignments
  // ===========================================================================
  console.log('🔗 Migrating ProjectAssignments...')
  const assignments = await sqliteDb.all('SELECT * FROM ProjectAssignment')
  for (const a of assignments) {
    await pg.projectAssignment.upsert({
      where: { id: a.id },
      create: {
        id: a.id,
        projectId: a.projectId,
        employeeId: a.employeeId,
        role: a.role,
        createdAt: new Date(a.createdAt),
      },
      update: {},
    })
  }
  console.log(`   ✅ ${assignments.length} assignments`)

  // ===========================================================================
  // 8. Migrate Timesheets
  // ===========================================================================
  console.log('⏰ Migrating Timesheets...')
  const timesheets = await sqliteDb.all('SELECT * FROM Timesheet')
  let count = 0
  for (const t of timesheets) {
    await pg.timesheet.upsert({
      where: { id: t.id },
      create: {
        id: t.id,
        employeeId: t.employeeId,
        projectId: t.projectId,
        date: new Date(t.date),
        hours: t.hours,
        description: t.description,
        status: t.status,
        tenantId: t.tenantId,
        createdAt: new Date(t.createdAt),
        updatedAt: new Date(t.updatedAt),
      },
      update: {},
    })
    count++
    if (count % 100 === 0) console.log(`   ...${count}/${timesheets.length}`)
  }
  console.log(`   ✅ ${timesheets.length} timesheets`)

  // ===========================================================================
  // Done!
  // ===========================================================================
  console.log('\n✅ Migration complete!\n')
  console.log('Next steps:')
  console.log('  1. Verify data: SELECT count(*) FROM "User";')
  console.log('  2. Test RLS: SELECT set_tenant_context(\'tenant-id\');')
  console.log('  3. Update app to set tenant context per request')
  console.log('  4. Test thoroughly before switching DNS')

  await sqliteDb.close()
  await pg.$disconnect()
}

migrate().catch((e) => {
  console.error('❌ Migration failed:', e)
  process.exit(1)
})
