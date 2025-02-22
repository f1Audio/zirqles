'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from './ui/loading-spinner'
import Link from 'next/link'
import { useUserMutations } from '@/queries/posts'
import { useSession } from 'next-auth/react'

interface UserListProps {
  username: string
  type: 'followers' | 'following'
}

export function UserList({ username, type }: UserListProps) {
  const { data: session } = useSession()
  const { followUser } = useUserMutations(session)
  const queryClient = useQueryClient()
  const [loadingUsers, setLoadingUsers] = useState<Set<string>>(new Set())
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['users', username, type],
    queryFn: async () => {
      const response = await fetch(`/api/users/${username}/${type}`)
      if (!response.ok) {
        const errorData = await response.json()
        console.error('API error:', errorData)
        throw new Error('Failed to fetch users')
      }
      return response.json()
    },
    enabled: !!username && !!session
  })

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 rounded-xl bg-gray-800/50">
        <p className="text-red-500">Error loading users</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 rounded-xl bg-gray-800/50">
        <LoadingSpinner />
      </div>
    )
  }

  if (!data?.users?.length) {
    return (
      <div className="flex items-center justify-center p-8 rounded-xl bg-gray-800/50">
        <p className="text-cyan-500/70">No {type} found</p>
      </div>
    )
  }

  const handleFollow = async (targetUsername: string) => {
    if (!session) return
    try {
      // Set loading state for this specific user
      setLoadingUsers(prev => new Set(prev).add(targetUsername))

      // Optimistically update the UI
      queryClient.setQueryData(['users', username, type], (old: any) => ({
        ...old,
        users: old.users.map((user: any) => 
          user.username === targetUsername || user.name === targetUsername
            ? { ...user, isFollowing: !user.isFollowing }
            : user
        )
      }))

      await followUser.mutateAsync(targetUsername)

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['user', username] })
      if (session.user?.username) {
        queryClient.invalidateQueries({ queryKey: ['user', session.user.username] })
      }
    } catch (error) {
      // Revert optimistic update on error
      queryClient.setQueryData(['users', username, type], (old: any) => ({
        ...old,
        users: old.users.map((user: any) => 
          user.username === targetUsername || user.name === targetUsername
            ? { ...user, isFollowing: !user.isFollowing }
            : user
        )
      }))
      console.error('Error following user:', error)
    } finally {
      // Remove loading state for this user
      setLoadingUsers(prev => {
        const next = new Set(prev)
        next.delete(targetUsername)
        return next
      })
    }
  }

  return (
    <div className="space-y-2 max-h-[70vh] overflow-y-auto">
      {data.users.map((user: any) => (
        <div 
          key={user._id || user.id}
          className="p-4 rounded-2xl hover:bg-gray-800/50 transition-all duration-200 border border-cyan-500/10"
        >
          <div className="flex items-center justify-between gap-4">
            <Link 
              href={`/user/${user.username || user.name}`}
              className="flex items-center gap-4 flex-1 group"
            >
              <Avatar className="h-12 w-12 ring-2 ring-cyan-500/50 ring-offset-2 ring-offset-gray-800 transition-all duration-200 group-hover:ring-cyan-400">
                <AvatarImage src={user.avatar} alt={user.username || user.name} />
                <AvatarFallback className="bg-cyan-900/50 text-cyan-100">
                  {(user.username || user.name)[0]}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h3 className="font-semibold text-cyan-100 truncate group-hover:text-cyan-300 transition-colors">
                  @{user.username || user.name}
                </h3>
                {user.bio && (
                  <p className="text-sm text-cyan-300/70 line-clamp-1 group-hover:text-cyan-200/70 transition-colors">
                    {user.bio}
                  </p>
                )}
              </div>
            </Link>
            {session?.user?.username !== (user.username || user.name) && (
              <Button
                onClick={() => handleFollow(user.username || user.name)}
                disabled={loadingUsers.has(user.username || user.name)}
                className={`rounded-full transition-all duration-200 ${
                  user.isFollowing 
                    ? 'bg-gray-700 hover:bg-gray-600 text-cyan-300 hover:text-cyan-200 border border-gray-600'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                }`}
                size="sm"
              >
                {loadingUsers.has(user.username || user.name) ? (
                  <LoadingSpinner className="w-4 h-4" />
                ) : (
                  user.isFollowing ? 'Following' : 'Follow'
                )}
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
} 