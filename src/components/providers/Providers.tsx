'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { NextAuthProvider } from './SessionProvider'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: true
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