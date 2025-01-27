'use client'

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Settings, LogOut } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

interface NavbarProps {
  onSearchOpen: () => void
}

export function Navbar({ onSearchOpen }: NavbarProps) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const queryClient = useQueryClient()
  
  const { data: userData, isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const response = await fetch('/api/user')
      if (!response.ok) throw new Error('Failed to fetch user data')
      return response.json()
    },
    enabled: !!session?.user?.email,
    staleTime: Infinity,
    gcTime: Infinity,
    placeholderData: session?.user ? {
      username: session.user.username,
      avatar: session.user.avatar,
    } : undefined,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  })

  // Move useMemo before any conditional returns
  const displayData = useMemo(() => {
    if (status === 'loading') return null
    return isLoading ? session?.user : userData
  }, [isLoading, session?.user, userData, status])

  // Early return after useMemo
  if (!displayData) return null

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-xl border-b border-cyan-500/20 font-mono w-full">
      <div className="px-12 py-4 flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 font-mono">
          Zirqles
        </h1>
        <div className="flex items-center space-x-6">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-cyan-400/80 hover:text-cyan-300 hover:bg-cyan-900/50 rounded-xl transition-all duration-300 ease-in-out hover:scale-105"
            onClick={onSearchOpen}
          >
            <Search className="h-5 w-5" />
          </Button>
          {displayData && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-8 w-8 ring-2 ring-cyan-500/50 ring-offset-2 ring-offset-gray-900 cursor-pointer hover:opacity-80 transition-opacity duration-300">
                  <AvatarImage 
                    src={displayData.avatar || ''} 
                    alt={displayData.username || '@user'} 
                  />
                  <AvatarFallback className="bg-cyan-900/50 text-cyan-100">
                    {displayData.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-48 bg-gray-900/95 border-cyan-500/20 text-cyan-100 mt-2 rounded-xl overflow-hidden backdrop-blur-xl font-mono"
              >
                <DropdownMenuItem 
                  onClick={() => router.push('/settings')} 
                  className="rounded-xl hover:text-cyan-300 cursor-pointer transition-all duration-300 ease-in-out hover:scale-[1.02]"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-cyan-500/30" />
                <DropdownMenuItem 
                  onClick={() => signOut()} 
                  className="rounded-xl hover:text-blue-400 cursor-pointer transition-all duration-300 ease-in-out hover:scale-[1.02]"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
} 