'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bell, Heart, MessageCircle, UserPlus, Zap, Trash2, Users, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { cn } from "@/lib/utils"

interface Notification {
  _id: string
  type: 'like' | 'comment' | 'follow' | 'repost' | 'system' | 'mention'
  user: string
  avatar?: string
  content: string
  time: string
  read: boolean
  postId?: string
  sender?: {
    username: string
    avatar: string
  }
  post?: {
    type: string
    content: string
    parentPost?: string
    _id: string
  }
  createdAt: string
}

function formatTimestamp(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds}s`
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes}m`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours}h`
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days}d`
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }
}

export function NotificationsPageComponent() {
  const [activeFilter, setActiveFilter] = useState('all')
  const queryClient = useQueryClient()

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await fetch('/api/notifications')
      if (!response.ok) throw new Error('Failed to fetch notifications')
      return response.json()
    },
    refetchInterval: 30000,
    staleTime: 30000
  })

  // Mark as read mutation
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT'
      })
      if (!response.ok) throw new Error('Failed to mark notification as read')
    },
    onMutate: async (notificationId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['notifications'] })
      await queryClient.cancelQueries({ queryKey: ['notifications', 'unread'] })

      // Snapshot the previous value
      const previousNotifications = queryClient.getQueryData(['notifications'])

      // Optimistically update notifications
      queryClient.setQueryData(['notifications'], (old: any) => 
        old?.map((n: Notification) => 
          n._id === notificationId ? { ...n, read: true } : n
        )
      )

      return { previousNotifications }
    },
    onError: (err, notificationId, context) => {
      // Revert back to the previous value if there's an error
      queryClient.setQueryData(['notifications'], context?.previousNotifications)
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] })
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] })
    }
  })

  // Add clear all mutation
  const clearAllNotifications = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/notifications', {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to clear notifications')
    },
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['notifications'] })
      await queryClient.cancelQueries({ queryKey: ['notifications', 'unread'] })

      // Snapshot the previous value
      const previousNotifications = queryClient.getQueryData(['notifications'])

      // Optimistically update to empty array
      queryClient.setQueryData(['notifications'], [])
      queryClient.setQueryData(['notifications', 'unread'], { count: 0 })

      return { previousNotifications }
    },
    onError: (err, variables, context) => {
      // Revert back to the previous value if there's an error
      queryClient.setQueryData(['notifications'], context?.previousNotifications)
      toast.error('Failed to clear notifications')
    },
    onSuccess: () => {
      toast.success('All notifications cleared')
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] })
    }
  })

  const filterNotifications = (type: string) => {
    if (type === 'all') return notifications
    return notifications.filter((notification: Notification) => notification.type === type)
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="h-4 w-4 text-pink-400" />
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-cyan-400" />
      case 'follow':
        return <UserPlus className="h-4 w-4 text-green-400" />
      case 'system':
        return <Zap className="h-4 w-4 text-yellow-400" />
      case 'mention':
        return <ArrowRight className="h-4 w-4 text-cyan-400" />
      default:
        return <Bell className="h-4 w-4 text-cyan-400" />
    }
  }

  const filters = [
    { value: 'all', label: 'All', icon: <Bell className="h-4 w-4" /> },
    { value: 'like', label: 'Likes', icon: <Heart className="h-4 w-4" /> },
    { value: 'comment', label: 'Comments', icon: <MessageCircle className="h-4 w-4" /> },
    { value: 'follow', label: 'Follows', icon: <Users className="h-4 w-4" /> },
  ]

  // Add effect to mark notifications as read when viewed
  useEffect(() => {
    if (!isLoading && notifications.length > 0) {
      const unreadNotifications = notifications.filter((n: Notification) => !n.read)
      if (unreadNotifications.length > 0) {
        // Immediately set unread count to 0 in cache
        queryClient.setQueryData(['notifications', 'unread'], { count: 0 })
        
        // Then mark all as read
        Promise.all(
          unreadNotifications.map((notification: Notification) => 
            markAsRead.mutateAsync(notification._id)
          )
        ).catch(error => {
          console.error('Error marking notifications as read:', error)
          // Revert the optimistic update if there's an error
          queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] })
        })
      }
    }
  }, [isLoading, notifications, markAsRead, queryClient])

  const renderNotificationContent = (notification: Notification) => {
    const { user, content } = notification
    const contentParts = content.split(user)
    
    return (
      <span className="text-cyan-100">
        <Link 
          href={`/user/${user}`}
          className="font-bold text-cyan-400 hover:text-cyan-300"
        >
          {user}
        </Link>
        {contentParts[1]}
      </span>
    )
  }

  const renderNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
      case 'comment_like':
        return <Heart className="h-4 w-4 text-pink-400" />
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-cyan-400" />
      case 'follow':
        return <UserPlus className="h-4 w-4 text-green-400" />
      case 'repost':
        return <Users className="h-4 w-4 text-purple-400" />
      case 'mention':
        return <Zap className="h-4 w-4 text-yellow-400" />
      default:
        return <Bell className="h-4 w-4 text-cyan-400" />
    }
  }

  return (
    <div className="container mx-auto px-4 h-screen flex items-center md:block">
      <div className="max-w-2xl mx-auto pb-20 md:pb-8 h-[75%] md:h-auto w-full">
        <div className="h-full md:pt-20">
          <div className="bg-gray-800/50 rounded-2xl backdrop-blur-xl border border-cyan-500/30 overflow-hidden h-full flex flex-col">
            <div className="p-4 border-b border-cyan-500/30">
              <div className="flex justify-between items-center">
                <div className="flex space-x-1 md:space-x-2">
                  {filters.map((filter) => (
                    <Button
                      key={filter.value}
                      onClick={() => setActiveFilter(filter.value)}
                      variant={activeFilter === filter.value ? "default" : "outline"}
                      size="sm"
                      className={`rounded-full transition-all duration-300 ${
                        activeFilter === filter.value
                          ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-gray-900 shadow-lg shadow-cyan-500/30'
                          : 'bg-gray-700/50 text-cyan-300 hover:bg-gray-600/70 hover:text-cyan-200'
                      }`}
                      aria-label={filter.label}
                    >
                      {filter.icon}
                      <span className="ml-2 hidden lg:inline">{filter.label}</span>
                    </Button>
                  ))}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => clearAllNotifications.mutate()}
                  disabled={notifications.length === 0 || clearAllNotifications.isPending}
                  className="rounded-full bg-gray-700/50 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all duration-300"
                  aria-label="Clear all notifications"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="ml-2 hidden lg:inline">
                    {clearAllNotifications.isPending ? "Clearing..." : "Clear All"}
                  </span>
                </Button>
              </div>
            </div>
            <ScrollArea className="flex-1 md:h-[calc(100vh-220px)]">
              <div className="p-4 space-y-4">
                {notifications.length === 0 ? (
                  <div className="text-center py-16 animate-pulse">
                    <Bell className="h-12 w-12 text-cyan-400 mx-auto mb-4" />
                    <p className="text-cyan-400 text-lg">No new notifications</p>
                  </div>
                ) : (
                  filterNotifications(activeFilter).map((notification: Notification) => (
                    <div
                      key={notification._id}
                      className={cn(
                        "bg-gray-700/30 rounded-xl p-4 border border-cyan-500/20",
                        !notification.read && "bg-cyan-900/20"
                      )}
                    >
                      <div className="flex items-center space-x-4 max-w-full">
                        <Avatar className="w-10 h-10 border-2 border-cyan-500 ring-2 ring-cyan-500/50 flex-shrink-0">
                          <AvatarImage src={notification.sender?.avatar} alt={notification.sender?.username} />
                          <AvatarFallback>{notification.sender?.username?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {renderNotificationIcon(notification.type)}
                            <p className="text-sm break-words">
                              {renderNotificationContent(notification)}
                            </p>
                          </div>
                          <p className="text-xs text-cyan-500 mt-1">
                            {formatTimestamp(notification.createdAt)}
                          </p>
                        </div>
                        {notification.type !== 'follow' && notification.post && (
                          <Link
                            href={notification.post?.type === 'comment' 
                              ? `/post/${notification.post.parentPost}`
                              : `/post/${notification.post?._id}`
                            }
                            className="text-cyan-400/50 hover:text-cyan-400 transition-colors duration-200 bg-gray-800/70 p-2 rounded-full flex-shrink-0"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  )
}