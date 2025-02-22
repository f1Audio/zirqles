'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { SettingsPageComponent } from '@/components/settings-page'
import { LoadingSpinner } from "@/components/ui/loading-spinner"

const SettingsPage = () => {
  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/login')
    },
  })
  const router = useRouter()

  // Show loading state while session is being fetched
  if (status === 'loading') {
    return (
      <div className="min-h-screen w-full bg-gray-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  // Session is guaranteed to exist due to required: true
  return <SettingsPageComponent />
}

export default SettingsPage
