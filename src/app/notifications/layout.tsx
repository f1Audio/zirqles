'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'
import { Sidebar } from '@/components/layout/sidebar'
import { SearchDialog } from '@/components/layout/search-dialog'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function NotificationsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/login')
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen w-full bg-gray-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar onSearchOpen={() => setIsSearchOpen(true)} />
      <Sidebar />
      <SearchDialog open={isSearchOpen} onOpenChange={setIsSearchOpen} />
      <main className="md:pl-56 lg:pl-64">
        {children}
      </main>
    </div>
  )
} 