'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useApp } from '@/store/app'
import { api } from '@/lib/api'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, FolderKanban } from 'lucide-react'
import type { Timesheet, TimesheetStatus } from '@/lib/types'
import { STATUS_LABELS } from '@/lib/types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: Timesheet | null
  presetProjectId?: string
  presetDate?: string
}

// Statuses that employees are allowed to set
const EMPLOYEE_STATUSES: TimesheetStatus[] = ['DRAFT', 'SUBMITTED']
const MANAGER_STATUSES: TimesheetStatus[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']

export function LogTimeDialog({ open, onOpenChange, editing, presetProjectId, presetDate }: Props) {
  const user = useApp(s => s.user)!
  const qc = useQueryClient()
  const isManager = user.role === 'MANAGER'

  // Always load projects when dialog opens
  const { data: allProjects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: api.projects.list,
    enabled: open,
  })

  // For employees: filter to only their assigned projects
  const projects = isManager
    ? allProjects
    : allProjects.filter(p => p.team.some(m => m.id === user.employeeId))

  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: api.employees.list,
    enabled: open && isManager,
  })

  const [projectId, setProjectId] = useState<string>(presetProjectId || '')
  const [employeeId, setEmployeeId] = useState<string>('')
  const [date, setDate] = useState(() => presetDate ?? new Date().toISOString().slice(0, 10))
  const [hours, setHours] = useState<string>('8')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TimesheetStatus>('DRAFT')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (editing) {
        setProjectId(editing.project.id)
        setEmployeeId(editing.employee.id)
        setDate(editing.date.slice(0, 10))
        setHours(String(editing.hours))
        setDescription(editing.description || '')
        setStatus(editing.status)
      } else {
        setProjectId(presetProjectId || '')
        setEmployeeId(user.employeeId || '')
        setDate(presetDate ?? new Date().toISOString().slice(0, 10))
        setHours('8')
        setDescription('')
        setStatus('DRAFT')
      }
    }
  }, [open, editing, presetProjectId, presetDate, user.employeeId])

  // Auto-select first project when list loads (if none selected and not editing)
  useEffect(() => {
    if (open && !editing && !projectId && projects.length > 0) {
      setProjectId(projects[0].id)
    }
  }, [open, editing, projectId, projects])

  // Auto-select employee for managers
  useEffect(() => {
    if (open && isManager && !editing && !employeeId && employees.length > 0) {
      const me = employees.find(e => e.id === user.employeeId)
      setEmployeeId(me ? me.id : employees[0].id)
    }
  }, [open, isManager, editing, employeeId, employees, user.employeeId])

  const save = async () => {
    const hrs = Number(hours)
    if (isNaN(hrs) || hrs < 0.25 || hrs > 24) {
      toast.error('Orët duhet të jenë mes 0.25 dhe 24')
      return
    }
    if (!projectId) {
      toast.error('Zgjidh projektin fillimisht')
      return
    }
    if (isManager && !employeeId) {
      toast.error('Zgjidh punëtorin fillimisht')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await api.timesheets.update(editing.id, {
          projectId,
          date,
          hours: hrs,
          description,
          status,
        })
        toast.success('Regjistrimi u përditësua')
      } else {
        await api.timesheets.create({
          projectId,
          employeeId: isManager ? employeeId : undefined,
          date,
          hours: hrs,
          description,
          status,
        })
        toast.success('Orët u regjistruan me sukses')
      }
      qc.invalidateQueries({ queryKey: ['timesheets'] })
      qc.invalidateQueries({ queryKey: ['reports'] })
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['employees'] })
      onOpenChange(false)
    } catch (e: any) {
      toast.error(e.message || 'Gabim gjatë ruajtjes')
    } finally {
      setSaving(false)
    }
  }

  const del = async () => {
    if (!editing) return
    if (!confirm('Fshi këtë regjistrim? Ky veprim nuk mund të kthehet.')) return
    setDeleting(true)
    try {
      await api.timesheets.delete(editing.id)
      toast.success('Regjistrimi u fshi')
      qc.invalidateQueries({ queryKey: ['timesheets'] })
      qc.invalidateQueries({ queryKey: ['reports'] })
      onOpenChange(false)
    } catch (e: any) {
      toast.error(e.message || 'Gabim')
    } finally {
      setDeleting(false)
    }
  }

  const noProjects = !projectsLoading && projects.length === 0
  const allowedStatuses = isManager ? MANAGER_STATUSES : EMPLOYEE_STATUSES
  const todayStr = new Date().toISOString().slice(0, 10)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edito regjistrimin' : 'Regjistro orë pune'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Përditëso ose fshi regjistrimin ekzistues.'
              : 'Shto orët e punës për një projekt të caktuar.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isManager && (
            <div className="space-y-2">
              <Label htmlFor="emp-select">Punëtori {!editing && <span className="text-destructive">*</span>}</Label>
              {employeesLoading ? (
                <Skeleton className="h-11 w-full" />
              ) : employees.length === 0 ? (
                <div className="text-sm text-muted-foreground p-3 rounded-md bg-muted/50 border border-dashed">
                  Asnjë punëtor në këtë tenant. Shto punëtorë nga seksioni "Punëtorët".
                </div>
              ) : (
                <Select value={employeeId} onValueChange={setEmployeeId}>
                  <SelectTrigger id="emp-select" className="h-11"><SelectValue placeholder="Zgjidh punëtorin" /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.fullName}{e.position ? ` · ${e.position}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="proj-select" className="flex items-center justify-between">
              <span>Projekti {!editing && <span className="text-destructive">*</span>}</span>
              {projects.length > 0 && (
                <span className="text-xs text-muted-foreground font-normal">
                  {projects.length} {projects.length === 1 ? 'projekt' : 'projekte'} të gatshme
                </span>
              )}
            </Label>
            {projectsLoading ? (
              <Skeleton className="h-11 w-full" />
            ) : noProjects ? (
              <div className="text-sm text-muted-foreground p-4 rounded-md bg-muted/50 border border-dashed text-center">
                <FolderKanban className="size-6 mx-auto mb-1.5 opacity-50" />
                {isManager
                  ? 'Asnjë projekt në këtë tenant. Krijo një projekt nga seksioni "Projektet".'
                  : 'Nuk je caktuar në asnjë projekt. Kontakto menaxherin.'}
              </div>
            ) : (
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger id="proj-select" className="h-11">
                  <SelectValue placeholder="Zgjidh projektin..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2 w-full">
                        <span className="size-2 rounded-full shrink-0" style={{ background: p.color }} />
                        <span className="truncate">{p.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                max={todayStr}
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours">Orët</Label>
              <Input
                id="hours"
                type="number"
                step="0.25"
                min="0.25"
                max="24"
                value={hours}
                onChange={e => setHours(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">Përshkrimi (opsionale)</Label>
            <Textarea
              id="desc"
              rows={3}
              maxLength={1000}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Çfarë u punua?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status-select">Statusi</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as TimesheetStatus)}>
              <SelectTrigger id="status-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                {allowedStatuses.map(s => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isManager && (
              <p className="text-xs text-muted-foreground">
                Si punëtor, mund të ruash si skicë ose ta dërgosh për aprovim.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {editing && (
            <Button variant="destructive" onClick={del} disabled={saving || deleting} className="mr-auto">
              {deleting ? 'Duke fshirë...' : 'Fshi'}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving || deleting}>
            Anulo
          </Button>
          <Button onClick={save} disabled={saving || deleting || noProjects}>
            {saving ? (
              <>
                <Loader2 className="size-4 mr-1.5 animate-spin" />
                Duke ruajtur...
              </>
            ) : 'Ruaj'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
