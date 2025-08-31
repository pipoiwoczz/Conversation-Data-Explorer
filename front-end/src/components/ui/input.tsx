import * as React from 'react'
import { cn } from './utils'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn('w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-300', className)}
      {...props}
    />
  )
)
Input.displayName = 'Input'
