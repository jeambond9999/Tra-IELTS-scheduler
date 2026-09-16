import { cn } from '@/lib/utils'

type LabelProps = Omit<React.ComponentProps<'label'>, 'htmlFor'> & {
  htmlFor: string
}

function Label({ className, htmlFor, ...props }: LabelProps) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: <checking later>
    <label
      htmlFor={htmlFor}
      data-slot="label"
      className={cn(
        'flex items-center gap-2 text-sm font-medium leading-none select-none',
        className
      )}
      {...props}
    />
  )
}

export { Label }
