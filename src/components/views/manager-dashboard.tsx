'use client'

import { useQuery } from '@tanstack/react-query'
import { api, fmtHours, fmtNumber, fmtDateShort } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Clock, Users, FolderKanban, AlertCircle, TrendingUp, CalendarDays } from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
} from 'recharts'
import { useApp } from '@/store/app'
import { useState } from 'react'
import { STATUS_LABELS } from '@/lib/types'

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#94a3b8',
  SUBMITTED: '#f59e0b',
  APPROVED: '#10b981',
  REJECTED: '#ef4444',
}

const RANGES = [
  { id: '7', label: '7 ditë', days: 7 },
  { id: '30', label: '30 ditë', days: 30 },
  { id: '90', label: '90 ditë', days: 90 },
]

export function ManagerDashboard() {
  const [rangeId, setRangeId] = useState('30')
  const range = RANGES.find(r => r.id === rangeId)!
  const from = new Date()
  from.setDate(from.getDate() - range.days)
  const fromStr = from.toISOString().slice(0, 10)

  const { data: report, isLoading } = useQuery({
    queryKey: ['reports', 'summary', fromStr],
    queryFn: () => api.reports.summary({ from: fromStr }),
  })

  const { data: timesheets = [] } = useQuery({
    queryKey: ['timesheets', 'recent', fromStr],
    queryFn: () => api.timesheets.list({ from: fromStr, limit: 10 }),
  })

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: api.projects.list,
  })

  const setView = useApp(s => s.setView)

  if (isLoading || !report) {
    return <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[0,1,2,3].map(i => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}
    </div>
  }

  const s = report.summary
  const byStatusData = (Object.keys(report.byStatus) as (keyof typeof report.byStatus)[]).map(k => ({
    name: STATUS_LABELS[k],
    key: k,
    value: report.byStatus[k].hours,
    count: report.byStatus[k].count,
    color: STATUS_COLORS[k],
  })).filter(d => d.value > 0)

  const topProjects = report.byProject.slice(0, 5)
  const topEmployees = report.byEmployee.slice(0, 5)

  return (
    <div className="space-y-5">
      {/* Range selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Paneli i Menaxherit</h2>
          <p className="text-sm text-muted-foreground">Përmbledhje për {range.label} të fundit</p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
          {RANGES.map(r => (
            <button
              key={r.id}
              onClick={() => setRangeId(r.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                rangeId === r.id ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={Clock}
          label="Total Orë"
          value={fmtNumber(s.totalHours)}
          sub={`${s.totalEntries} regjistrime`}
          color="emerald"
        />
        <KpiCard
          icon={FolderKanban}
          label="Projekte Aktive"
          value={String(s.activeProjects)}
          sub={`nga ${projects.length} total`}
          color="amber"
        />
        <KpiCard
          icon={Users}
          label="Punetorë"
          value={String(s.totalEmployees)}
          sub="në këtë tenant"
          color="violet"
        />
        <KpiCard
          icon={AlertCircle}
          label="Për Aprovim"
          value={String(s.pendingApprovals)}
          sub="regjistrime dërguar"
          color="rose"
          onClick={() => setView('timesheets')}
        />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Time series */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="size-4" /> Orët në kohë — ditore
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={report.byDate} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={fmtDateShort}
                    className="text-xs"
                    tick={{ fontSize: 11 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    labelFormatter={(l) => fmtDateShort(l as string)}
                    formatter={(v: any) => [fmtHours(v as number), 'Orë']}
                  />
                  <Area type="monotone" dataKey="hours" stroke="#10b981" strokeWidth={2} fill="url(#hGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Statusi i regjistrimeve</CardTitle>
          </CardHeader>
          <CardContent>
            {byStatusData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                Asnjë regjistrim
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byStatusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {byStatusData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                      formatter={(v: any, n: any, p: any) => [`${fmtHours(v as number)} (${p.payload.count} regjistrime)`, n]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              {byStatusData.map(d => (
                <div key={d.key} className="flex items-center gap-1.5 text-xs">
                  <span className="size-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="font-semibold ml-auto">{fmtNumber(d.value)}h</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top projects + employees */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Top projekte sipas orëve</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setView('projects')}>
              Shiko të gjitha →
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {topProjects.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">Asnjë projekt</div>
            ) : topProjects.map(p => {
              const pct = p.budgetHours ? Math.min(100, (p.hours / p.budgetHours) * 100) : 0
              return (
                <div key={p.projectId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="size-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                      <span className="font-medium truncate">{p.name}</span>
                    </div>
                    <span className="font-semibold tabular-nums">
                      {fmtNumber(p.hours)}h
                      {p.budgetHours ? ` / ${fmtNumber(p.budgetHours)}h` : ''}
                    </span>
                  </div>
                  {p.budgetHours && (
                    <Progress value={pct} className="h-1.5" />
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Top punetorë sipas orëve</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setView('employees')}>
              Shiko të gjitha →
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {topEmployees.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">Asnjë punetor</div>
            ) : topEmployees.map(e => {
              const max = topEmployees[0]?.hours || 1
              const pct = (e.hours / max) * 100
              return (
                <div key={e.employeeId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{e.name}</div>
                      {e.position && <div className="text-xs text-muted-foreground truncate">{e.position}</div>}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold tabular-nums">{fmtNumber(e.hours)}h</div>
                      <div className="text-xs text-muted-foreground">{e.entries} regjistrime</div>
                    </div>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Recent timesheets */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarDays className="size-4" /> Regjistrimet e fundit
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setView('timesheets')}>
            Shiko të gjitha →
          </Button>
        </CardHeader>
        <CardContent>
          {timesheets.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">Asnjë regjistrim</div>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto scrollbar-thin">
              {timesheets.slice(0, 10).map(t => (
                <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="size-2 rounded-full shrink-0" style={{ background: t.project.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{t.employee.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {t.project.name} · {fmtDateShort(t.date)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold tabular-nums">{fmtNumber(t.hours)}h</div>
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 mt-0.5" style={{ color: STATUS_COLORS[t.status], borderColor: STATUS_COLORS[t.status] }}>
                      {STATUS_LABELS[t.status]}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  onClick,
}: {
  icon: any
  label: string
  value: string
  sub: string
  color: 'emerald' | 'amber' | 'violet' | 'rose'
  onClick?: () => void
}) {
  const colors = {
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  }
  return (
    <Card
      onClick={onClick}
      className={`${onClick ? 'cursor-pointer hover:border-primary/40 transition-colors' : ''}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground font-medium">{label}</div>
            <div className="text-2xl lg:text-3xl font-bold mt-1 tabular-nums">{value}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>
          </div>
          <div className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${colors[color]}`}>
            <Icon className="size-4.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
