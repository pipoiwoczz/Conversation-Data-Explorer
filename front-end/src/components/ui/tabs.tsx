import * as React from 'react'
import { cn } from './utils'

type TabsContext = { value: string; setValue: (v: string) => void }
const Ctx = React.createContext<TabsContext | null>(null)

type TabsProps = { defaultValue: string; children: React.ReactNode; className?: string }

export function Tabs({ defaultValue, children, className }: TabsProps) {
  const [value, setValue] = React.useState(defaultValue)
  return (
    <Ctx.Provider value={{ value, setValue }}>
      <div className={cn(className)}>{children}</div>
    </Ctx.Provider>
  )
}

export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('inline-grid grid-flow-col gap-2 rounded-2xl bg-zinc-100 p-1', className)}
      {...props}
    />
  )
}

export function TabsTrigger(
  { value, children, className }: { value: string; children: React.ReactNode; className?: string }
) {
  const ctx = React.useContext(Ctx)!
  const active = ctx.value === value
  return (
    <button
      onClick={() => ctx.setValue(value)}
      className={cn('px-3 py-1 text-sm rounded-xl', active ? 'bg-white shadow border' : 'text-zinc-500', className)}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(Ctx)!
  if (ctx.value !== value) return null
  return <div className={cn('mt-4', className)}>{children}</div>
}
