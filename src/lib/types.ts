// Shared types for OraProjekt
export type Role = 'MANAGER' | 'EMPLOYEE'

export type SessionUser = {
  id: string
  email: string
  name: string
  role: Role
  tenantId: string
  tenantName: string
  employeeId: string | null
}

export type ProjectStatus = 'ACTIVE' | 'ON_HOLD' | 'COMPLETED'
export type TimesheetStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'

export type Project = {
  id: string
  name: string
  description: string | null
  status: ProjectStatus
  budgetHours: number | null
  startDate: string | null
  endDate: string | null
  color: string
  createdAt: string
  assignmentsCount: number
  timesheetsCount: number
  loggedHours: number
  team: { id: string; name: string; position: string | null; role: string | null }[]
}

export type Employee = {
  id: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  phone: string | null
  position: string | null
  hourlyRate: number
  role: Role
  createdAt: string
  assignmentsCount: number
  timesheetsCount: number
  totalHours: number
  projects: {
    id: string
    name: string
    color: string
    role: string | null
  }[]
}

export type Timesheet = {
  id: string
  date: string
  hours: number
  description: string | null
  status: TimesheetStatus
  createdAt: string
  updatedAt: string
  employee: {
    id: string
    name: string
    position: string | null
    hourlyRate: number
  }
  project: {
    id: string
    name: string
    color: string
  }
  cost: number
}

export type ReportSummary = {
  summary: {
    totalHours: number
    totalEntries: number
    activeProjects: number
    totalEmployees: number
    pendingApprovals: number
  }
  byStatus: Record<TimesheetStatus, { hours: number; count: number }>
  byProject: {
    projectId: string
    name: string
    color: string
    budgetHours: number | null
    hours: number
    entries: number
  }[]
  byEmployee: {
    employeeId: string
    name: string
    position: string | null
    hourlyRate: number
    hours: number
    entries: number
    cost: number
  }[]
  byDate: {
    date: string
    hours: number
    entries: number
  }[]
}

export const STATUS_LABELS: Record<TimesheetStatus, string> = {
  DRAFT: 'Skicë',
  SUBMITTED: 'Dërguar',
  APPROVED: 'Aprovuar',
  REJECTED: 'Refuzuar',
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  ACTIVE: 'Aktiv',
  ON_HOLD: 'Në pritje',
  COMPLETED: 'Përfunduar',
}

export const PROJECT_COLORS = [
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ef4444', // red
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
  '#f97316', // orange
]

// Tenant domain mapping — links email domain to tenant for OAuth auto-assignment
export type TenantDomainStatus = 'PENDING' | 'ACTIVE' | 'REJECTED'

export type TenantDomain = {
  id: string
  tenantId: string
  domain: string
  status: TenantDomainStatus
  verifiedAt: string | null
  createdAt: string
}

export const TENANT_DOMAIN_STATUS_LABELS: Record<TenantDomainStatus, string> = {
  PENDING: 'Në pritje',
  ACTIVE: 'Aktiv',
  REJECTED: 'Refuzuar',
}
