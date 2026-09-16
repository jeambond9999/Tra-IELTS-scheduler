import { Head, Link, useForm } from '@inertiajs/react'
import { AuthNav } from '@/components/auth-nav'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { itemPath, itemsPath } from '@/lib/routes'
import type { Item } from '@/types'

type Props = {
  item: Item
}

export default function ItemEdit({ item }: Props) {
  const { data, setData, patch, processing, errors } = useForm(item)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    patch(itemPath(item.id))
  }

  return (
    <div className="min-h-screen bg-background">
      <Head title={`Edit ${item.name}`} />

      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href={itemsPath()}>
              <Button variant="ghost" size="sm">
                &larr; Back
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Edit Item</h1>
          </div>
          <AuthNav />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Edit item</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={data.name}
                  onChange={(e) => setData('name', e.target.value)}
                  placeholder="Enter item name"
                  aria-invalid={!!errors.name}
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={data.description}
                  onChange={(e) => setData('description', e.target.value)}
                  placeholder="Enter item description (optional)"
                  rows={4}
                  aria-invalid={!!errors.description}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={data.phoneNumber}
                  onChange={(e) => setData('phoneNumber', e.target.value)}
                  placeholder="Enter phone number (optional)"
                  aria-invalid={!!errors.phoneNumber}
                />
                {errors.phoneNumber && (
                  <p className="text-sm text-destructive">{errors.phoneNumber}</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={processing}>
                  {processing ? 'Updating...' : 'Update Item'}
                </Button>
                <Link href={itemsPath()}>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
