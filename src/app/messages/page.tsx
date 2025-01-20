'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ChatPageComponent } from '@/components/chat-page'
import { LoadingSpinner } from "@/components/ui/loading-spinner"

export default function MessagesPage() {
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

  return <ChatPageComponent />
}
