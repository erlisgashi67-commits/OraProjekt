// Seed OraProjekt with a demo tenant, manager, employees, projects, and timesheets
import { db } from '../src/lib/db'

async function main() {
  console.log('Seeding OraProjekt...')

  // Clean
  await db.timesheet.deleteMany()
  await db.projectAssignment.deleteMany()
  await db.project.deleteMany()
  await db.employee.deleteMany()
  await db.user.deleteMany()
  await db.tenant.deleteMany()

  // Tenant
  const tenant = await db.tenant.create({
    data: {
      name: 'OraProjekt Demo',
      subdomain: 'demo',
      plan: 'PRO',
    },
  })

  // Manager
  const managerUser = await db.user.create({
    data: {
      email: 'menaxher@oraprojekt.demo',
      password: '123456',
      name: 'Lirak Berisha',
      role: 'MANAGER',
      tenantId: tenant.id,
    },
  })
  await db.employee.create({
    data: {
      firstName: 'Lirak',
      lastName: 'Berisha',
      email: 'menaxher@oraprojekt.demo',
      phone: '+383 44 100 100',
      position: 'Projekt Menaxher',
      hourlyRate: 25,
      tenantId: tenant.id,
      userId: managerUser.id,
    },
  })

  // Employees
  const empData = [
    { fn: 'Ana', ln: 'Krasniqi', pos: 'Frontend Developer', rate: 18, email: 'ana@oraprojekt.demo', phone: '+383 44 200 201' },
    { fn: 'Bekim', ln: 'Hoxha', pos: 'Backend Developer', rate: 20, email: 'bekim@oraprojekt.demo', phone: '+383 44 200 202' },
    { fn: 'Drita', ln: 'Murati', pos: 'UX Designer', rate: 17, email: 'drita@oraprojekt.demo', phone: '+383 44 200 203' },
    { fn: 'Eron', ln: 'Shabani', pos: 'QA Engineer', rate: 15, email: 'eron@oraprojekt.demo', phone: '+383 44 200 204' },
  ]

  const employees = []
  for (const e of empData) {
    const u = await db.user.create({
      data: {
        email: e.email,
        password: '123456',
        name: `${e.fn} ${e.ln}`,
        role: 'EMPLOYEE',
        tenantId: tenant.id,
      },
    })
    const emp = await db.employee.create({
      data: {
        firstName: e.fn,
        lastName: e.ln,
        email: e.email,
        phone: e.phone,
        position: e.pos,
        hourlyRate: e.rate,
        tenantId: tenant.id,
        userId: u.id,
      },
    })
    employees.push(emp)
  }

  // Projects
  const projects = await Promise.all([
    db.project.create({
      data: {
        name: 'Rindërtimi i Faqes së Web-it',
        description: 'Riidhërtim i plotë i faqes korporative me Next.js dhe dizajn modern.',
        status: 'ACTIVE',
        budgetHours: 320,
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-09-30'),
        color: '#10b981',
        tenantId: tenant.id,
      },
    }),
    db.project.create({
      data: {
        name: 'Aplikacion Mobile iOS & Android',
        description: 'Aplikacion mobile për punetoret — regjistrim i orëve në terren.',
        status: 'ACTIVE',
        budgetHours: 480,
        startDate: new Date('2026-05-15'),
        endDate: new Date('2026-12-15'),
        color: '#f59e0b',
        tenantId: tenant.id,
      },
    }),
    db.project.create({
      data: {
        name: 'Integrim API me ERP',
        description: 'Integrim i të dhënave midis OraProjekt dhe sistemit ERP ekzistues.',
        status: 'ACTIVE',
        budgetHours: 160,
        startDate: new Date('2026-07-01'),
        endDate: new Date('2026-10-01'),
        color: '#8b5cf6',
        tenantId: tenant.id,
      },
    }),
    db.project.create({
      data: {
        name: 'Migrim në Multi-tenant',
        description: 'Ndarje e të dhënave për klientë të ndryshëm, izolim në nivel DB.',
        status: 'ON_HOLD',
        budgetHours: 200,
        startDate: new Date('2026-08-01'),
        color: '#ef4444',
        tenantId: tenant.id,
      },
    }),
  ])

  // Assignments
  const assignments = [
    [0, 0, 'Frontend Lead'], [0, 2, 'UI/UX'], [0, 1, 'Backend'],
    [1, 0, 'React Native'], [1, 1, 'API'], [1, 3, 'QA'],
    [2, 1, 'Backend Lead'], [2, 3, 'QA'],
    [3, 2, 'Architect'], [3, 1, 'DB Engineer'],
  ]
  for (const [pIdx, eIdx, role] of assignments) {
    await db.projectAssignment.create({
      data: {
        projectId: projects[pIdx].id,
        employeeId: employees[eIdx].id,
        role: role as string,
      },
    })
  }

  // Timesheets — last 30 days, varied
  const descriptions = [
    'Punë në funksionalitetin e regjistrimit të orëve.',
    'Rishikim kodi dhe refaktorim.',
    'Takim me klientin për kërkesat e reja.',
    'Zgjidhje e bugs dhe testim.',
    'Përgatitje dizajn dhe prototipe.',
    'Dokumentim teknik.',
    'Implementim i API endpoint të ri.',
    'Testim manual dhe raportim.',
  ]
  const today = new Date()
  // Use a deterministic-ish pseudo-random for stable seed
  let seed = 42
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const date = new Date(today)
    date.setDate(today.getDate() - dayOffset)
    const dow = date.getDay()
    if (dow === 0 || dow === 6) continue

    const numEmps = 2 + Math.floor(rand() * 3)
    const indices = [0, 1, 2, 3].sort(() => rand() - 0.5).slice(0, numEmps)
    for (const eIdx of indices) {
      const numEntries = 1 + Math.floor(rand() * 2)
      const projectsForEmp = assignments.filter(a => a[1] === eIdx).map(a => a[0])
      if (projectsForEmp.length === 0) continue
      for (let i = 0; i < numEntries; i++) {
        const pIdx = projectsForEmp[i % projectsForEmp.length]
        const hours = 1 + rand() * 5
        const status = dayOffset > 7 ? 'APPROVED' : dayOffset > 2 ? 'SUBMITTED' : 'DRAFT'
        await db.timesheet.create({
          data: {
            employeeId: employees[eIdx].id,
            projectId: projects[pIdx].id,
            date,
            hours: Math.round(hours * 100) / 100,
            description: descriptions[Math.floor(rand() * descriptions.length)],
            status,
            tenantId: tenant.id,
          },
        })
      }
    }
  }

  console.log('✓ Seeded tenant:', tenant.name)
  console.log('✓ Seeded 1 manager +', employees.length, 'employees')
  console.log('✓ Seeded', projects.length, 'projects')
  const tsCount = await db.timesheet.count()
  console.log('✓ Seeded', tsCount, 'timesheet entries')
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
