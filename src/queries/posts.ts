import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { Session } from 'next-auth'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'


interface Post {
  _id: string
  content: string
  author: {
    _id: string
    username: string
    avatar?: string
  }
  likes: string[]
  reposts: string[]
  comments: any[]
  type: 'post' | 'comment'
  createdAt: string
  media?: Array<{ type: string; url: string; key: string }>
}

interface PaginatedResponse {
  posts: Post[]
  nextPage?: number
  totalPosts: number
}

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
  
  return useInfiniteQuery<PaginatedResponse>({
    queryKey: ['posts'],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await fetch(`/api/posts?page=${pageParam}&limit=10`)
      if (!response.ok) {
        if (response.status === 401) throw new Error('Unauthorized')
        throw new Error('Failed to fetch posts')
      }
      return response.json()
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
    enabled: !!session,
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
      const updatePagesInCache = (old: any) => {
        if (!old?.pages) return old
        
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((post: any) => {
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
          }))
        }
      }

      queryClient.setQueryData(['posts'], updatePagesInCache)
      
      // Also update user's posts if on profile page
      if (session?.user?.username) {
        queryClient.setQueryData(
          ['user', session.user.username, 'posts'], 
          updatePagesInCache
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
      queryClient.setQueryData(['posts'], (oldData: any) => {
        if (!oldData?.pages) return oldData
        
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((post: any) => {
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
          }))
        }
      })

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
        const validComments = oldComments.filter(c => typeof c === 'object' && c !== null)
        return [...validComments, comment]
      })

      // Update post's comment count in posts cache
      queryClient.setQueryData(['posts'], (oldData: any) => {
        if (!oldData?.pages) return oldData
        
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((post: any) => 
              post._id === postId 
                ? { 
                    ...post, 
                    comments: Array.isArray(post.comments) 
                      ? [...post.comments, comment]
                      : [comment]
                  }
                : post
            )
          }))
        }
      })

      // Also update user posts if we're on a profile page
      if (session?.user?.username) {
        queryClient.setQueryData(
          ['user', session.user.username, 'posts'],
          (oldData: any) => {
            if (!oldData?.pages) return oldData
            
            return {
              ...oldData,
              pages: oldData.pages.map((page: any) => ({
                ...page,
                posts: page.posts.map((post: any) => 
                  post._id === postId 
                    ? { 
                        ...post, 
                        comments: Array.isArray(post.comments) 
                          ? [...post.comments, comment]
                          : [comment]
                      }
                    : post
                )
              }))
            }
          }
        )
      }

      // Invalidate queries to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['comments', postId] })
    }
  })

  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete post')
      return response.json()
    },
    onMutate: async (postId) => {
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

      // Update posts cache
      const updatePagesInCache = (old: any) => {
        if (!old?.pages) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.filter((post: any) => post._id !== postId)
          }))
        }
      }

      queryClient.setQueryData(['posts'], updatePagesInCache)
      
      if (session?.user?.username) {
        queryClient.setQueryData(
          ['user', session.user.username, 'posts'],
          updatePagesInCache
        )
      }

      return { previousPosts, previousUserPosts }
    },
    onError: (err, postId, context) => {
      queryClient.setQueryData(['posts'], context?.previousPosts)
      if (session?.user?.username) {
        queryClient.setQueryData(
          ['user', session.user.username, 'posts'],
          context?.previousUserPosts
        )
      }
      toast.error('Failed to delete post')
    },
    onSuccess: (data) => {
      toast.success(data.type === 'comment' ? 'Comment deleted successfully' : 'Post deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['comments'] })
      if (session?.user?.username) {
        queryClient.invalidateQueries({ 
          queryKey: ['user', session.user.username, 'posts']
        })
      }
    }
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
      // Update main posts feed with infinite query structure
      queryClient.setQueryData(['posts'], (old: any) => {
        if (!old?.pages) return old
        return {
          ...old,
          pages: [
            {
              ...old.pages[0],
              posts: [newPost, ...(old.pages[0].posts || [])]
            },
            ...old.pages.slice(1)
          ]
        }
      })
      
      // Update profile posts if available
      if (session?.user?.username) {
        queryClient.setQueryData(['user', session.user.username, 'posts'], (old: any) => {
          if (!old?.pages) return old
          return {
            ...old,
            pages: [
              {
                ...old.pages[0],
                posts: [newPost, ...(old.pages[0].posts || [])]
              },
              ...old.pages.slice(1)
            ]
          }
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
      // Cancel relevant queries
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['profile', username] }),
        queryClient.cancelQueries({ queryKey: ['user', username] }),
        queryClient.cancelQueries({ queryKey: ['users', username, 'followers'] }),
        queryClient.cancelQueries({ queryKey: ['users', username, 'following'] })
      ])

      // Get snapshot of previous data
      const previousData = {
        profile: queryClient.getQueryData(['profile', username]),
        user: queryClient.getQueryData(['user', username]),
        userList: queryClient.getQueryData(['users', username, 'followers']) || 
                 queryClient.getQueryData(['users', username, 'following'])
      }

      // Optimistically update all relevant caches
      const updateCache = (old: any) => {
        if (!old) return old
        return {
          ...old,
          isFollowing: !old.isFollowing,
          followers: old.followers + (!old.isFollowing ? 1 : -1)
        }
      }

      queryClient.setQueryData(['profile', username], updateCache)
      queryClient.setQueryData(['user', username], updateCache)

      // Update user lists if they exist
      if (previousData.userList) {
        const updateUserInList = (old: any) => ({
          ...old,
          users: old.users?.map((user: any) => 
            user.username === username
              ? { ...user, isFollowing: !user.isFollowing }
              : user
          )
        })

        queryClient.setQueryData(['users', username, 'followers'], updateUserInList)
        queryClient.setQueryData(['users', username, 'following'], updateUserInList)
      }

      return previousData
    },
    onError: (err, username, context: any) => {
      // Revert all optimistic updates
      if (context?.profile) {
        queryClient.setQueryData(['profile', username], context.profile)
      }
      if (context?.user) {
        queryClient.setQueryData(['user', username], context.user)
      }
      if (context?.userList) {
        queryClient.setQueryData(['users', username, 'followers'], context.userList)
        queryClient.setQueryData(['users', username, 'following'], context.userList)
      }
    },
    onSuccess: (data, username) => {
      // Invalidate and refetch all relevant queries
      queryClient.invalidateQueries({ queryKey: ['profile', username] })
      queryClient.invalidateQueries({ queryKey: ['user', username] })
      queryClient.invalidateQueries({ queryKey: ['users', username, 'followers'] })
      queryClient.invalidateQueries({ queryKey: ['users', username, 'following'] })
      
      if (session?.user?.username) {
        queryClient.invalidateQueries({ queryKey: ['user', session.user.username] })
      }
    }
  })

  return { followUser }
}

export function useUserPosts(username: string) {
  return useInfiniteQuery<PaginatedResponse>({
    queryKey: ['user', username, 'posts'],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await fetch(`/api/users/${username}/posts?page=${pageParam}&limit=10`)
      if (!response.ok) throw new Error('Failed to fetch posts')
      return response.json()
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
    enabled: !!username,
  })
} 