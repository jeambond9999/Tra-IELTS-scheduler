import { router } from '@inertiajs/react'
import { Check, Edit, KeyRound, Lock, Plus, ShieldCheck, Trash2, UserCheck, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { Person, UserAccount } from '../types'

type Props = {
  users?: UserAccount[]
  currentUser?: UserAccount | null
  people: {
    teachers: Person[]
    sales: Person[]
    cs: Person[]
  }
}

const AVAILABLE_ROLES = [
  { key: 'teacher', label: '👨‍🏫 Giảng Viên', desc: 'Xem lịch dạy, ca rảnh và phiếu lương của mình' },
  { key: 'sales', label: '💼 Sales', desc: 'Quản lý học viên, ca demo và KPI sales' },
  { key: 'cs', label: '🎧 CSKH', desc: 'Quản lý lịch học, form CS và nhắc bảo lưu' },
  { key: 'admin', label: '👑 Admin', desc: 'Toàn quyền quản trị, bảng lương và hệ thống' },
]

export function UserManagement({ users = [], currentUser, people }: Props) {
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserAccount | null>(null)
  const [passwordUser, setPasswordUser] = useState<UserAccount | null>(null)
  const [deleteUser, setDeleteUser] = useState<UserAccount | null>(null)

  // Form states for Create
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('TraIELTS@123')
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['teacher'])
  const [personId, setPersonId] = useState<string>('none')
  const [loading, setLoading] = useState(false)

  // Form states for Edit
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRoles, setEditRoles] = useState<string[]>([])
  const [editPersonId, setEditPersonId] = useState<string>('none')

  // Form state for Password
  const [newPassword, setNewPassword] = useState('')

  const allPeople = [
    ...people.teachers.map((p) => ({ ...p, roleLabel: 'Giáo viên' })),
    ...people.sales.map((p) => ({ ...p, roleLabel: 'Sales' })),
    ...people.cs.map((p) => ({ ...p, roleLabel: 'CSKH' })),
  ]

  const handleRoleToggle = (roleKey: string, current: string[], setter: (v: string[]) => void) => {
    if (current.includes(roleKey)) {
      if (current.length === 1) {
        toast.error('Tài khoản phải có ít nhất 1 vai trò!')
        return
      }
      setter(current.filter((r) => r !== roleKey))
    } else {
      setter([...current, roleKey])
    }
  }

  const openCreateDialog = () => {
    setName('')
    setEmail('')
    setPassword('TraIELTS@123')
    setSelectedRoles(['teacher'])
    setPersonId('none')
    setCreateOpen(true)
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error('Vui lòng nhập Email!')
      return
    }
    if (!password.trim()) {
      toast.error('Vui lòng nhập Mật khẩu!')
      return
    }
    if (selectedRoles.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 vai trò!')
      return
    }

    setLoading(true)
    router.post(
      '/admin/users',
      {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        roles: selectedRoles,
        person_id: personId === 'none' ? null : Number(personId),
      },
      {
        onSuccess: () => {
          toast.success('Đã thêm tài khoản mới thành công!')
          setCreateOpen(false)
        },
        onError: (errors) => {
          toast.error(Object.values(errors).flat().join(', ') || 'Lỗi khi tạo tài khoản!')
        },
        onFinish: () => setLoading(false),
      }
    )
  }

  const openEditDialog = (user: UserAccount) => {
    setEditUser(user)
    setEditName(user.name || '')
    setEditEmail(user.email || '')
    setEditRoles(user.rolesList || [user.roles] || ['teacher'])
    setEditPersonId(user.personId ? String(user.personId) : 'none')
  }

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editUser) return

    setLoading(true)
    router.patch(
      `/admin/users/${editUser.id}`,
      {
        name: editName.trim(),
        email: editEmail.trim().toLowerCase(),
        roles: editRoles,
        person_id: editPersonId === 'none' ? null : Number(editPersonId),
      },
      {
        onSuccess: () => {
          toast.success(`Đã cập nhật thông tin cho ${editEmail}!`)
          setEditUser(null)
        },
        onError: (errors) => {
          toast.error(Object.values(errors).flat().join(', ') || 'Lỗi khi cập nhật tài khoản!')
        },
        onFinish: () => setLoading(false),
      }
    )
  }

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordUser) return
    if (!newPassword.trim()) {
      toast.error('Vui lòng nhập mật khẩu mới!')
      return
    }

    setLoading(true)
    router.patch(
      `/admin/users/${passwordUser.id}`,
      {
        password: newPassword.trim(),
      },
      {
        onSuccess: () => {
          toast.success(`Đã đổi mật khẩu cho ${passwordUser.email} thành công!`)
          setPasswordUser(null)
          setNewPassword('')
        },
        onError: (errors) => {
          toast.error(Object.values(errors).flat().join(', ') || 'Lỗi khi đổi mật khẩu!')
        },
        onFinish: () => setLoading(false),
      }
    )
  }

  const handleDelete = () => {
    if (!deleteUser) return

    setLoading(true)
    router.delete(`/admin/users/${deleteUser.id}`, {
      onSuccess: () => {
        toast.success(`Đã xóa tài khoản ${deleteUser.email}!`)
        setDeleteUser(null)
      },
      onError: (errors) => {
        toast.error(Object.values(errors).flat().join(', ') || 'Lỗi khi xóa tài khoản!')
      },
      onFinish: () => setLoading(false),
    })
  }

  const renderRoleBadges = (rolesList: string[]) => {
    return (
      <div className="flex flex-wrap gap-1">
        {rolesList.map((r) => {
          switch (r.toLowerCase()) {
            case 'admin':
              return (
                <Badge
                  key={r}
                  className="bg-slate-900 hover:bg-slate-900 text-white font-bold text-[11px] px-2 py-0.5"
                >
                  👑 Admin
                </Badge>
              )
            case 'teacher':
              return (
                <Badge
                  key={r}
                  className="bg-emerald-600 hover:bg-emerald-600 text-white font-bold text-[11px] px-2 py-0.5"
                >
                  👨‍🏫 GV
                </Badge>
              )
            case 'sales':
              return (
                <Badge
                  key={r}
                  className="bg-blue-600 hover:bg-blue-600 text-white font-bold text-[11px] px-2 py-0.5"
                >
                  💼 Sales
                </Badge>
              )
            case 'cs':
              return (
                <Badge
                  key={r}
                  className="bg-amber-600 hover:bg-amber-600 text-white font-bold text-[11px] px-2 py-0.5"
                >
                  🎧 CSKH
                </Badge>
              )
            default:
              return (
                <Badge key={r} variant="outline" className="text-[11px] font-bold">
                  {r}
                </Badge>
              )
          }
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold">
              <Users className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Quản lý Tài khoản & Phân quyền</h2>
              <p className="text-xs text-slate-500 font-medium">
                Cấp tài khoản, phân quyền vai trò (GV, Sales, CS, Admin) và quản lý mật khẩu nhân sự Trà IELTS
              </p>
            </div>
          </div>
        </div>

        <Button
          type="button"
          onClick={openCreateDialog}
          className="h-10 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs gap-1.5 cursor-pointer shrink-0"
        >
          <UserPlus className="size-4" />
          Thêm tài khoản mới
        </Button>
      </div>

      {/* Account Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Tài khoản / Email</th>
                <th className="py-3.5 px-4">Họ và tên</th>
                <th className="py-3.5 px-4">Phân quyền vai trò</th>
                <th className="py-3.5 px-4">Nhân sự liên kết</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {users.map((u) => {
                const isCurrent = currentUser?.id === u.id
                return (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0 uppercase">
                          {u.name ? u.name.charAt(0) : u.email.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            {u.email}
                            {isCurrent && (
                              <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-md">
                                Bạn
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">ID: #{u.id}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-bold text-slate-800">
                      {u.name || '—'}
                    </td>

                    <td className="py-3 px-4">
                      {renderRoleBadges(u.rolesList || [u.roles])}
                    </td>

                    <td className="py-3 px-4">
                      {u.personName ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200/80">
                          <UserCheck className="size-3.5 text-emerald-600" />
                          {u.personName}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Chưa gán</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={() => {
                            setPasswordUser(u)
                            setNewPassword('')
                          }}
                          className="h-7 rounded-lg text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 text-[11px] font-bold border-slate-200 cursor-pointer"
                        >
                          <KeyRound className="size-3 mr-1" />
                          Đổi pass
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={() => openEditDialog(u)}
                          className="h-7 rounded-lg text-slate-700 hover:text-blue-700 hover:bg-blue-50 text-[11px] font-bold border-slate-200 cursor-pointer"
                        >
                          <Edit className="size-3 mr-1" />
                          Sửa
                        </Button>

                        {!isCurrent && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={() => setDeleteUser(u)}
                            className="h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-[11px] font-bold cursor-pointer"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}

              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Chưa có tài khoản nào được tạo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog: Thêm tài khoản mới */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl">
          <form onSubmit={handleCreate} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-slate-900">
                Thêm tài khoản nhân sự mới
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Điền thông tin tài khoản và cấp quyền truy cập tương ứng cho nhân sự.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Họ và tên</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Anh Khoa"
                  className="h-9 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Email đăng nhập *</Label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ví dụ: nguyenanhkhoa305@gmail.com"
                  className="h-9 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Mật khẩu khởi tạo *</Label>
                <Input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-9 rounded-xl text-xs font-mono"
                />
              </div>

              {/* Roles selection */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Phân quyền vai trò (Chọn 1 hoặc nhiều) *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_ROLES.map((r) => {
                    const isChecked = selectedRoles.includes(r.key)
                    return (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => handleRoleToggle(r.key, selectedRoles, setSelectedRoles)}
                        className={cn(
                          'flex items-center justify-between p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer select-none',
                          isChecked
                            ? 'bg-emerald-50/80 border-emerald-500 text-emerald-950 font-bold shadow-2xs'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/80 text-slate-600 font-medium'
                        )}
                      >
                        <div>
                          <div>{r.label}</div>
                          <div className="text-[10px] text-slate-400 font-normal leading-tight mt-0.5">
                            {r.desc}
                          </div>
                        </div>
                        {isChecked && <Check className="size-4 text-emerald-700 shrink-0 ml-1" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Linked Person */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  Gắn với Nhân sự trong danh mục (Tùy chọn)
                </Label>
                <Select value={personId} onValueChange={setPersonId}>
                  <SelectTrigger className="h-9 rounded-xl text-xs">
                    <SelectValue placeholder="Chọn nhân sự liên kết..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-56 z-50">
                    <SelectItem value="none" className="text-xs text-slate-400">
                      — Không liên kết —
                    </SelectItem>
                    {allPeople.map((p) => (
                      <SelectItem key={`${p.role}-${p.id}`} value={String(p.id)} className="text-xs font-bold">
                        {p.name} ({p.roleLabel})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-400">
                  Nhân sự liên kết: Giáo viên, Sales hoặc CS khi đăng nhập sẽ tự động khóa vào đúng tên nhân sự này để chỉ xem dữ liệu thuộc quyền phụ trách của mình.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                className="rounded-xl text-xs"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
              >
                Tạo tài khoản
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Chỉnh sửa tài khoản */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl">
          <form onSubmit={handleUpdate} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-slate-900">
                Chỉnh sửa tài khoản: {editUser?.email}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Cập nhật họ tên, phân quyền vai trò và nhân sự liên kết.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Họ và tên</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-9 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Email đăng nhập</Label>
                <Input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="h-9 rounded-xl text-xs"
                />
              </div>

              {/* Roles selection */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Phân quyền vai trò *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_ROLES.map((r) => {
                    const isChecked = editRoles.includes(r.key)
                    return (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => handleRoleToggle(r.key, editRoles, setEditRoles)}
                        className={cn(
                          'flex items-center justify-between p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer select-none',
                          isChecked
                            ? 'bg-emerald-50/80 border-emerald-500 text-emerald-950 font-bold shadow-2xs'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/80 text-slate-600 font-medium'
                        )}
                      >
                        <div>
                          <div>{r.label}</div>
                          <div className="text-[10px] text-slate-400 font-normal leading-tight mt-0.5">
                            {r.desc}
                          </div>
                        </div>
                        {isChecked && <Check className="size-4 text-emerald-700 shrink-0 ml-1" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Linked Person */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Nhân sự liên kết</Label>
                <Select value={editPersonId} onValueChange={setEditPersonId}>
                  <SelectTrigger className="h-9 rounded-xl text-xs">
                    <SelectValue placeholder="Chọn nhân sự..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-56 z-50">
                    <SelectItem value="none" className="text-xs text-slate-400">
                      — Không liên kết —
                    </SelectItem>
                    {allPeople.map((p) => (
                      <SelectItem key={`${p.role}-${p.id}`} value={String(p.id)} className="text-xs font-bold">
                        {p.name} ({p.roleLabel})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-400">
                  Nhân sự liên kết: Giáo viên, Sales hoặc CS khi đăng nhập sẽ tự động khóa vào đúng tên nhân sự này để chỉ xem dữ liệu thuộc quyền phụ trách của mình.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditUser(null)}
                className="rounded-xl text-xs"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
              >
                Lưu thay đổi
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Đổi mật khẩu */}
      <Dialog open={!!passwordUser} onOpenChange={(open) => !open && setPasswordUser(null)}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <form onSubmit={handleChangePassword} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                <KeyRound className="size-5 text-emerald-700" />
                Đổi mật khẩu
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Đặt lại mật khẩu mới cho tài khoản: <strong>{passwordUser?.email}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-2">
              <Label className="text-xs font-bold text-slate-700">Mật khẩu mới *</Label>
              <Input
                type="text"
                required
                autoFocus
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới..."
                className="h-10 rounded-xl text-xs font-mono"
              />
              <p className="text-[11px] text-slate-400">
                Gợi ý: Mật khẩu nên có ít nhất 6 ký tự.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPasswordUser(null)}
                className="rounded-xl text-xs"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
              >
                Cập nhật mật khẩu
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Xác nhận Xóa */}
      <Dialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-rose-600 flex items-center gap-2">
              <Trash2 className="size-5" />
              Xóa tài khoản
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Bạn có chắc chắn muốn xóa tài khoản <strong>{deleteUser?.email}</strong>? Nhân sự này sẽ không thể đăng nhập vào hệ thống nữa.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteUser(null)}
              className="rounded-xl text-xs"
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={loading}
              onClick={handleDelete}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
            >
              Xác nhận xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
