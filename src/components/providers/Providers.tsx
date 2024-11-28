'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { NextAuthProvider } from './SessionProvider'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // Data stays fresh for 1 minute
        gcTime: 5 * 60 * 1000, // Cache is kept for 5 minutes
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <NextAuthProvider>
        {children}
      </NextAuthProvider>

    </QueryClientProvider>
  )
} 