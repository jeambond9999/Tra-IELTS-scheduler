import { Head, Link, router } from '@inertiajs/react'
import { AuthNav } from '@/components/auth-nav'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { editItemPath, itemPath, itemsPath, newItemPath } from '@/lib/routes'
import type { Item, Pagy } from '@/types'

type Props = {
  items: Item[]
  pagy: Pagy
}

export default function ItemsIndex({ items, pagy }: Props) {
  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this item?')) {
      router.delete(itemPath(id))
    }
  }

  const goToPage = (page: number | null = 1) => {
    router.get(itemsPath(), { page }, { preserveState: true })
  }

  return (
    <div className="min-h-screen bg-background">
      <Head title="Items" />

      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold">Items</h1>
          <AuthNav />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-muted-foreground">
            {pagy.count} {pagy.count === 1 ? 'item' : 'items'}
            {pagy.pages > 1 && ` (showing ${pagy.from}-${pagy.to})`}
          </p>
          <Link href={newItemPath()}>
            <Button>New Item</Button>
          </Link>
        </div>

        {items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No items yet. Create your first item!</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <Card key={item.id}>
                  <CardHeader>
                    <CardTitle>{item.name}</CardTitle>
                    {item.description && <CardDescription>{item.description}</CardDescription>}
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Link href={itemPath(item.id)}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                      <Link href={editItemPath(item.id)}>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </Link>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)}>
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

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
          </>
        )}
      </main>
    </div>
  )
}
