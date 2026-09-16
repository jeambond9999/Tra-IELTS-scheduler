import { Head, router } from '@inertiajs/react'
import { AuthNav } from '@/components/auth-nav'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { versionsPath } from '@/lib/routes'
import type { Pagy, Version } from '@/types'

type Props = {
  versions: Version[]
  pagy: Pagy
}

function formatEvent(event: string) {
  switch (event) {
    case 'create':
      return {
        label: 'Created',
        color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      }
    case 'update':
      return {
        label: 'Updated',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      }
    case 'destroy':
      return {
        label: 'Deleted',
        color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      }
    default:
      return {
        label: event,
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      }
  }
}

function formatChanges(objectChanges: Record<string, [unknown, unknown]> | null) {
  if (!objectChanges) return null

  return Object.entries(objectChanges).map(([key, [from, to]]) => ({
    field: key.replace(/_/g, ' '),
    from: from ?? '(empty)',
    to: to ?? '(empty)',
  }))
}

export default function VersionsIndex({ versions, pagy }: Props) {
  const goToPage = (page: number | null = 1) => {
    router.get(versionsPath(), { page }, { preserveState: true })
  }

  console.log(versions)

  return (
    <div className="min-h-screen bg-background">
      <Head title="Audit Log" />

      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <AuthNav />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <p className="text-muted-foreground">
            {pagy.count} {pagy.count === 1 ? 'change' : 'changes'} recorded
            {pagy.pages > 1 && ` (showing ${pagy.from}-${pagy.to})`}
          </p>
        </div>

        {versions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No audit history yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {versions.map((version) => {
              const eventInfo = formatEvent(version.event)
              const changes = formatChanges(version.objectChanges)

              return (
                <Card key={version.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {version.itemType} #{version.itemId}
                      </CardTitle>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${eventInfo.color}`}
                      >
                        {eventInfo.label}
                      </span>
                    </div>
                    <CardDescription>
                      {new Date(version.createdAt).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  {changes && changes.length > 0 && (
                    <CardContent>
                      <div className="space-y-2">
                        {changes.map((change, i) => (
                          <div key={i.toString()} className="text-sm">
                            <span className="font-medium capitalize">{change.field}:</span>{' '}
                            {version.event === 'create' ? (
                              <span className="text-green-600 dark:text-green-400">
                                {String(change.to)}
                              </span>
                            ) : version.event === 'destroy' ? (
                              <span className="text-red-600 line-through dark:text-red-400">
                                {String(change.from)}
                              </span>
                            ) : (
                              <>
                                <span className="text-red-600 line-through dark:text-red-400">
                                  {String(change.from)}
                                </span>
                                {' → '}
                                <span className="text-green-600 dark:text-green-400">
                                  {String(change.to)}
                                </span>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>
        )}

        {pagy.pages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(pagy?.prev)}
              disabled={!pagy.prev}
            >
              Previous
            </Button>
            <span className="px-4 text-sm text-muted-foreground">
              Page {pagy.page} of {pagy.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(pagy?.next)}
              disabled={!pagy.next}
            >
              Next
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
