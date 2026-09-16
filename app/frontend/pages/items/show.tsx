import { Head, Link, router } from '@inertiajs/react'
import { AuthNav } from '@/components/auth-nav'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { editItemPath, itemPath, itemsPath } from '@/lib/routes'
import type { Item } from '@/types'

type Props = {
  item: Item
}

export default function ItemShow({ item }: Props) {
  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this item?')) {
      router.delete(itemPath(item.id))
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Head title={item.name} />

      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href={itemsPath()}>
              <Button variant="ghost" size="sm">
                &larr; Back
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Item Details</h1>
          </div>
          <AuthNav />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">{item.name}</CardTitle>
            {item.description && (
              <CardDescription className="text-base">{item.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {item.phoneNumber && (
              <div className="mb-4">
                <p className="text-sm font-medium">Phone Number</p>
                <p>{item.phoneNumber}</p>
              </div>
            )}
            <div className="mb-6 text-sm text-muted-foreground">
              <p>Created: {new Date(item.createdAt).toLocaleString()}</p>
              <p>Updated: {new Date(item.updatedAt).toLocaleString()}</p>
            </div>
            <div className="flex gap-2">
              <Link href={editItemPath(item.id)}>
                <Button>Edit</Button>
              </Link>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
