import type { ReactNode } from 'react'
import { Toaster } from '@/components/ui/sonner'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <>
      <Toaster position="top-right" richColors closeButton />
      {children}
    </>
  )
}
