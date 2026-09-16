import type { ReactNode } from 'react'
import { UsersRound } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { Person, PersonRole, UserAccount } from '../types'

type Props = {
  role: PersonRole
  personId: number
  people: {
    teachers: Person[]
    sales: Person[]
    cs: Person[]
  }
  currentUser?: UserAccount | null
  onChange: (role: PersonRole, personId: number) => void
  children?: ReactNode
}

const roleLabels: Record<PersonRole, string> = {
  teacher: '👨‍🏫 Giảng Viên',
  sales: '💼 Sales',
  cs: '🎧 CSKH',
  admin: '👑 Admin',
}

const personSelectLabels: Record<PersonRole, string> = {
  teacher: 'Giảng viên:',
  sales: 'Nhân viên Sales:',
  cs: 'Nhân viên CS:',
  admin: '',
}

export function RolePersonSelector({ role, personId, people, currentUser, onChange, children }: Props) {
  const options = peopleForRole(role, people)

  const isPureAdmin = Boolean(
    currentUser?.isPureAdmin ??
    (!currentUser || (currentUser.rolesList?.length === 1 && currentUser.rolesList[0] === 'admin'))
  )

  const permittedRoles: PersonRole[] = useMemo(() => {
    if (!currentUser) {
      return ['teacher', 'sales', 'cs', 'admin']
    }
    const list = (currentUser.rolesList || [currentUser.roles] || ['teacher']).map((r) => r.toLowerCase().trim())
    if (list.length === 1 && list[0] === 'admin') {
      return ['admin', 'teacher', 'sales', 'cs']
    }
    const validRoles: PersonRole[] = ['teacher', 'sales', 'cs', 'admin']
    const result: PersonRole[] = []
    list.forEach((r) => {
      if (validRoles.includes(r as PersonRole) && !result.includes(r as PersonRole)) {
        result.push(r as PersonRole)
      }
    })
    return result.length > 0 ? result : ['teacher']
  }, [currentUser])

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 w-full min-h-[40px]">
      {/* 1. Vai trò */}
      <div className="flex items-center gap-2 shrink-0">
        <UsersRound className="size-4 text-emerald-700 shrink-0" />
        <span className="text-xs font-bold text-slate-500 hidden xl:inline whitespace-nowrap">
          Vai trò:
        </span>
        {permittedRoles.length > 1 ? (
          <div className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1 text-xs font-bold shrink-0 border border-slate-200/60">
            {permittedRoles.map((nextRole) => (
              <Button
                key={nextRole}
                type="button"
                size="xs"
                variant={role === nextRole ? 'default' : 'ghost'}
                onClick={() => onChange(nextRole, firstPersonId(nextRole, people, currentUser))}
                className={cn(
                  'h-8 rounded-xl px-3 text-xs font-bold transition-all shrink-0 cursor-pointer',
                  role === nextRole
                    ? nextRole === 'admin'
                      ? 'bg-slate-900 text-white shadow-xs font-black hover:bg-slate-950'
                      : 'bg-emerald-700 text-white shadow-xs font-black hover:bg-emerald-800'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                )}
              >
                {roleLabels[nextRole]}
              </Button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80 px-3 py-1 text-xs font-black text-emerald-900 shadow-2xs">
            {roleLabels[role] || '👨‍🏫 Giảng Viên'}
          </div>
        )}
      </div>

      {/* 2. Thanh chức năng (Đăng ký lịch - Lịch dạy - Học viên - Dashboard) */}
      {children && (
        <div className="flex items-center justify-center shrink-0">
          {children}
        </div>
      )}

      {/* 3. Chọn tên (chỉ hiển thị cho Admin cần xem/chọn người khác) */}
      {role !== 'admin' ? (
        isPureAdmin ? (
          <div className="flex items-center justify-end shrink-0 min-h-[36px]">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 h-9 text-xs font-bold text-slate-600 shadow-2xs">
              <span className="whitespace-nowrap font-medium text-slate-500">{personSelectLabels[role]}</span>
              <Select
                value={String(personId)}
                onValueChange={(value) => onChange(role, Number(value))}
              >
                <SelectTrigger
                  aria-label={personSelectLabels[role]}
                  className="h-7 w-36 sm:w-44 rounded-xl border border-slate-200/80 bg-white font-black text-emerald-800 text-xs shadow-2xs focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" className="rounded-xl text-xs max-h-56 z-50 bg-white shadow-md border border-slate-200">
                  <SelectGroup>
                    {options.map((person) => (
                      <SelectItem key={person.id} value={String(person.id)} className="text-xs font-bold py-1.5 cursor-pointer">
                        {person.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : null
      ) : (
        <div className="flex items-center justify-end shrink-0 min-h-[36px]">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 h-9 text-xs font-bold text-slate-700 shadow-2xs">
            <span className="inline-block size-2 rounded-full bg-emerald-500" />
            <span>👑 Quyền quản trị: Toàn bộ trung tâm</span>
          </div>
        </div>
      )}
    </div>
  )
}

function peopleForRole(role: PersonRole, people: Props['people']) {
  if (role === 'admin') return []
  return role === 'teacher' ? people.teachers : role === 'sales' ? people.sales : people.cs
}

function firstPersonId(role: PersonRole, people: Props['people'], currentUser?: UserAccount | null) {
  if (role === 'admin') return 0
  const isPureAdmin = Boolean(
    currentUser?.isPureAdmin ??
    (!currentUser || (currentUser.rolesList?.length === 1 && currentUser.rolesList[0] === 'admin'))
  )
  if (currentUser && !isPureAdmin) {
    const rolePeople = peopleForRole(role, people)
    if (currentUser.personId) {
      const matchById = rolePeople.find((p) => p.id === currentUser.personId)
      if (matchById) return matchById.id
    }
    const currentName = (currentUser.personName || currentUser.name || '').trim().toLowerCase()
    if (currentName) {
      const matchByName = rolePeople.find((p) => p.name.trim().toLowerCase() === currentName)
      if (matchByName) return matchByName.id
    }
    if (currentUser.personId) return currentUser.personId
  }
  return peopleForRole(role, people)[0]?.id ?? 0
}
