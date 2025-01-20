'use client'

import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ProfilePageComponent } from '@/components/profile-page'
import { useEffect } from 'react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'loading') return
    
    // Check for missing username parameter
    if (!params?.username) {
      router.push('/404')
      return
    }

    if (!session) {
      const callbackUrl = encodeURIComponent(window.location.pathname)
      router.push(`/login?callbackUrl=${callbackUrl}`)
    }
  }, [session, status, router, params])

  if (status === 'loading' || !params?.username) {
    return (
      <div className="min-h-screen w-full bg-gray-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!session) {
    return null
  }

  return <ProfilePageComponent username={params.username as string} />
} 