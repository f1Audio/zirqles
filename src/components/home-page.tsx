'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useQueryClient } from '@tanstack/react-query'
import { usePosts, useComments, usePostMutations } from '@/queries/posts'
import { Navbar } from './layout/navbar'
import { Sidebar } from './layout/sidebar'
import { SearchDialog } from './layout/search-dialog'
import { Post } from './post'
import { PostComposer } from './post-composer'
import { LoadingSpinner } from './ui/loading-spinner'
import { InfiniteScrollSpinner } from './ui/infinite-scroll-spinner'
import { toast } from 'sonner'
import { useInView } from 'react-intersection-observer'
import React from 'react'

interface CommentState {
  [key: string]: string
}

function getUniquePostKey(post: any, pageIndex: number) {
  return `${post._id}-${pageIndex}`
}

export function HomePageComponent() {
  // Auth & Router
  const { data: session } = useSession()

  const queryClient = useQueryClient()

  // Local State
  const [newPost, setNewPost] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [expandedPost, setExpandedPost] = useState<string | null>(null)
  const [commentContent, setCommentContent] = useState<CommentState>({})

  // Queries & Mutations
  const { ref, inView } = useInView()
  const { 
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = usePosts()
  const { data: comments = [] } = useComments(expandedPost)
  const {likePost, repostPost, commentOnPost, deletePost } = usePostMutations(session)

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  const allPosts = data?.pages.flatMap(page => page.posts) || []

  // Event Handlers
  const handlePost = async (media?: { type: string; url: string; key: string }[]) => {
    // Allow empty content if media exists
    if (!newPost.trim() && (!media || media.length === 0)) {
      toast.error('Please add some content or media to your post')
      return
    }

    const payload = {
      content: newPost || '', // Allow empty content
      media: media || []
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
      
      // Update the posts cache with infinite query structure
      queryClient.setQueryData(['posts'], (old: any) => {
        if (!old?.pages) return old
        return {
          ...old,
          pages: [
            {
              ...old.pages[0],
              posts: [newPostData, ...(old.pages[0].posts || [])]
            },
            ...old.pages.slice(1)
          ]
        }
      })
      
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

  

  const handleDelete = async (postId: string) => {
    try {
      await deletePost.mutateAsync(postId)
    } catch (error) {
      console.error('Error deleting post:', error)
    }
  }

  if (!data) {
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
                {allPosts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-cyan-300 mb-2">No posts to show</p>
                    <p className="text-cyan-500 text-sm">
                      Follow some users to see their posts here, or create your own post!
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="text-xs text-cyan-500 mb-2">
                      Showing {allPosts.length} posts
                    </div>
                    {data?.pages.map((page, pageIndex) => (
                      <React.Fragment key={pageIndex}>
                        {page.posts.map((post: any) => (
                          <Post
                            key={getUniquePostKey(post, pageIndex)}
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
                      </React.Fragment>
                    ))}
                  </>
                )}
                
                {/* Loading trigger */}
                <div ref={ref}>
                  {isFetchingNextPage && <InfiniteScrollSpinner />}
                </div>
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

