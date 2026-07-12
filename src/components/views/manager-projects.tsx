'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, fmtNumber, fmtDate } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Plus, Search, MoreVertical, Pencil, Trash2, UserPlus, UserX, FolderKanban,
} from 'lucide-react'
import { PROJECT_STATUS_LABELS, PROJECT_COLORS, type Project, type ProjectStatus } from '@/lib/types'
import { useApp } from '@/store/app'
import { toast } from 'sonner'

const STATUS_BADGE: Record<ProjectStatus, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  ON_HOLD: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  COMPLETED: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/30',
}

export function ManagerProjects() {
  const qc = useQueryClient()
  const setLogDialog = useApp(s => s.setLogDialog)
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: api.projects.list,
  })

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>('ALL')
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const filtered = projects.filter(p => {
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const del = async (p: Project) => {
    if (!confirm(`Fshi projektin "${p.name}? Regjistrimet e orëve do të fshien gjithashtu.`)) return
    try {
      await api.projects.delete(p.id)
      qc.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Projekti u fshi')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  if (isLoading) {
    return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[0,1,2,3,4,5].map(i => <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />)}
    </div>
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Kërko projekte..."
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-32 sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Të gjitha</SelectItem>
              <SelectItem value="ACTIVE">Aktive</SelectItem>
              <SelectItem value="ON_HOLD">Në pritje</SelectItem>
              <SelectItem value="COMPLETED">Përfunduar</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="size-4" /> Projekt i ri
        </Button>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FolderKanban className="size-10 mx-auto text-muted-foreground/50" />
            <div className="mt-3 font-medium">Asnjë projekt</div>
            <div className="text-sm text-muted-foreground mt-1">
              {search || statusFilter !== 'ALL' ? 'Provo të ndryshosh filtrat.' : 'Krijo projektin e parë.'}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(p => {
            const pct = p.budgetHours ? Math.min(100, (p.loggedHours / p.budgetHours) * 100) : 0
            return (
              <Card key={p.id} className="flex flex-col hover:shadow-md transition-shadow">
                <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="size-10 rounded-lg shrink-0 flex items-center justify-center text-white font-bold text-sm" style={{ background: p.color }}>
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base leading-tight truncate">{p.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${STATUS_BADGE[p.status]}`}>
                          {PROJECT_STATUS_LABELS[p.status]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{p.team.length} anëtarë</span>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8 shrink-0">
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setLogDialog(true, p.id)}>
                        <Plus className="size-4" /> Regjistro orë
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditProject(p)}>
                        <Pencil className="size-4" /> Edito
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => del(p)}>
                        <Trash2 className="size-4" /> Fshi
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3">
                  {p.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                  )}

                  {p.budgetHours && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Buxheti</span>
                        <span className="font-medium tabular-nums">
                          {fmtNumber(p.loggedHours)} / {fmtNumber(p.budgetHours)} orë
                        </span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  )}

                  {!p.budgetHours && (
                    <div className="text-sm">
                      <span className="font-semibold tabular-nums">{fmtNumber(p.loggedHours)}</span>
                      <span className="text-muted-foreground"> orë të regjistruara</span>
                    </div>
                  )}

                  {/* Team */}
                  <div className="flex items-center gap-1 flex-wrap mt-auto">
                    {p.team.slice(0, 4).map(m => (
                      <div
                        key={m.id}
                        title={`${m.name}${m.role ? ` · ${m.role}` : ''}`}
                        className="size-7 rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center border-2 border-background"
                      >
                        {m.name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()}
                      </div>
                    ))}
                    {p.team.length > 4 && (
                      <div className="size-7 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold flex items-center justify-center border-2 border-background">
                        +{p.team.length - 4}
                      </div>
                    )}
                    {p.team.length === 0 && (
                      <span className="text-xs text-muted-foreground">Asnjë anëtarë</span>
                    )}
                  </div>

                  {(p.startDate || p.endDate) && (
                    <div className="text-[11px] text-muted-foreground pt-2 border-t">
                      {p.startDate && fmtDate(p.startDate)}
                      {p.startDate && p.endDate && ' → '}
                      {p.endDate && fmtDate(p.endDate)}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Edit / Create dialog */}
      {editProject && (
        <ProjectFormDialog
          open={true}
          onOpenChange={(o) => !o && setEditProject(null)}
          project={editProject}
        />
      )}
      {createOpen && (
        <ProjectFormDialog
          open={true}
          onOpenChange={setCreateOpen}
        />
      )}
    </div>
  )
}

function ProjectFormDialog({
  open,
  onOpenChange,
  project,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  project?: Project | null
}) {
  const qc = useQueryClient()
  const [name, setName] = useState(project?.name || '')
  const [description, setDescription] = useState(project?.description || '')
  const [status, setStatus] = useState<ProjectStatus>(project?.status || 'ACTIVE')
  const [budgetHours, setBudgetHours] = useState<string>(project?.budgetHours ? String(project.budgetHours) : '')
  const [startDate, setStartDate] = useState(project?.startDate ? project.startDate.slice(0,10) : '')
  const [endDate, setEndDate] = useState(project?.endDate ? project.endDate.slice(0,10) : '')
  const [color, setColor] = useState(project?.color || PROJECT_COLORS[0])
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim()) {
      toast.error('Emri kërkohet')
      return
    }
    setSaving(true)
    try {
      const body = {
        name: name.trim(),
        description: description.trim() || undefined,
        status,
        budgetHours: budgetHours ? Number(budgetHours) : null,
        startDate: startDate || null,
        endDate: endDate || null,
        color,
      }
      if (project) {
        await api.projects.update(project.id, body)
        toast.success('Projekti u përditësua')
      } else {
        await api.projects.create(body)
        toast.success('Projekti u krijua')
      }
      qc.invalidateQueries({ queryKey: ['projects'] })
      onOpenChange(false)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{project ? 'Edito projektin' : 'Projekt i ri'}</DialogTitle>
          <DialogDescription>
            {project ? 'Përditëso detajet e projektit.' : 'Krijo projekt të ri brenda këtij tenant-i.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Emri i projektit *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="p.sh. Rindërtimi i faqes" />
          </div>
          <div className="space-y-2">
            <Label>Përshkrimi</Label>
            <Textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Përshkrim i shkurtër..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Statusi</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Aktiv</SelectItem>
                  <SelectItem value="ON_HOLD">Në pritje</SelectItem>
                  <SelectItem value="COMPLETED">Përfunduar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Buxheti (orë)</Label>
              <Input type="number" min="0" value={budgetHours} onChange={e => setBudgetHours(e.target.value)} placeholder="320" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data fillimit</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data mbarimit</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Ngjyra</Label>
            <div className="flex gap-2 flex-wrap">
              {PROJECT_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`size-8 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-ring scale-110' : 'hover:scale-110'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Anulo</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Duke ruajtur...' : 'Ruaj'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
