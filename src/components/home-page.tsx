'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { usePosts, useComments, usePostMutations } from '@/queries/posts'
import { Navbar } from './layout/navbar'
import { Sidebar } from './layout/sidebar'
import { SearchDialog } from './layout/search-dialog'
import { Post } from './post'
import { PostComposer } from './post-composer'
import { LoadingSpinner } from './ui/loading-spinner'
import { toast } from 'sonner'

interface CommentState {
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
  const [commentContent, setCommentContent] = useState<CommentState>({})

  // Queries & Mutations
  const { data: posts = [], isLoading: postsLoading } = usePosts()
  const { data: comments = [] } = useComments(expandedPost)
  const { createPost, likePost, repostPost, commentOnPost, deletePost } = usePostMutations(session)

  // Add the user query
  const { data: userData } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const response = await fetch('/api/user')
      if (!response.ok) throw new Error('Failed to fetch user data')
      return response.json()
    },
    enabled: !!session?.user?.email
  })

  // Add debug logging
  useEffect(() => {
    console.log('Posts in component:', posts)
  }, [posts])

  // Use userData instead of session user data
  useEffect(() => {
    console.log('Posts data:', {
      postsLength: posts?.length || 0,
      firstPost: posts?.[0],
      isLoading: postsLoading,
      sessionStatus: session ? 'authenticated' : 'unauthenticated',
      currentUser: userData?.username // Use userData here
    })
  }, [posts, postsLoading, session, userData])

  // Event Handlers
  const handlePost = async (media?: { type: string; url: string; key: string }[]) => {
    if (!newPost.trim() && (!media || media.length === 0)) {
      toast.error('Please add some content or media to your post')
      return
    }

    const payload = {
      content: newPost,
      media: media || [] // Ensure media is always an array
    }

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create post')
      }

      const newPostData = await response.json()
      
      // Update the posts cache optimistically
      queryClient.setQueryData(['posts'], (old: any[] = []) => [newPostData, ...old])
      
      // Clear the form
      setNewPost('')
      
      toast.success('Post created successfully')
    } catch (error) {
      console.error('Error creating post:', error)
      toast.error('Failed to create post')
    }
  }

  const handleInteraction = async (
    type: 'like' | 'repost' | 'comment',
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
        case 'comment':
          if (!content) return
          await commentOnPost.mutateAsync({ postId, content })
          setCommentContent(prev => ({
            ...prev,
            [postId]: ''
          }))
          // Refetch comments for the parent post after adding a new comment
          queryClient.invalidateQueries({ queryKey: ['comments', postId] })
          break
      }
    } catch (error) {
      console.error(`Error handling ${type}:`, error)
    }
  }

  // Prefetch comments on post hover
  const handlePostHover = (postId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['comments', postId],
      queryFn: async () => {
        const response = await fetch(`/api/posts/${postId}/comments`)
        if (!response.ok) throw new Error('Failed to fetch comments')
        return response.json()
      }
    })
  }

  const handleDelete = async (postId: string) => {
    try {
      await deletePost.mutateAsync(postId)
    } catch (error) {
      console.error('Error deleting post:', error)
    }
  }

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
                  <>
                    {/* Add debug info */}
                    <div className="text-xs text-cyan-500 mb-2">
                      Showing {posts.length} posts
                    </div>
                    {posts.map((post: any) => (
                      <Post
                        key={post._id}
                        post={post}
                        isExpanded={expandedPost === post._id}
                        onExpand={setExpandedPost}
                        onInteraction={handleInteraction}
                        commentContent={commentContent[post._id] || ''}
                        onCommentChange={(content) => setCommentContent(prev => ({
                          ...prev,
                          [post._id]: content
                        }))}
                        showComments={expandedPost === post._id}
                        comments={expandedPost === post._id ? comments : []}
                        onDelete={handleDelete}
                      />
                    ))}
                  </>
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

