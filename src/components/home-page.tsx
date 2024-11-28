'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { usePosts, useReplies, usePostMutations } from '@/queries/posts'
import { Navbar } from './layout/navbar'
import { Sidebar } from './layout/sidebar'
import { SearchDialog } from './layout/search-dialog'
import { Post } from './post'
import { PostComposer } from './post-composer'
import { LoadingSpinner } from './ui/loading-spinner'
import { toast } from 'sonner'

interface ReplyState {
  [key: string]: string
}

export function HomePageComponent() {
  // Auth & Router
  const { data: session } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()

  // Local State
  const [newPost, setNewPost] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [expandedPost, setExpandedPost] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState<ReplyState>({})

  // Queries & Mutations
  const { data: posts = [], isLoading: postsLoading } = usePosts()
  const { data: replies = [], isLoading: repliesLoading } = useReplies(expandedPost)
  const { likePost, repostPost, replyToPost } = usePostMutations(session)

  // Event Handlers
  const handlePost = async () => {
    if (!newPost.trim()) return

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newPost }),
      })

      if (!response.ok) throw new Error('Failed to create post')
      
      const newPostData = await response.json()
      
      // Update the posts cache optimistically
      queryClient.setQueryData(['posts'], (old: any[] = []) => [newPostData, ...old])
      
      // Update the user profile posts cache optimistically
      if (session?.user?.username) {
        queryClient.setQueryData(['user', session.user.username, 'posts'], (old: any[] = []) => 
          [newPostData, ...old]
        )
      }
      
      // Invalidate only the posts queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['posts'] }),
        queryClient.invalidateQueries({ 
          queryKey: ['user', session?.user?.username, 'posts'],
          exact: true 
        })
      ])
      
      setNewPost('')
      toast.success('Post created successfully')
    } catch (error) {
      console.error('Error creating post:', error)
      toast.error('Failed to create post')
    }
  }

  const handleInteraction = async (
    type: 'like' | 'repost' | 'reply',
    postId: string,
    content?: string
  ) => {
    try {
      switch (type) {
        case 'like':
          await likePost.mutateAsync(postId)
          break
        case 'repost':
          await repostPost.mutateAsync(postId)
          break
        case 'reply':
          if (!content) return
          await replyToPost.mutateAsync({ postId, content })
          setReplyContent(prev => ({
            ...prev,
            [postId]: ''
          }))
          break
      }
    } catch (error) {
      console.error(`Error handling ${type}:`, error)
    }
  }

  // Prefetch replies on post hover
  const handlePostHover = (postId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['replies', postId],
      queryFn: async () => {
        const response = await fetch(`/api/posts/${postId}/reply`)
        if (!response.ok) throw new Error('Failed to fetch replies')
        return response.json()
      }
    })
  }

  useEffect(() => {
    // Prefetch current user's profile data
    if (session?.user?.username) {
      queryClient.prefetchQuery({
        queryKey: ['user', session.user.username],
        queryFn: async () => {
          const response = await fetch(`/api/users/${session.user.username}`)
          if (!response.ok) throw new Error('Failed to fetch user data')
          return response.json()
        }
      })
    }
  }, [session?.user?.username, queryClient])

  if (postsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-cyan-300 font-mono">
        <Navbar onSearchOpen={() => setIsSearchOpen(true)} />
        <div className="min-h-[calc(100vh-4rem)]">
          <Sidebar />
          <main className="md:pl-64 h-[calc(100vh-4rem)]">
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner />
            </div>
          </main>
        </div>
        <SearchDialog open={isSearchOpen} onOpenChange={setIsSearchOpen} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-cyan-300 font-mono">
      <Navbar onSearchOpen={() => setIsSearchOpen(true)} />

      <div className="min-h-[calc(100vh-4rem)]">
        <Sidebar />

        <main className="md:pl-64">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto pb-20 md:pb-8">
              {/* Post composer */}
              <div className="pt-20">
                <PostComposer
                  value={newPost}
                  onChange={setNewPost}
                  onSubmit={handlePost}
                />
              </div>

              {/* Posts Feed */}
              <div className="pt-4">
                {posts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-cyan-300 mb-2">No posts to show</p>
                    <p className="text-cyan-500 text-sm">
                      Follow some users to see their posts here, or create your own post!
                    </p>
                  </div>
                ) : (
                  posts.map((post: any) => (
                    <Post
                      key={post._id}
                      post={post}
                      isExpanded={expandedPost === post._id}
                      onExpand={setExpandedPost}
                      onInteraction={handleInteraction}
                      replyContent={replyContent[post._id] || ''}
                      onReplyChange={(content) => setReplyContent(prev => ({
                        ...prev,
                        [post._id]: content
                      }))}
                      showReplies={expandedPost === post._id}
                      replies={expandedPost === post._id ? replies : []}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      <SearchDialog 
        open={isSearchOpen} 
        onOpenChange={setIsSearchOpen}
      />
    </div>
  )
}

