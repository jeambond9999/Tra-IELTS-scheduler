import { Head, Link, usePage } from '@inertiajs/react'
import { version as react_version } from 'react'
import { AuthNav } from '@/components/auth-nav'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { itemPath, itemsPath, newItemPath } from '@/lib/routes'
import type { Item, SharedProps } from '@/types'

export default function InertiaExample({
  rails_version,
  ruby_version,
  rack_version,
  inertia_rails_version,
  recent_items,
}: {
  rails_version: string
  ruby_version: string
  rack_version: string
  inertia_rails_version: string
  recent_items: Item[]
}) {
  const { user } = usePage<SharedProps>().props

  return (
    <div className="min-h-screen bg-background">
      <Head title="Rails Inertia Template" />

      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold">Rails Inertia Template</h1>
          <AuthNav />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <section className="mb-12 text-center">
          <h2 className="mb-4 text-4xl font-bold">
            {user
              ? `Welcome back, ${user.email.split('@')[0]}!`
              : 'Welcome to Rails Inertia Template'}
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            A modern full-stack template combining Ruby on Rails, Inertia.js, and React with
            TypeScript.
          </p>
        </section>

        {/* Quick Actions */}
        <section className="mb-12">
          <div className="flex flex-wrap justify-center gap-4">
            <Link href={itemsPath()}>
              <Button size="lg">View All Items</Button>
            </Link>
            {user && (
              <Link href={newItemPath()}>
                <Button size="lg" variant="outline">
                  Create New Item
                </Button>
              </Link>
            )}
          </div>
        </section>

        {/* Recent Items (for authenticated users) */}
        {user && recent_items.length > 0 && (
          <section className="mb-12">
            <h3 className="mb-4 text-xl font-semibold">Your Recent Items</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recent_items.map((item) => (
                <Link key={item.id} href={itemPath(item.id)}>
                  <Card className="transition-shadow hover:shadow-md">
                    <CardHeader>
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      {item.description && (
                        <CardDescription className="line-clamp-2">
                          {item.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Version Info Footer */}
        <footer className="border-t pt-8 text-center text-sm text-muted-foreground">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <span>Rails {rails_version}</span>
            <span>Rack {rack_version}</span>
            <span>Inertia Rails {inertia_rails_version}</span>
            <span>React {react_version}</span>
          </div>
          <p className="mt-2 text-xs">{ruby_version}</p>
        </footer>
      </main>
    </div>
  )
}
