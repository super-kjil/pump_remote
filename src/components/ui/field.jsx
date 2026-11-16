import { cva } from 'class-variance-authority'
import { cn } from 'cn'
import { Label } from './label'

const fieldVariants = cva('group/field flex w-full gap-2 data-[invalid=true]:text-destructive', {
  variants: {
    orientation: {
      vertical: 'flex-col *:w-full [&>.sr-only]:w-auto',
      horizontal:
        'flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto',
    },
  },
  defaultVariants: {
    orientation: 'vertical',
  },
})

function FieldGroup({ className, ...props }) {
  return (
    <div
      data-slot="field-group"
      className={cn(
        'group/field-group @container/field-group flex w-full flex-col gap-5 *:data-[slot=field-group]:gap-4',
        className
      )}
      {...props}
    />
  )
}

function Field({ className, orientation = 'vertical', ...props }) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  )
}

function FieldContent({ className, ...props }) {
  return (
    <div
      data-slot="field-content"
      className={cn('group/field-content flex flex-1 flex-col gap-0.5 leading-snug', className)}
      {...props}
    />
  )
}

function FieldLabel({ className, ...props }) {
  return (
    <Label
      data-slot="field-label"
      className={cn('group/field-label flex w-fit gap-2 leading-snug', className)}
      {...props}
    />
  )
}

function FieldDescription({ className, ...props }) {
  return (
    <p
      data-slot="field-description"
      className={cn('text-xs leading-normal text-muted-foreground', className)}
      {...props}
    />
  )
}

export { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel }
