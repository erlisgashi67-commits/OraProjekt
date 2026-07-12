import { db } from '../src/lib/db'
async function main() {
  const users = await db.user.findMany({ select: { email: true, password: true, name: true } })
  for (const u of users) console.log(u.email, '|', u.password, '|', u.name)
}
main().then(() => process.exit(0))
