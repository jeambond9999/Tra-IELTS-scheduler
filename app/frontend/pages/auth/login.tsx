import { Head, usePage } from '@inertiajs/react'
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type PageProps = {
  alert?: string
  notice?: string
  flash?: {
    alert?: string
    notice?: string
  }
}

export default function Login() {
  const { props } = usePage<PageProps>()
  const [showPassword, setShowPassword] = useState(false)
  const [csrfToken, setCsrfToken] = useState('')

  useEffect(() => {
    const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || ''
    setCsrfToken(token)
  }, [])

  const alertMessage = props.alert || props.flash?.alert
  const noticeMessage = props.notice || props.flash?.notice

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-100 p-4">
      <Head title="Đăng nhập - Trà IELTS" />

      <div className="w-full max-w-md bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <img src="/logo.png" alt="Trà IELTS" className="h-12 mx-auto object-contain drop-shadow-xs" />
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Đăng nhập hệ thống</h1>
          <p className="text-xs font-semibold text-slate-500">
            Hệ thống Quản lý Lịch dạy & Tính lương Trà IELTS
          </p>
        </div>

        {alertMessage && (
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
            <AlertCircle className="size-4 shrink-0 mt-0.5 text-rose-600" />
            <div className="flex-1">{alertMessage}</div>
          </div>
        )}

        {noticeMessage && (
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-600" />
            <div className="flex-1">{noticeMessage}</div>
          </div>
        )}

        <form action="/users/sign_in" method="post" className="space-y-4">
          <input type="hidden" name="authenticity_token" value={csrfToken} />

          <div className="space-y-1.5">
            <Label htmlFor="user_email" className="text-xs font-bold text-slate-700">
              Email đăng nhập
            </Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                id="user_email"
                type="email"
                name="user[email]"
                required
                autoFocus
                placeholder="ví dụ: nguyenanhkhoa305@gmail.com"
                className="pl-10 h-11 rounded-xl text-sm font-medium border-slate-200 focus-visible:ring-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="user_password" className="text-xs font-bold text-slate-700">
                Mật khẩu
              </Label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                id="user_password"
                type={showPassword ? 'text' : 'password'}
                name="user[password]"
                required
                placeholder="••••••••••••"
                className="pl-10 pr-10 h-11 rounded-xl text-sm font-medium border-slate-200 focus-visible:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-hidden cursor-pointer"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                name="user[remember_me]"
                value="1"
                defaultChecked
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs font-semibold text-slate-600">Ghi nhớ đăng nhập</span>
            </label>
          </div>

          <Button
            type="submit"
            className="w-full h-11 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
          >
            Đăng nhập
          </Button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-slate-400 font-bold">hoặc</span>
          </div>
        </div>

        <form action="/users/auth/google_oauth2" method="post">
          <input type="hidden" name="authenticity_token" value={csrfToken} />
          <Button
            type="submit"
            variant="outline"
            className="w-full h-11 rounded-xl font-bold text-xs border-slate-200 hover:bg-slate-50 cursor-pointer"
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-label="Google logo">
              <title>Google</title>
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Đăng nhập với Google
          </Button>
        </form>

        <div className="text-center text-xs text-slate-400 font-medium">
          Trà IELTS &copy; {new Date().getFullYear()} - All rights reserved.
        </div>
      </div>
    </div>
  )
}
