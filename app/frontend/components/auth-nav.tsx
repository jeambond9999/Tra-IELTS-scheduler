import { Link, usePage } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import type { SharedProps } from '@/types'

export function AuthNav() {
  const { user } = usePage<SharedProps>().props

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {user.avatarUrl && (
            <img src={user.avatarUrl} alt={user.name} className="h-8 w-8 rounded-full" />
          )}
          <span className="text-sm font-medium">{user.name}</span>
        </div>
        <form action="/users/sign_out" method="post">
          <input type="hidden" name="_method" value="delete" />
          <input
            type="hidden"
            name="authenticity_token"
            value={
              document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || ''
            }
          />
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    )
  }

  return (
    <Link href="/users/sign_in">
      <Button variant="outline" size="sm">
        Sign in
      </Button>
    </Link>
  )
}
