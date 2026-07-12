'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, fmtHours, fmtDate } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Check, X, Pencil, Search, CalendarClock, Filter } from 'lucide-react'
import { LogTimeDialog } from '@/components/log-time-dialog'
import { STATUS_LABELS as STATUS, type Timesheet, type TimesheetStatus } from '@/lib/types'
import { toast } from 'sonner'

const STATUS_COLORS: Record<TimesheetStatus, string> = {
  DRAFT: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/30',
  SUBMITTED: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  APPROVED: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  REJECTED: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
}

export function ManagerTimesheets() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TimesheetStatus | 'ALL'>('ALL')
  const [projectFilter, setProjectFilter] = useState<string>('ALL')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [edit, setEdit] = useState<Timesheet | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: api.projects.list,
  })

  const { data: timesheets = [], isLoading } = useQuery({
    queryKey: ['timesheets', 'manager', statusFilter, projectFilter, from, to],
    queryFn: () => api.timesheets.list({
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      projectId: projectFilter === 'ALL' ? undefined : projectFilter,
      from: from || undefined,
      to: to || undefined,
      limit: 500,
    }),
  })

  const filtered = search
    ? timesheets.filter(t =>
        t.employee.name.toLowerCase().includes(search.toLowerCase()) ||
        t.project.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.description || '').toLowerCase().includes(search.toLowerCase())
      )
    : timesheets

  const setStatus = async (t: Timesheet, status: TimesheetStatus) => {
    try {
      await api.timesheets.setStatus(t.id, status)
      qc.invalidateQueries({ queryKey: ['timesheets'] })
      qc.invalidateQueries({ queryKey: ['reports'] })
      toast.success(`Regjistrimi u ${status === 'APPROVED' ? 'aprovua' : 'refuzua'}`)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const totalHours = filtered.reduce((sum, t) => sum + t.hours, 0)
  const totalCost = filtered.reduce((sum, t) => sum + t.cost, 0)
  const pending = filtered.filter(t => t.status === 'SUBMITTED').length

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Kërko sipas punetorit, projektit, përshkrimit..."
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Statusi" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Të gjitha statuset</SelectItem>
                  <SelectItem value="DRAFT">Skicë</SelectItem>
                  <SelectItem value="SUBMITTED">Dërguar</SelectItem>
                  <SelectItem value="APPROVED">Aprovuar</SelectItem>
                  <SelectItem value="REJECTED">Refuzuar</SelectItem>
                </SelectContent>
              </Select>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Projekti" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Të gjitha projektet</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 items-center">
              <CalendarClock className="size-4 text-muted-foreground" />
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-auto" />
              <span className="text-muted-foreground text-sm">→</span>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-auto" />
              {(from || to) && (
                <Button variant="ghost" size="sm" onClick={() => { setFrom(''); setTo('') }}>Pastro</Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="text-[10px] text-muted-foreground uppercase">Regjistrime</div>
            <div className="text-xl font-bold">{filtered.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-[10px] text-muted-foreground uppercase">Total orë</div>
            <div className="text-xl font-bold tabular-nums">{fmtHours(totalHours)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-[10px] text-muted-foreground uppercase">Për aprovim</div>
            <div className="text-xl font-bold tabular-nums text-amber-600">{pending}</div>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-2">
              {[0,1,2,3,4,5].map(i => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Filter className="size-10 mx-auto text-muted-foreground/50" />
              <div className="mt-3 font-medium">Asnjë regjistrim</div>
              <div className="text-sm text-muted-foreground mt-1">Provo të ndryshosh filtrat.</div>
            </div>
          ) : (
            <div className="divide-y max-h-[60vh] overflow-y-auto scrollbar-thin">
              {filtered.map(t => (
                <div key={t.id} className="flex items-start gap-3 p-3 hover:bg-accent/30 transition-colors">
                  <div className="size-2.5 rounded-full mt-2 shrink-0" style={{ background: t.project.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{t.employee.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {t.project.name} · {fmtDate(t.date)}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-semibold tabular-nums text-sm">{fmtHours(t.hours)}</div>
                        <div className="text-[10px] text-muted-foreground">{t.employee.hourlyRate.toFixed(0)} €/h</div>
                      </div>
                    </div>
                    {t.description && (
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</div>
                    )}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[t.status]}`}>
                        {STATUS[t.status]}
                      </Badge>
                      {t.status === 'SUBMITTED' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[11px] gap-1 px-2 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                            onClick={() => setStatus(t, 'APPROVED')}
                          >
                            <Check className="size-3" /> Aprovo
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[11px] gap-1 px-2 text-rose-600 border-rose-500/30 hover:bg-rose-500/10"
                            onClick={() => setStatus(t, 'REJECTED')}
                          >
                            <X className="size-3" /> Refuzo
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[11px] gap-1 px-2 ml-auto"
                        onClick={() => { setEdit(t); setDialogOpen(true) }}
                      >
                        <Pencil className="size-3" /> Edito
                      </Button>
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
