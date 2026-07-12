import { db } from '../src/lib/db'
async function main() {
  const projects = await db.project.findMany()
  console.log('Projects in DB:', projects.length)
  for (const p of projects) console.log(' -', p.id, '|', p.name, '|', p.tenantId)
  const users = await db.user.findMany({ include: { tenant: true } })
  console.log('\nUsers in DB:', users.length)
  for (const u of users) console.log(' -', u.email, '| role:', u.role, '| tenant:', u.tenant.name)
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
