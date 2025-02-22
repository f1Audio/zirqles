import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
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

export function useUser() {
  const { data: session, status } = useSession()
  
  return useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const response = await fetch('/api/user')
      if (!response.ok) {
        throw new Error('Failed to fetch user data')
      }
      const data = await response.json()
      return data
    },
    enabled: status === "authenticated" && !!session?.user?.id,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    initialData: session?.user ? {
      _id: session.user.id,
      username: session.user.username,
      avatar: session.user.avatar || session.user.image,
      email: session.user.email,
      followers: 0,
      following: 0
    } : undefined
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
    mutationFn: async ({ file, oldAvatar }: UpdateAvatarParams) => {
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

    onSuccess: async (newAvatar, { userId }) => {
      try {
        // Get fresh user data first
        const userResponse = await fetch('/api/user')
        const userData = await userResponse.json()

        // Batch all updates together
        await Promise.all([
          // 1. Update session
          update({
            ...session,
            user: {
              ...session?.user,
              avatar: newAvatar,
              username: userData.username,
              email: userData.email
            }
          }),

          // 2. Update queries silently (without triggering refreshes)
          queryClient.setQueryData(['user'], (old: any) => ({
            ...old,
            avatar: newAvatar,
            username: userData.username,
            email: userData.email
          })),

          queryClient.setQueryData(['user', userData.username], (old: any) => ({
            ...old,
            avatar: newAvatar
          })),

          // 3. Update posts cache silently
          queryClient.setQueriesData({ queryKey: ['posts'] }, (old: any) => {
            if (!Array.isArray(old)) return old;
            return old.map((post: any) => {
              if (post.author?._id === userId) {
                return {
                  ...post,
                  author: {
                    ...post.author,
                    avatar: newAvatar
                  }
                };
              }
              return post;
            });
          })
        ])

        // 4. Update Stream chat in background (non-blocking)
        if (session?.user?.id) {
          fetch('/api/stream/user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetUserId: session.user.id,
              name: userData.name || userData.username,
              avatar: newAvatar
            }),
          })
        }

        // 5. Force a single session refresh at the end
        await fetch('/api/auth/session')
       

      } catch (error) {
        console.error('Error in onSuccess:', error)
        // Still throw the error to trigger error handling
        throw error
      }
    }
  })
}

