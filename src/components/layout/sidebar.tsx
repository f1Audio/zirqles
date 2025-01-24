'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Button } from "@/components/ui/button"
import { Home, Bell, Mail, User } from 'lucide-react'
import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { AvatarFallback } from '@/components/ui/avatar'
import { useStreamChat } from '@/contexts/StreamChatContext'

export function Sidebar() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const { totalUnreadCount } = useStreamChat()
  
  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: async () => {
      const response = await fetch('/api/notifications/unread')
      if (!response.ok) throw new Error('Failed to fetch unread count')
      const data = await response.json()
      return data
    },
    refetchInterval: 30000,
    staleTime: 30000
  })
  
  const unreadCount = unreadData?.count ?? 0
  
  // Add query to get current user data
  const { data: userData } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const response = await fetch('/api/user')
      if (!response.ok) throw new Error('Failed to fetch user data')
      return response.json()
    },
    enabled: !!session?.user?.email
  })
  
  // Use userData.username instead of session username
  const currentUsername = userData?.username || session?.user?.username

  const routes = useMemo(() => [
    { path: '/', label: 'Home', icon: Home },
    { 
      path: '/notifications', 
      label: 'Notifications', 
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : null 
    },
    { 
      path: '/messages', 
      label: 'Messages', 
      icon: Mail,
      badge: totalUnreadCount > 0 ? totalUnreadCount : null
    },
    {
      path: `/user/${currentUsername}`,
      label: 'Profile', 
      icon: User 
    } 
  ], [currentUsername, unreadCount, totalUnreadCount])

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex flex-col w-56 lg:w-64 fixed h-screen bg-gray-900/50 backdrop-blur-xl border-r border-cyan-500/20 font-mono">
        <div className="max-w-7xl mx-auto space-y-3 pt-24 px-6">
          {routes.map((route) => (
            <Link 
              key={`${route.path}-${currentUsername}`} 
              href={route.path}
              className="w-full"
            >
              <Button 
                variant="ghost" 
                className="w-[90%] mx-auto justify-start text-cyan-400/80 hover:text-cyan-300 hover:bg-cyan-900/50 rounded-xl group transition-all duration-200 ease-in-out font-normal px-4"
              >
                <div className="relative mr-3">
                  <route.icon className="h-5 w-5 group-hover:animate-pulse" />
                  {route.badge && (
                    <Badge 
                      variant="default" 
                      className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold"
                    >
                      {route.badge}
                    </Badge>
                  )}
                </div>
                {route.label}
              </Button>
            </Link>
          ))}
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900/80 backdrop-blur-xl border-t border-cyan-500/20 z-50 font-mono">
        <div className="flex justify-around items-center p-3">
          {routes.map((route) => (
            <Link 
              key={`${route.path}-${currentUsername}`} 
              href={route.path}
            >
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-cyan-400/80 hover:text-cyan-300 hover:bg-cyan-900/50 rounded-xl transition-all duration-300 ease-in-out hover:scale-105 w-12 h-12"
              >
                <div className="relative">
                  <route.icon className="h-6 w-6" />
                  {route.badge && (
                    <Badge 
                      variant="default" 
                      className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold"
                    >
                      {route.badge}
                    </Badge>
                  )}
                </div>
              </Button>
            </Link>
          ))}
        </div>
      </nav>
    </>
  )
} 