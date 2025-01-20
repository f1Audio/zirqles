'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from './ui/loading-spinner'
import Link from 'next/link'
import { useUserMutations } from '@/queries/posts'
import { useSession } from 'next-auth/react'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface UserListProps {
  username: string
  type: 'followers' | 'following'
}

export function UserList({ username, type }: UserListProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const { followUser } = useUserMutations(session)
  const queryClient = useQueryClient()
  
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
    console.error('Query error:', error)
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-red-500">Error loading users</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    )
  }

  if (!data?.users?.length) {
    return (
      <div className="flex items-center justify-center p-8 text-cyan-500/70">
        <p>No {type} found</p>
      </div>
    )
  }

  const handleFollow = async (targetUsername: string) => {
    if (!session) return
    try {
      // Optimistically update the UI
      queryClient.setQueryData(['users', username, type], (old: any) => ({
        ...old,
        users: old.users.map((user: any) => 
          user.username === targetUsername 
            ? { ...user, isFollowing: !user.isFollowing }
            : user
        )
      }))

      // Make the API call
      await followUser.mutateAsync(targetUsername)

      // Update the followers/following counts in the profile
      queryClient.invalidateQueries({ queryKey: ['user', username] })
      if (session.user?.username) {
        queryClient.invalidateQueries({ queryKey: ['user', session.user.username] })
      }
    } catch (error) {
      // Revert optimistic update on error
      queryClient.setQueryData(['users', username, type], (old: any) => ({
        ...old,
        users: old.users.map((user: any) => 
          user.username === targetUsername 
            ? { ...user, isFollowing: !user.isFollowing }
            : user
        )
      }))
      console.error('Error following user:', error)
    }
  }

  return (
    <div className="divide-y divide-cyan-500/20">
      {data.users.map((user: any) => (
        <div key={user.id} className="p-4 hover:bg-cyan-900/20 transition-colors">
          <div className="flex items-center justify-between">
            <Link href={`/user/${user.username}`} className="flex items-center gap-3 flex-1">
              <Avatar className="h-12 w-12 ring-2 ring-cyan-500 ring-offset-2 ring-offset-gray-900">
                <AvatarImage src={user.avatar} alt={user.username} />
                <AvatarFallback className="bg-cyan-900 text-cyan-100">
                  {user.username[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-cyan-100">@{user.username}</h3>
                {user.bio && (
                  <p className="text-sm text-cyan-300/70 line-clamp-1">{user.bio}</p>
                )}
              </div>
            </Link>
            {session?.user?.username !== user.username && (
              <Button
                onClick={() => handleFollow(user.username)}
                disabled={followUser.isPending}
                className={`rounded-full ${
                  user.isFollowing
                    ? 'bg-gray-800 hover:bg-gray-700 text-cyan-300 hover:text-cyan-200 border border-gray-700'
                    : 'bg-cyan-600 hover:bg-cyan-500'
                }`}
                size="sm"
              >
                {user.isFollowing ? 'Following' : 'Follow'}
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
} 