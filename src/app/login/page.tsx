'use client'
import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import { AuthPageComponent } from "@/components/auth-page"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

export default function LoginPage() {
  const { data: session, status } = useSession()
  

  useEffect(() => {
    if (status === 'loading') return
    
    if (status === 'authenticated' && session) {
      const urlParams = new URLSearchParams(window.location.search)
      const callbackUrl = urlParams.get('callbackUrl')
      window.location.href = decodeURIComponent(callbackUrl || '/')
    }
  }, [status, session])

  // Show loading spinner while checking authentication status
  if (status === 'loading') {
    return (
      <div className="min-h-screen w-full bg-gray-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  // If user is already authenticated, return null (will redirect in useEffect)
  if (status === 'authenticated' && session) {
    return null
  }

  // Show login component only when definitely not authenticated
  return <AuthPageComponent />
}
