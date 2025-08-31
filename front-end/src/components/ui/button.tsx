import * as React from 'react'
import { cn } from './utils'

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-medium shadow-sm border bg-white hover:bg-zinc-50 transition',
        className
      )}
      {...props}
    />
  )
)
Button.displayName = 'Button'
