// Clean up orphaned records: Users without Employee records
// These can happen if employee creation failed mid-way (before the transaction fix)
import { db } from '../src/lib/db'

async function main() {
  console.log('Cleaning up orphaned records...')

  // Find users without employee records
  const users = await db.user.findMany({
    include: { employee: true },
  })

  const orphans = users.filter(u => !u.employee)
  console.log(`Found ${orphans.length} orphaned user(s)`)

  for (const u of orphans) {
    // Don't delete the manager (they might not have an employee record if seeded that way)
    console.log(`  - ${u.email} (${u.role}) — no employee record`)
    if (u.role === 'EMPLOYEE') {
      await db.user.delete({ where: { id: u.id } })
      console.log(`    ✓ Deleted orphaned user: ${u.email}`)
    }
  }

  // Also check for employees without users (shouldn't happen but just in case)
  const employeesWithoutUser = await db.employee.findMany({
    where: { userId: null },
  })
  console.log(`\nFound ${employeesWithoutUser.length} employee(s) without user account`)
  for (const e of employeesWithoutUser) {
    console.log(`  - ${e.firstName} ${e.lastName} (${e.email})`)
  }

  // Final state
  const finalUsers = await db.user.count()
  const finalEmployees = await db.employee.count()
  console.log(`\nFinal state: ${finalUsers} users, ${finalEmployees} employees`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
