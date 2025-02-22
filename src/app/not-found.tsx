'use client'

import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  const router = useRouter()

  const handleBack = () => {
    // Check if we can go back in history
    if (window.history.length > 2) {
      router.back()
    } else {
      // If no history, go to home
      router.push('/')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-cyan-300 font-mono">
      <div className="container mx-auto px-4 h-screen flex flex-col items-center justify-center">
        <div className="text-center space-y-6">
          <h1 className="text-6xl font-bold text-cyan-400">404</h1>
          <h2 className="text-2xl font-semibold">Page Not Found</h2>
          <p className="text-cyan-400/70 max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Button
              onClick={handleBack}
              variant="outline"
              className="rounded-full px-6 py-2 border-2 border-cyan-500/20 hover:bg-cyan-500/10 text-cyan-300 hover:border-cyan-400/30 transition-all duration-200 shadow-lg hover:shadow-cyan-500/5"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
            
            <Button
              onClick={() => router.push('/')}
              variant="outline"
              className="rounded-full px-6 py-2 border-2 border-cyan-500/20 hover:bg-cyan-500/10 text-cyan-300 hover:border-cyan-400/30 transition-all duration-200 shadow-lg hover:shadow-cyan-500/5"
            >
              <Home className="mr-2 h-4 w-4" />
              Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 