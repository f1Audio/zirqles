import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Session } from 'next-auth'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'
import { createNotification } from '@/lib/notifications'

export function useComments(postId: string | null) {
  return useQuery({
    queryKey: ['comments', postId],
    queryFn: async () => {
      if (!postId) return []
      const response = await fetch(`/api/posts/${postId}/comments`)
      if (!response.ok) throw new Error('Failed to fetch comments')
      const comments = await response.json()
      return comments.filter((comment: any) => typeof comment === 'object' && comment !== null)
    },
    enabled: !!postId, // Only fetch when postId is available
  })
}

export function usePosts() {
  const { data: session } = useSession()
  
  return useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const response = await fetch('/api/posts')
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized')
        }
        throw new Error('Failed to fetch posts')
      }
      const posts = await response.json()
      return posts || []
    },
    enabled: !!session, // Only fetch when user is logged in
  })
}

export function usePostMutations(session: Session | null) {
  const queryClient = useQueryClient()

  const likePost = useMutation({
    mutationFn: async (postId: string) => {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to like post')
      return response.json()
    },
    onMutate: async (postId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['posts'] })
      if (session?.user?.username) {
        await queryClient.cancelQueries({ 
          queryKey: ['user', session.user.username, 'posts'] 
        })
      }
      
      // Get current posts
      const previousPosts = queryClient.getQueryData(['posts'])
      const previousUserPosts = session?.user?.username ? 
        queryClient.getQueryData(['user', session.user.username, 'posts']) 
        : undefined

      // Optimistically update posts
      const updatePostsInCache = (old: any) => 
        old?.map((post: any) => {
          if (post._id === postId) {
            const userId = session?.user?.id
            const hasLiked = post.likes.includes(userId)
            return {
              ...post,
              likes: hasLiked 
                ? post.likes.filter((id: string) => id !== userId)
                : [...post.likes, userId]
            }
          }
          return post
        })

      queryClient.setQueryData(['posts'], updatePostsInCache)
      
      // Also update user's posts if on profile page
      if (session?.user?.username) {
        queryClient.setQueryData(
          ['user', session.user.username, 'posts'], 
          (old: any) => old?.posts ? {
            ...old,
            posts: updatePostsInCache(old.posts)
          } : old
        )
      }
      
      return { previousPosts, previousUserPosts }
    },
    onError: (err, postId, context) => {
      // Rollback on error
      queryClient.setQueryData(['posts'], context?.previousPosts)
      if (session?.user?.username) {
        queryClient.setQueryData(
          ['user', session.user.username, 'posts'], 
          context?.previousUserPosts
        )
      }
    },
    onSuccess: (updatedPost) => {
      // Update all relevant queries with the server response
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      if (session?.user?.username) {
        queryClient.invalidateQueries({ 
          queryKey: ['user', session.user.username, 'posts'] 
        })
      }
    }
  })

  const repostPost = useMutation({
    mutationFn: async (postId: string) => {
      const response = await fetch(`/api/posts/${postId}/repost`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to repost')
      return response.json()
    },
    onSuccess: (updatedPost) => {
      // Update the main posts cache
      queryClient.setQueryData(['posts'], (oldPosts: any) => 
        oldPosts?.map((post: any) => {
          // If this is the main post that was updated
          if (post._id === updatedPost._id) {
            return updatedPost
          }
          // If this post contains the reply that was updated
          if (post.replies?.some((reply: { _id: string }) => reply._id === updatedPost._id)) {
            return {
              ...post,
              replies: post.replies.map((reply: { _id: string }) => 
                reply._id === updatedPost._id ? updatedPost : reply
              )
            }
          }
          return post
        })
      )

      // Update all reply caches that might contain this post
      queryClient.getQueriesData({ queryKey: ['replies'] }).forEach(([queryKey]) => {
        queryClient.setQueryData(queryKey, (oldReplies: any) => {
          if (!oldReplies) return oldReplies
          return oldReplies.map((reply: any) => 
            reply._id === updatedPost._id ? updatedPost : reply
          )
        })
      })
    },
  })

  const commentOnPost = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!response.ok) throw new Error('Failed to comment')
      return response.json()
    },
    onSuccess: async (comment, { postId }) => {
      // Update comments cache with the full comment object
      queryClient.setQueryData(['comments', postId], (oldComments: any[] = []) => {
        // Filter out any string IDs and add the new comment
        const validComments = oldComments.filter(c => typeof c === 'object' && c !== null)
        return [...validComments, comment]
      })

      // Update post's comment count in posts cache
      queryClient.setQueryData(['posts'], (oldPosts: any) => 
        oldPosts?.map((post: any) => 
          post._id === postId 
            ? { 
                ...post, 
                comments: Array.isArray(post.comments) 
                  ? [...post.comments, comment]
                  : [comment]
              }
            : post
        )
      )

      // Create notification for the comment
      if (comment.author._id !== comment.post.author._id) {
        try {
          await createNotification({
            recipient: comment.post.author._id,
            sender: comment.author._id,
            type: 'comment',
            post: postId
          })
        } catch (error) {
          console.error('Failed to create comment notification:', error)
        }
      }

      // Invalidate queries to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['comments', postId] })
    },
  })

  const createPost = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!response.ok) throw new Error('Failed to create post')
      return response.json()
    },
    onSuccess: (newPost) => {
      // Update main posts feed
      queryClient.setQueryData(['posts'], (old: any[] = []) => [newPost, ...old])
      
      // Update profile posts if available
      if (session?.user?.username) {
        queryClient.setQueryData(
          ['user', session.user.username, 'posts'], 
          (old: any[] = []) => [newPost, ...old]
        )
      }
    }
  })

  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
     
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const error = await response.json()
        console.error('Delete response error:', error)
        throw new Error(error.error || 'Failed to delete post')
      }
      return response.json()
    },
    onMutate: async (postId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['posts'] })
      if (session?.user?.username) {
        await queryClient.cancelQueries({ 
          queryKey: ['user', session.user.username, 'posts'] 
        })
      }

      // Get current posts
      const previousPosts = queryClient.getQueryData(['posts'])
      const previousUserPosts = session?.user?.username ? 
        queryClient.getQueryData(['user', session.user.username, 'posts']) 
        : undefined

      // Optimistically remove post from cache
      const updatePostsInCache = (old: any[]) => 
        old?.filter((post: any) => post._id !== postId)

      queryClient.setQueryData(['posts'], updatePostsInCache)
      
      if (session?.user?.username) {
        queryClient.setQueryData(
          ['user', session.user.username, 'posts'], 
          (old: any) => old?.posts ? {
            ...old,
            posts: updatePostsInCache(old.posts)
          } : old
        )
      }

      return { previousPosts, previousUserPosts }
    },
    onError: (err, postId, context) => {
      // Rollback on error
      queryClient.setQueryData(['posts'], context?.previousPosts)
      if (session?.user?.username) {
        queryClient.setQueryData(
          ['user', session.user.username, 'posts'], 
          context?.previousUserPosts
        )
      }
      toast.error('Failed to delete post')
    },
    onSuccess: () => {
      toast.success('Post deleted successfully')
      // Refetch to ensure cache is in sync
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      if (session?.user?.username) {
        queryClient.invalidateQueries({ 
          queryKey: ['user', session.user.username, 'posts'] 
        })
      }
    }
  })

  return { likePost, repostPost, commentOnPost, createPost, deletePost }
}

export function useUserMutations(session: Session | null) {
  const queryClient = useQueryClient()

  const followUser = useMutation({
    mutationFn: async (username: string) => {
      const response = await fetch(`/api/users/${username}/follow`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to follow user')
      return response.json()
    },
    onMutate: async (username) => {
      // Cancel any outgoing refetches
      await Promise.all([
        queryClient.cancelQueries({ 
          queryKey: ['user', username],
          exact: true 
        }),
        queryClient.cancelQueries({ 
          queryKey: ['posts'],
          exact: true 
        })
      ])

      // Snapshot the previous values
      const previousData = queryClient.getQueryData(['user', username])
      const previousPosts = queryClient.getQueryData(['posts'])

      // Optimistically update to the new value
      queryClient.setQueryData(['user', username], (old: any) => {
        if (!old) return old
        const newIsFollowing = !old.isFollowing
        return {
          ...old,
          isFollowing: newIsFollowing,
          followers: newIsFollowing ? old.followers + 1 : old.followers - 1
        }
      })

      // Also update current user's following count if available
      if (session?.user?.username) {
        const previousCurrentUserData = queryClient.getQueryData(['user', session.user.username])
        queryClient.setQueryData(['user', session.user.username], (old: any) => {
          if (!old) return old
          const newIsFollowing = !old.isFollowing
          return {
            ...old,
            following: newIsFollowing ? old.following + 1 : old.following - 1
          }
        })
        return { previousData, previousCurrentUserData, previousPosts }
      }

      return { previousData, previousPosts }
    },
    onError: (err, username, context) => {
      // Roll back all updates on error
      queryClient.setQueryData(['user', username], context?.previousData)
      queryClient.setQueryData(['posts'], context?.previousPosts)
      if (session?.user?.username) {
        queryClient.setQueryData(
          ['user', session.user.username], 
          context?.previousCurrentUserData
        )
      }
      toast.error('Failed to update follow status')
    },
    onSuccess: (data, username) => {
      // Invalidate and refetch posts
      queryClient.invalidateQueries({ queryKey: ['posts'] })

      // Update user data without triggering a refetch
      queryClient.setQueryData(['user', username], (old: any) => {
        if (!old) return old
        return {
          ...old,
          isFollowing: data.isFollowing,
          followers: data.stats.target.followers,
          following: data.stats.target.following
        }
      })

      // Update current user's data if available
      if (session?.user?.username) {
        queryClient.setQueryData(['user', session.user.username], (old: any) => {
          if (!old) return old
          return {
            ...old,
            following: data.stats.current.following
          }
        })
      }

     
    }
  })

  return { followUser }
} 