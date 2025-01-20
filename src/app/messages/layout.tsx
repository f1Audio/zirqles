'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Navbar } from '@/components/layout/navbar'
import { Sidebar } from '@/components/layout/sidebar'
import { SearchDialog } from '@/components/layout/search-dialog'

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const { data: session } = useSession()

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