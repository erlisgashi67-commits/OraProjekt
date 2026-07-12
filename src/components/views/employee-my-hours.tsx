'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, fmtHours, fmtNumber, fmtDate, fmtDateShort } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Pencil, Search, CalendarDays, Clock, TrendingUp, AlertCircle } from 'lucide-react'
import { LogTimeDialog } from '@/components/log-time-dialog'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { useApp } from '@/store/app'
import { STATUS_LABELS as STATUS, type Timesheet, type TimesheetStatus } from '@/lib/types'

const STATUS_COLORS: Record<TimesheetStatus, string> = {
  DRAFT: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/30',
  SUBMITTED: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  APPROVED: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  REJECTED: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
}

export function EmployeeMyHours() {
  const user = useApp(s => s.user)
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TimesheetStatus | 'ALL'>('ALL')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [edit, setEdit] = useState<Timesheet | null>(null)

  const { data: timesheets = [], isLoading } = useQuery({
    queryKey: ['timesheets', 'me', statusFilter, from, to],
    queryFn: () => api.timesheets.list({
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      from: from || undefined,
      to: to || undefined,
      limit: 500,
    }),
  })

  // Defensive: if user becomes null mid-render, render nothing
  if (!user) return null

  const filtered = search
    ? timesheets.filter(t =>
        (t.project?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (t.description || '').toLowerCase().includes(search.toLowerCase())
      )
    : timesheets

  const thisWeek = (() => {
    const now = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    monday.setHours(0, 0, 0, 0)
    return timesheets
      .filter(t => new Date(t.date) >= monday)
      .reduce((sum, t) => sum + t.hours, 0)
  })()

  const pendingCount = timesheets.filter(t => t.status === 'DRAFT').length
  const totalHours = timesheets.reduce((s, t) => s + t.hours, 0)

  // Group by date for chart
  const byDateMap = new Map<string, number>()
  for (const t of timesheets) {
    const d = t.date.slice(0, 10)
    byDateMap.set(d, (byDateMap.get(d) || 0) + t.hours)
  }
  const chartData = Array.from(byDateMap.entries())
    .map(([date, hours]) => ({ date, hours }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div>
        <h2 className="text-xl font-bold">Përshëndetje, {(user.name || '').split(' ')[0] || '👤'} 👋</h2>
        <p className="text-sm text-muted-foreground">Këtu janë orët e tua të punës.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Këtë javë</div>
                <div className="text-2xl font-bold tabular-nums mt-0.5">{fmtNumber(thisWeek)}</div>
                <div className="text-[11px] text-muted-foreground">orë</div>
              </div>
              <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Clock className="size-4" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="text-2xl font-bold tabular-nums mt-0.5">{fmtNumber(totalHours)}</div>
                <div className="text-[11px] text-muted-foreground">orë</div>
              </div>
              <div className="size-8 rounded-lg bg-violet-500/10 text-violet-600 flex items-center justify-center">
                <TrendingUp className="size-4" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Në skicë</div>
                <div className="text-2xl font-bold tabular-nums mt-0.5">{pendingCount}</div>
                <div className="text-[11px] text-muted-foreground">regjistrime</div>
              </div>
              <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <AlertCircle className="size-4" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Projektet</div>
                <div className="text-2xl font-bold tabular-nums mt-0.5">
                  {new Set(timesheets.map(t => t.project.id)).size}
                </div>
                <div className="text-[11px] text-muted-foreground">aktive</div>
              </div>
              <div className="size-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <CalendarDays className="size-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Orët ditore — 14 ditët e fundit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="empGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    labelFormatter={(l) => fmtDateShort(l as string)}
                    formatter={(v: any) => [fmtHours(v as number), 'Orë']}
                  />
                  <Area type="monotone" dataKey="hours" stroke="#10b981" strokeWidth={2} fill="url(#empGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Kërko sipas projektit ose përshkrimit..."
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Të gjitha</SelectItem>
                <SelectItem value="DRAFT">Skicë</SelectItem>
                <SelectItem value="SUBMITTED">Dërguar</SelectItem>
                <SelectItem value="APPROVED">Aprovuar</SelectItem>
                <SelectItem value="REJECTED">Refuzuar</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-auto" />
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-auto" />
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-2">
              {[0,1,2,3].map(i => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <CalendarDays className="size-10 mx-auto text-muted-foreground/50" />
              <div className="mt-3 font-medium">Asnjë regjistrim</div>
              <div className="text-sm text-muted-foreground mt-1">
                Përdor butonin "+" për të regjistruar orët e punës.
              </div>
              <Button className="mt-4 gap-1.5" onClick={() => { setEdit(null); setDialogOpen(true) }}>
                <Plus className="size-4" /> Regjistro orë
              </Button>
            </div>
          ) : (
            <div className="divide-y max-h-[60vh] overflow-y-auto scrollbar-thin">
              {filtered.map(t => (
                <div key={t.id} className="flex items-start gap-3 p-3 hover:bg-accent/30 transition-colors">
                  <div className="size-10 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: t.project.color }}>
                    {t.project.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{t.project.name}</div>
                        <div className="text-xs text-muted-foreground">{fmtDate(t.date)}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-semibold tabular-nums text-sm">{fmtHours(t.hours)}</div>
                      </div>
                    </div>
                    {t.description && (
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</div>
                    )}
                    <div className="flex items-center gap-1.5 mt-2">
                      <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[t.status]}`}>
                        {STATUS[t.status]}
                      </Badge>
                      {t.status === 'REJECTED' && (
                        <span className="text-[10px] text-rose-600">Kontakto menaxherin</span>
                      )}
                      {(t.status === 'DRAFT' || t.status === 'REJECTED') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[11px] gap-1 px-2 ml-auto"
                          onClick={() => { setEdit(t); setDialogOpen(true) }}
                        >
                          <Pencil className="size-3" /> Edito
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <LogTimeDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) setEdit(null) }}
        editing={edit}
      />
    </div>
  )
}
