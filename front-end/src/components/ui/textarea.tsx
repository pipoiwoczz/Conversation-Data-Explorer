import * as React from 'react'
import { cn } from './utils'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn('w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-300', className)}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'
