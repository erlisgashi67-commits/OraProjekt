// API client wrappers
import type {
  SessionUser,
  Project,
  Employee,
  Timesheet,
  ReportSummary,
  TimesheetStatus,
  ProjectStatus,
} from './types'

const TOKEN_KEY = 'op_token'

// Token management — stored in localStorage, sent via Authorization header.
// This bypasses all cookie/SameSite/iframe restrictions.
export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init?.headers as Record<string, string>) || {}),
  }
  // Send token via Authorization header — works in ALL contexts (iframe, cross-origin, etc.)
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(url, {
    ...init,
    credentials: 'include', // also send cookies as fallback
    headers,
  })

  // Handle 401 — only trigger auto-logout if we had a token AND the request wasn't to /api/auth itself
  // (avoids false "session expired" toast on first visit with a stale token)
  if (res.status === 401) {
    const isAuthEndpoint = url.startsWith('/api/auth')
    if (token && !isAuthEndpoint && typeof window !== 'undefined') {
      clearToken()
      window.dispatchEvent(new CustomEvent('op:unauthorized'))
    }
    const data = await res.json().catch(() => ({}))
    const msg = (data as any)?.error || 'Sesioni ka skaduar. Ju lutemi hyni përsëri.'
    throw new Error(msg)
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = (data as any)?.error || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return data as T
}

export const api = {
  auth: {
    me: () => jsonFetch<{ user: SessionUser | null }>('/api/auth').then(r => r.user),
    login: (email: string, password: string) =>
      jsonFetch<SessionUser & { token: string }>('/api/auth', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }).then(res => {
        // Store token in localStorage for subsequent requests
        setToken(res.token)
        // Return user data (strip token)
        const { token, ...user } = res
        return user as SessionUser
      }),
    logout: () =>
      jsonFetch<{ ok: true }>('/api/auth', { method: 'DELETE' }).then(res => {
        clearToken()
        return res
      }),
  },
  projects: {
    list: () => jsonFetch<{ projects: Project[] }>('/api/projects').then(r => r.projects),
    create: (body: {
      name: string
      description?: string
      status?: ProjectStatus
      budgetHours?: number | null
      startDate?: string | null
      endDate?: string | null
      color?: string
    }) => jsonFetch<{ project: Project }>('/api/projects', { method: 'POST', body: JSON.stringify(body) }).then(r => r.project),
    update: (id: string, body: Partial<{
      name: string
      description: string
      status: ProjectStatus
      budgetHours: number | null
      startDate: string | null
      endDate: string | null
      color: string
    }>) => jsonFetch<{ project: Project }>(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(body) }).then(r => r.project),
    delete: (id: string) => jsonFetch<{ ok: true }>(`/api/projects/${id}`, { method: 'DELETE' }),
    assign: (id: string, employeeId: string, role?: string) =>
      jsonFetch<{ ok: true }>(`/api/projects/${id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ employeeId, role }),
      }),
    unassign: (id: string, employeeId: string) =>
      jsonFetch<{ ok: true }>(`/api/projects/${id}/assign?employeeId=${employeeId}`, { method: 'DELETE' }),
  },
  employees: {
    list: () => jsonFetch<{ employees: Employee[] }>('/api/employees').then(r => r.employees),
    create: (body: {
      firstName: string
      lastName: string
      email: string
      phone?: string
      position?: string
      hourlyRate?: number
      password?: string
      role?: 'MANAGER' | 'EMPLOYEE'
    }) => jsonFetch<{ employee: Employee }>('/api/employees', { method: 'POST', body: JSON.stringify(body) }).then(r => r.employee),
    update: (id: string, body: Partial<{
      firstName: string
      lastName: string
      email: string
      phone: string
      position: string
      hourlyRate: number
      role: 'MANAGER' | 'EMPLOYEE'
    }>) => jsonFetch<{ employee: Employee }>(`/api/employees/${id}`, { method: 'PUT', body: JSON.stringify(body) }).then(r => r.employee),
    delete: (id: string) => jsonFetch<{ ok: true }>(`/api/employees/${id}`, { method: 'DELETE' }),
  },
  timesheets: {
    list: (params?: {
      projectId?: string
      employeeId?: string
      from?: string
      to?: string
      status?: TimesheetStatus
      limit?: number
    }) => {
      const q = new URLSearchParams()
      if (params?.projectId) q.set('projectId', params.projectId)
      if (params?.employeeId) q.set('employeeId', params.employeeId)
      if (params?.from) q.set('from', params.from)
      if (params?.to) q.set('to', params.to)
      if (params?.status) q.set('status', params.status)
      if (params?.limit) q.set('limit', String(params.limit))
      return jsonFetch<{ timesheets: Timesheet[] }>(`/api/timesheets?${q.toString()}`).then(r => r.timesheets)
    },
    create: (body: {
      projectId: string
      employeeId?: string
      date: string
      hours: number
      description?: string
      status?: TimesheetStatus
    }) => jsonFetch<{ timesheet: Timesheet }>('/api/timesheets', { method: 'POST', body: JSON.stringify(body) }).then(r => r.timesheet),
    update: (id: string, body: Partial<{
      projectId: string
      date: string
      hours: number
      description: string
      status: TimesheetStatus
    }>) => jsonFetch<{ timesheet: Timesheet }>(`/api/timesheets/${id}`, { method: 'PUT', body: JSON.stringify(body) }).then(r => r.timesheet),
    delete: (id: string) => jsonFetch<{ ok: true }>(`/api/timesheets/${id}`, { method: 'DELETE' }),
    setStatus: (id: string, status: TimesheetStatus) =>
      jsonFetch<{ ok: true }>(`/api/timesheets/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  },
  reports: {
    summary: (params?: { from?: string; to?: string }) => {
      const q = new URLSearchParams()
      if (params?.from) q.set('from', params.from)
      if (params?.to) q.set('to', params.to)
      return jsonFetch<ReportSummary>(`/api/reports/summary?${q.toString()}`)
    },
  },
}

// Helper formatters
export function fmtHours(h: number): string {
  const rounded = Math.round(h * 10) / 10
  return rounded.toFixed(rounded % 1 === 0 ? 0 : 1) + ' orë'
}

export function fmtNumber(h: number): string {
  const rounded = Math.round(h * 10) / 10
  return rounded.toFixed(rounded % 1 === 0 ? 0 : 1)
}

export function fmtMoney(n: number): string {
  return new Intl.NumberFormat('sq-XK', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

export function fmtDate(iso: string): string {
  // Parse date-only strings as local time to avoid UTC off-by-one
  const str = typeof iso === 'string' ? iso : String(iso)
  const d = str.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(str)
    ? new Date(str.slice(0, 10) + 'T00:00:00')
    : new Date(str)
  return d.toLocaleDateString('sq-AL', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function fmtDateShort(iso: string): string {
  const str = typeof iso === 'string' ? iso : String(iso)
  const d = str.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(str)
    ? new Date(str.slice(0, 10) + 'T00:00:00')
    : new Date(str)
  return d.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit' })
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('sq-AL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function toDateInput(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}
