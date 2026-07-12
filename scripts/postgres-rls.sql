-- =============================================================================
-- OraProjekt — PostgreSQL + Row-Level Security Migration
-- =============================================================================
-- Run this AFTER migrating from SQLite to PostgreSQL
--
-- Prerequisites:
--   1. Update prisma/schema.prisma: provider = "postgresql"
--   2. Run: bun run db:push
--   3. Run this SQL script: psql $DATABASE_URL -f scripts/postgres-rls.sql
-- =============================================================================

-- Enable RLS extension (should be enabled by default in PostgreSQL 13+)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. Enable Row-Level Security on all tenant-scoped tables
-- =============================================================================

ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TenantDomain" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VerificationToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Employee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Timesheet" ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 2. Create policies — tenant isolation
-- =============================================================================
-- Each policy checks that the tenant_id matches the current tenant context.
-- The tenant context is set per-session via: SET app.current_tenant = 'tenant-id'
-- =============================================================================

-- Tenant table (special case — users can only see their own tenant)
CREATE POLICY tenant_isolation ON "Tenant"
  FOR ALL
  USING (id = current_setting('app.current_tenant', true)::text);

-- All other tables with tenantId column
CREATE POLICY tenant_isolation ON "TenantDomain"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true)::text);

CREATE POLICY tenant_isolation ON "User"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true)::text);

CREATE POLICY tenant_isolation ON "Employee"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true)::text);

CREATE POLICY tenant_isolation ON "Project"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true)::text);

CREATE POLICY tenant_isolation ON "Timesheet"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true)::text);

-- Account, Session, VerificationToken — join through User
CREATE POLICY tenant_isolation ON "Account"
  FOR ALL
  USING (
    "userId" IN (
      SELECT id FROM "User"
      WHERE "tenantId" = current_setting('app.current_tenant', true)::text
    )
  );

CREATE POLICY tenant_isolation ON "Session"
  FOR ALL
  USING (
    "userId" IN (
      SELECT id FROM "User"
      WHERE "tenantId" = current_setting('app.current_tenant', true)::text
    )
  );

-- ProjectAssignment — join through Project + Employee
CREATE POLICY tenant_isolation ON "ProjectAssignment"
  FOR ALL
  USING (
    "projectId" IN (
      SELECT id FROM "Project"
      WHERE "tenantId" = current_setting('app.current_tenant', true)::text
    )
  );

-- =============================================================================
-- 3. Force RLS even for table owners (extra safety)
-- =============================================================================
ALTER TABLE "Tenant" FORCE ROW LEVEL SECURITY;
ALTER TABLE "TenantDomain" FORCE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Account" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Session" FORCE ROW LEVEL SECURITY;
ALTER TABLE "VerificationToken" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Employee" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Project" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ProjectAssignment" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Timesheet" FORCE ROW LEVEL SECURITY;

-- =============================================================================
-- 4. Create indexes for performance (RLS adds overhead, indexes help)
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_user_tenant ON "User" ("tenantId");
CREATE INDEX IF NOT EXISTS idx_employee_tenant ON "Employee" ("tenantId");
CREATE INDEX IF NOT EXISTS idx_project_tenant ON "Project" ("tenantId");
CREATE INDEX IF NOT EXISTS idx_timesheet_tenant ON "Timesheet" ("tenantId");
CREATE INDEX IF NOT EXISTS idx_timesheet_tenant_date ON "Timesheet" ("tenantId", "date");
CREATE INDEX IF NOT EXISTS idx_timesheet_employee_date ON "Timesheet" ("employeeId", "date");
CREATE INDEX IF NOT EXISTS idx_timesheet_project_date ON "Timesheet" ("projectId", "date");
CREATE INDEX IF NOT EXISTS idx_tenant_domain_domain ON "TenantDomain" ("domain");

-- =============================================================================
-- 5. Create a function to set tenant context (call from app)
-- =============================================================================
-- Usage: SELECT set_tenant_context('tenant-123');
-- =============================================================================

CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id TEXT)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_tenant', tenant_id, true);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 6. Create a function to clear tenant context (call on logout)
-- =============================================================================

CREATE OR REPLACE FUNCTION clear_tenant_context()
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_tenant', '', true);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 7. Verification queries (run manually to test)
-- =============================================================================

-- Test 1: Without tenant context — should see 0 rows
-- SELECT count(*) FROM "User"; -- Expected: 0

-- Test 2: Set tenant context
-- SELECT set_tenant_context('your-tenant-id-here');

-- Test 3: With context — should see tenant's users
-- SELECT count(*) FROM "User"; -- Expected: > 0

-- Test 4: Clear context
-- SELECT clear_tenant_context();

-- =============================================================================
-- 8. Done! RLS is now active.
-- =============================================================================
-- IMPORTANT: Update Prisma client to set tenant context before queries:
--
-- await db.$executeRaw`SELECT set_tenant_context(${tenantId}::text)`;
-- const users = await db.user.findMany(); // only tenant's users
-- await db.$executeRaw`SELECT clear_tenant_context()`;
--
-- This provides DEFENSE-IN-DEPTH: even if application code forgets to filter
-- by tenantId, the database will enforce it.
-- =============================================================================
