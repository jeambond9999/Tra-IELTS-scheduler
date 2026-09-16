import { router } from '@inertiajs/react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] as const
const sizes = ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'] as const

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Separator className="flex-1" />
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  )
}

function ComponentShowcase({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">{children}</CardContent>
    </Card>
  )
}

const Demo = () => {
  const [fetching, setFetching] = useState(false)
  const [sliderValue, setSliderValue] = useState([50])
  const [switchChecked, setSwitchChecked] = useState(false)
  const [selectValue, setSelectValue] = useState('')
  const [radioValue, setRadioValue] = useState('opt1')
  const [checkboxChecked, setCheckboxChecked] = useState(false)
  const [tabsValue, setTabsValue] = useState('tab1')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [alertDialogOpen, setAlertDialogOpen] = useState(false)

  const handleClientFetch = async () => {
    setFetching(true)
    try {
      const csrfToken =
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? ''
      const res = await fetch('/demo/fetch', {
        method: 'POST',
        headers: { 'X-CSRF-Token': csrfToken, 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message)
      } else {
        toast.error(data.message)
      }
    } catch {
      toast.error('Network error')
    } finally {
      setFetching(false)
    }
  }

  useEffect(() => {
    if (switchChecked) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [switchChecked])

  return (
    <TooltipProvider>
      <div className="container mx-auto max-w-6xl space-y-8 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">shadcn/ui Component Showcase</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Dark mode</span>
            <Switch checked={switchChecked} onCheckedChange={setSwitchChecked} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Flash Messages Test</CardTitle>
              <CardDescription>Click buttons to trigger flash messages via Inertia</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="default" onClick={() => router.post('/demo')}>
                Trigger POST Toast
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Client Fetch Demo</CardTitle>
              <CardDescription>Uses raw fetch() — 50% success, 50% error</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleClientFetch} disabled={fetching}>
                {fetching ? 'Sending…' : 'Send Fetch Request'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Tabs value={tabsValue} onValueChange={setTabsValue}>
          <TabsList>
            <TabsTrigger value="tab1">Form Controls</TabsTrigger>
            <TabsTrigger value="tab2">Navigation</TabsTrigger>
            <TabsTrigger value="tab3">Feedback</TabsTrigger>
            <TabsTrigger value="tab4">Overlays</TabsTrigger>
            <TabsTrigger value="tab5">Data Display</TabsTrigger>
          </TabsList>

          <TabsContent value="tab1" className="space-y-6 pt-4">
            <Section title="Buttons">
              <ComponentShowcase title="Variants" description="Different button styles">
                {variants.map((v) => (
                  <Button key={v} variant={v}>
                    {v}
                  </Button>
                ))}
              </ComponentShowcase>
              <ComponentShowcase title="Sizes" description="Different button sizes">
                {sizes.map((s) => (
                  <Button key={s} size={s}>
                    {s}
                  </Button>
                ))}
              </ComponentShowcase>
              <ComponentShowcase title="With Icons">
                <Button variant="default">
                  <svg
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                  Icon Left
                </Button>
                <Button variant="outline">
                  Icon Right
                  <svg
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </Button>
              </ComponentShowcase>
            </Section>

            <Section title="Form Controls">
              <ComponentShowcase title="Input" description="Text input field">
                <Input placeholder="Enter text..." />
              </ComponentShowcase>

              <ComponentShowcase title="Textarea" description="Multi-line text input">
                <Textarea placeholder="Enter description..." />
              </ComponentShowcase>

              <ComponentShowcase title="Checkbox">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="check"
                    checked={checkboxChecked}
                    onCheckedChange={(c) => setCheckboxChecked(!!c)}
                  />
                  <Label htmlFor="check">Accept terms and conditions</Label>
                </div>
              </ComponentShowcase>

              <ComponentShowcase title="Radio Group">
                <RadioGroup value={radioValue} onValueChange={setRadioValue}>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="opt1" id="r1" />
                    <Label htmlFor="r1">Option 1</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="opt2" id="r2" />
                    <Label htmlFor="r2">Option 2</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="opt3" id="r3" />
                    <Label htmlFor="r3">Option 3</Label>
                  </div>
                </RadioGroup>
              </ComponentShowcase>

              <ComponentShowcase title="Switch">
                <div className="flex items-center gap-2">
                  <Switch
                    id="switch-demo"
                    checked={switchChecked}
                    onCheckedChange={setSwitchChecked}
                  />
                  <Label htmlFor="switch-demo">Enable notifications</Label>
                </div>
              </ComponentShowcase>

              <ComponentShowcase title="Slider" description="Value: {sliderValue[0]}">
                <div className="w-full max-w-xs">
                  <Slider value={sliderValue} onValueChange={setSliderValue} max={100} step={1} />
                </div>
              </ComponentShowcase>

              <ComponentShowcase title="Select">
                <Select value={selectValue} onValueChange={setSelectValue}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="opt1">Option 1</SelectItem>
                    <SelectItem value="opt2">Option 2</SelectItem>
                    <SelectItem value="opt3">Option 3</SelectItem>
                  </SelectContent>
                </Select>
              </ComponentShowcase>

              <ComponentShowcase title="Label">
                <Label htmlFor="email">Email address</Label>
              </ComponentShowcase>
            </Section>
          </TabsContent>

          <TabsContent value="tab2" className="space-y-6 pt-4">
            <Section title="Navigation">
              <ComponentShowcase title="Tabs" description="Switch between views">
                <div className="w-full max-w-md">
                  <Tabs value={tabsValue} onValueChange={setTabsValue}>
                    <TabsList>
                      <TabsTrigger value="tab1">Overview</TabsTrigger>
                      <TabsTrigger value="tab2">Details</TabsTrigger>
                      <TabsTrigger value="tab3">Settings</TabsTrigger>
                    </TabsList>
                    <TabsContent value="tab1">Overview content here</TabsContent>
                    <TabsContent value="tab2">Details content here</TabsContent>
                    <TabsContent value="tab3">Settings content here</TabsContent>
                  </Tabs>
                </div>
              </ComponentShowcase>

              <ComponentShowcase title="Accordion" description="Expandable sections">
                <div className="w-full max-w-md">
                  <Accordion type="single" collapsible>
                    <AccordionItem value="item-1">
                      <AccordionTrigger>What is shadcn/ui?</AccordionTrigger>
                      <AccordionContent>
                        shadcn/ui is a collection of re-usable components built using Radix UI and
                        Tailwind CSS.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                      <AccordionTrigger>Is it free to use?</AccordionTrigger>
                      <AccordionContent>
                        Yes, shadcn/ui is completely free and open source.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3">
                      <AccordionTrigger>Can I customize it?</AccordionTrigger>
                      <AccordionContent>
                        Absolutely! All components can be customized to fit your design system.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </ComponentShowcase>

              <ComponentShowcase title="Avatar" description="User profile pictures">
                <Avatar>
                  <AvatarImage src="https://github.com/shadcn.png" alt="shadcn" />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                <Avatar size="sm">
                  <AvatarImage src="https://github.com/ghost.png" alt="ghost" />
                  <AvatarFallback>GH</AvatarFallback>
                </Avatar>
                <Avatar size="lg">
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
              </ComponentShowcase>

              <ComponentShowcase title="Avatar Group" description="Multiple avatars">
                <AvatarGroup>
                  <Avatar>
                    <AvatarFallback>AB</AvatarFallback>
                  </Avatar>
                  <Avatar>
                    <AvatarFallback>CD</AvatarFallback>
                  </Avatar>
                  <Avatar>
                    <AvatarFallback>EF</AvatarFallback>
                  </Avatar>
                  <AvatarGroupCount>+5</AvatarGroupCount>
                </AvatarGroup>
              </ComponentShowcase>

              <ComponentShowcase title="Dropdown Menu">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">Open Menu</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>Profile</DropdownMenuItem>
                    <DropdownMenuItem>Settings</DropdownMenuItem>
                    <DropdownMenuItem>Billing</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive">Sign out</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </ComponentShowcase>
            </Section>
          </TabsContent>

          <TabsContent value="tab3" className="space-y-6 pt-4">
            <Section title="Feedback">
              <ComponentShowcase title="Alert" description="Informational alert">
                <Alert>
                  <AlertTitle>Info</AlertTitle>
                  <AlertDescription>This is an informational message.</AlertDescription>
                </Alert>
              </ComponentShowcase>

              <ComponentShowcase title="Alert Variants">
                <Alert>
                  <AlertTitle>Default</AlertTitle>
                  <AlertDescription>This is a default alert.</AlertDescription>
                </Alert>
                <Alert variant="destructive">
                  <AlertTitle>Destructive</AlertTitle>
                  <AlertDescription>Something went wrong.</AlertDescription>
                </Alert>
              </ComponentShowcase>

              <ComponentShowcase title="Badge" description="Labels and tags">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="link">Link</Badge>
              </ComponentShowcase>

              <ComponentShowcase title="Separator">
                <div className="w-full max-w-xs space-y-2">
                  <div className="flex items-center gap-2">
                    <span>Item 1</span>
                    <Separator orientation="vertical" className="h-4" />
                    <span>Item 2</span>
                    <Separator orientation="vertical" className="h-4" />
                    <span>Item 3</span>
                  </div>
                  <Separator />
                  <p>Content above and below the separator</p>
                </div>
              </ComponentShowcase>
            </Section>
          </TabsContent>

          <TabsContent value="tab4" className="space-y-6 pt-4">
            <Section title="Overlays">
              <ComponentShowcase title="Dialog" description="Modal dialog">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>Open Dialog</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Dialog Title</DialogTitle>
                      <DialogDescription>
                        This is a dialog component for confirming actions.
                      </DialogDescription>
                    </DialogHeader>
                    <p>Are you sure you want to continue with this action?</p>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={() => setDialogOpen(false)}>Confirm</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </ComponentShowcase>

              <ComponentShowcase title="Alert Dialog" description="Confirmation dialog">
                <AlertDialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Delete Item</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setAlertDialogOpen(false)}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction onClick={() => setAlertDialogOpen(false)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </ComponentShowcase>

              <ComponentShowcase title="Sheet" description="Slide-in panel">
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline">Open Sheet</Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Sheet Title</SheetTitle>
                      <SheetDescription>
                        This is a sheet component for side panels.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="mt-4 space-y-2">
                      <p>Additional content goes here.</p>
                    </div>
                  </SheetContent>
                </Sheet>
              </ComponentShowcase>

              <ComponentShowcase title="Popover" description="Floating content">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">Open Popover</Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <div className="space-y-2">
                      <h4 className="font-medium">Popover Title</h4>
                      <p className="text-sm text-muted-foreground">This is a popover component.</p>
                    </div>
                  </PopoverContent>
                </Popover>
              </ComponentShowcase>

              <ComponentShowcase title="Tooltip" description="Hover for more info">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline">Hover me</Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>This is a tooltip</p>
                  </TooltipContent>
                </Tooltip>
              </ComponentShowcase>
            </Section>
          </TabsContent>

          <TabsContent value="tab5" className="space-y-6 pt-4">
            <Section title="Data Display">
              <ComponentShowcase title="Card">
                <Card className="w-full max-w-sm">
                  <CardHeader>
                    <CardTitle>Card Title</CardTitle>
                    <CardDescription>Card description goes here.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>Card content area with additional details.</p>
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Button size="sm">Action</Button>
                    <Button variant="outline" size="sm">
                      Cancel
                    </Button>
                  </CardFooter>
                </Card>
              </ComponentShowcase>

              <ComponentShowcase title="Table">
                <Table>
                  <TableCaption>A list of recent items.</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>John Doe</TableCell>
                      <TableCell>
                        <Badge variant="default">Active</Badge>
                      </TableCell>
                      <TableCell>Admin</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Jane Smith</TableCell>
                      <TableCell>
                        <Badge variant="secondary">Inactive</Badge>
                      </TableCell>
                      <TableCell>User</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Bob Wilson</TableCell>
                      <TableCell>
                        <Badge variant="outline">Pending</Badge>
                      </TableCell>
                      <TableCell>Editor</TableCell>
                    </TableRow>
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={2}>Total</TableCell>
                      <TableCell>3 users</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </ComponentShowcase>
            </Section>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
}

export default Demo
