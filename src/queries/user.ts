import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import type { Session } from 'next-auth'
export interface UserData {
  _id: string
  username: string
  email: string
  avatar?: string
  bio?: string
  location?: string
  website?: string
  following?: string[]
  followers?: string[]
  createdAt: string
  updatedAt: string
}

export const userQueryKeys = {
  profile: (username?: string) => ['user', username],
  session: ['session'],
  posts: (username?: string) => ['user', username, 'posts'],
  allPosts: ['posts'],
  userPosts: ['userPosts']
}

export function useUser(username?: string) {
  const { data: session } = useSession()
  const queryClient = useQueryClient()

  return useQuery<UserData, Error>({
    queryKey: userQueryKeys.profile(username),
    queryFn: async () => {
      // Use current session username if it matches the requested username
      const isCurrentUser = session?.user?.username === username
      const apiPath = isCurrentUser ? '/api/user' : `/api/users/${username}`
      
      const response = await fetch(apiPath)
      if (!response.ok) throw new Error('Failed to fetch user')
      return response.json()
    },
    enabled: !!username,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 5,
    retry: false // Don't retry failed requests
  })
}

interface UpdateAvatarParams {
  file: File
  oldAvatar: string
  userId: string
}

export function useUpdateAvatar() {
  const queryClient = useQueryClient()
  const { data: session, update } = useSession()

  return useMutation({
    mutationFn: async ({ file, oldAvatar, userId }: UpdateAvatarParams) => {
      // Get presigned URL
      const presignedResponse = await fetch('/api/users/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: 'image/jpeg' }),
      })

      if (!presignedResponse.ok) {
        throw new Error('Failed to get upload URL')
      }

      const { uploadUrl, key } = await presignedResponse.json()

      // Upload to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': 'image/jpeg' },
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file')
      }

      // Update user record
      const updateResponse = await fetch('/api/users/avatar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          oldKey: oldAvatar.includes('amazonaws.com') ? oldAvatar.split('.com/')[1] : null
        }),
      })

      if (!updateResponse.ok) {
        throw new Error('Failed to update avatar')
      }

      const { avatar: newAvatar } = await updateResponse.json()
      return newAvatar
    },

    onMutate: async ({ file, userId }) => {
      const optimisticUrl = URL.createObjectURL(file)

      // Store previous states before canceling queries
      const previousData = {
        user: queryClient.getQueryData(['user']),
        userProfile: queryClient.getQueryData(['user', session?.user?.username]),
        userPosts: queryClient.getQueryData(['user', session?.user?.username, 'posts']),
        posts: queryClient.getQueryData(['posts']),
        replies: queryClient.getQueryData(['replies']),
        session: queryClient.getQueryData(['session'])
      }

      // Cancel queries
      await queryClient.cancelQueries()

      // Update user data
      queryClient.setQueryData(['user'], (old: any) => ({
        ...old,
        avatar: optimisticUrl
      }))

      queryClient.setQueryData(['user', session?.user?.username], (old: any) => ({
        ...old,
        avatar: optimisticUrl
      }))

      // Update posts with new avatar
      const updatePostsWithAvatar = (posts: any[] | undefined) => {
        if (!Array.isArray(posts)) return []
        return posts.map(post => updatePostAvatar(post, userId, optimisticUrl))
      }

      // Update all relevant caches
      queryClient.setQueriesData(
        { queryKey: ['user', session?.user?.username, 'posts'] },
        updatePostsWithAvatar
      )
      queryClient.setQueriesData({ queryKey: ['posts'] }, updatePostsWithAvatar)
      queryClient.setQueriesData({ queryKey: ['replies'] }, updatePostsWithAvatar)

      return { previousData, optimisticUrl }
    },

    onError: (error, variables, context) => {
      if (context?.previousData) {
        // Revert all caches atomically
        const { previousData } = context
        queryClient.setQueryData(['user'], previousData.user)
        queryClient.setQueryData(['user', session?.user?.username], previousData.userProfile)
        queryClient.setQueryData(['user', session?.user?.username, 'posts'], previousData.userPosts)
        queryClient.setQueryData(['posts'], previousData.posts)
        queryClient.setQueryData(['replies'], previousData.replies)
        queryClient.setQueryData(['session'], previousData.session)
      }
      
      if (context?.optimisticUrl) {
        URL.revokeObjectURL(context.optimisticUrl)
      }
    },

    onSuccess: async (newAvatar, { userId }, context) => {
      if (context?.optimisticUrl) {
        URL.revokeObjectURL(context.optimisticUrl)
      }

      // Update session
      await update({
        ...session,
        user: {
          ...session?.user,
          avatar: newAvatar
        }
      })

      // Update all caches with actual URL
      const updateDataWithNewAvatar = (data: any[] | undefined) => {
        if (!Array.isArray(data)) return []
        return data.map(item => updatePostAvatar(item, userId, newAvatar))
      }

      // Update all relevant caches
      queryClient.setQueriesData({ queryKey: ['user'] }, (old: any) => ({
        ...old,
        avatar: newAvatar
      }))

      queryClient.setQueriesData(
        { queryKey: ['user', session?.user?.username] },
        (old: any) => ({
          ...old,
          avatar: newAvatar
        })
      )

      queryClient.setQueriesData(
        { queryKey: ['user', session?.user?.username, 'posts'] },
        updateDataWithNewAvatar
      )
      queryClient.setQueriesData({ queryKey: ['posts'] }, updateDataWithNewAvatar)
      queryClient.setQueriesData({ queryKey: ['replies'] }, updateDataWithNewAvatar)

      // Force refetch to ensure consistency
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user'] }),
        queryClient.invalidateQueries({ queryKey: ['user', session?.user?.username] }),
        queryClient.invalidateQueries({ queryKey: ['user', session?.user?.username, 'posts'] }),
        queryClient.invalidateQueries({ queryKey: ['posts'] }),
        queryClient.invalidateQueries({ queryKey: ['replies'] })
      ])
    }
  })
}

// Helper function to update avatars in posts and replies
function updatePostAvatar(post: any, userId: string, newAvatar: string) {
  if (!post) return post
  
  return {
    ...post,
    author: post.author?._id === userId
      ? { ...post.author, avatar: newAvatar }
      : post.author,
    replies: Array.isArray(post.replies)
      ? post.replies.map((reply: any) => ({
          ...reply,
          author: reply.author?._id === userId
            ? { ...reply.author, avatar: newAvatar }
            : reply.author
        }))
      : post.replies
  }
} 