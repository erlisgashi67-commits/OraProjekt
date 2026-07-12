'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useApp } from '@/store/app'
import { api } from '@/lib/api'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Timesheet, TimesheetStatus } from '@/lib/types'
import { STATUS_LABELS } from '@/lib/types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  // If editing existing entry
  editing?: Timesheet | null
  // Pre-selected project (from "Log hours" on project card)
  presetProjectId?: string
  // Pre-selected date (YYYY-MM-DD)
  presetDate?: string
}

export function LogTimeDialog({ open, onOpenChange, editing, presetProjectId, presetDate }: Props) {
  const user = useApp(s => s.user)!
  const qc = useQueryClient()
  const isManager = user.role === 'MANAGER'

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: api.projects.list,
    enabled: open,
  })

  // Managers need employee list for assignment
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: api.employees.list,
    enabled: open && isManager,
  })

  const [projectId, setProjectId] = useState<string>(presetProjectId || '')
  const [employeeId, setEmployeeId] = useState<string>('')
  const [date, setDate] = useState(presetDate || new Date().toISOString().slice(0, 10))
  const [hours, setHours] = useState<string>('8')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TimesheetStatus>('DRAFT')
  const [saving, setSaving] = useState(false)

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
        setDate(presetDate || new Date().toISOString().slice(0, 10))
        setHours('8')
        setDescription('')
        setStatus('DRAFT')
      }
    }
  }, [open, editing, presetProjectId, presetDate, user.employeeId])

  const save = async () => {
    const hrs = Number(hours)
    if (!hrs || hrs <= 0 || hrs > 24) {
      toast.error('Orët duhet të jenë mes 0 dhe 24')
      return
    }
    if (!projectId) {
      toast.error('Zgjidh projektit')
      return
    }
    if (isManager && !employeeId) {
      toast.error('Zgjidh punetorin')
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
        toast.success('Orët u regjistruan')
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
    setSaving(true)
    try {
      await api.timesheets.delete(editing.id)
      toast.success('Regjistrimi u fshi')
      qc.invalidateQueries({ queryKey: ['timesheets'] })
      qc.invalidateQueries({ queryKey: ['reports'] })
      onOpenChange(false)
    } catch (e: any) {
      toast.error(e.message || 'Gabim')
    } finally {
      setSaving(false)
    }
  }

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
              <Label>Punetori</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger><SelectValue placeholder="Zgjidh punetorin" /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.fullName} {e.position ? `· ${e.position}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Projekti</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder="Zgjidh projektin" /></SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ background: p.color }} />
                      {p.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours">Orët</Label>
              <Input id="hours" type="number" step="0.25" min="0.25" max="24" value={hours} onChange={e => setHours(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">Përshkrimi (opsionale)</Label>
            <Textarea
              id="desc"
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Çfarë u punua?"
            />
          </div>

          <div className="space-y-2">
            <Label>Statusi</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as TimesheetStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABELS) as TimesheetStatus[]).map(s => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {editing && (
            <Button variant="destructive" onClick={del} disabled={saving} className="mr-auto">
              Fshi
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Anulo
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Duke ruajtur...' : 'Ruaj'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
