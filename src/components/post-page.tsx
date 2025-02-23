'use client'

import { useQuery } from '@tanstack/react-query'
import { Post } from '@/components/post'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Navbar } from '@/components/layout/navbar'
import { Sidebar } from '@/components/layout/sidebar'
import { SearchDialog } from '@/components/layout/search-dialog'
import { useState } from 'react'
import { toast } from 'sonner'
import { useComments, usePostMutations } from '@/queries/posts'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'

interface PostPageProps {
  postId: string
}

export function PostPageComponent({ postId }: PostPageProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [commentContent, setCommentContent] = useState('')
  const { data: session, status } = useSession()
  const { likePost, repostPost, commentOnPost, deletePost } = usePostMutations(session)

  // Fetch the individual post
  const { data: post, isLoading, refetch: refetchPost } = useQuery({
    queryKey: ['post', postId],
    queryFn: async () => {
      const response = await fetch(`/api/posts/${postId}`)
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('unauthorized')
        }
        throw new Error('Failed to fetch post')
      }
      return response.json()
    },
    // Disable the query if not authenticated
    enabled: status === 'authenticated'
  })

  // Fetch comments for the post
  const { data: comments = [], refetch: refetchComments } = useComments(postId)

  const handleInteraction = async (
    type: 'like' | 'repost' | 'comment' | 'delete',
    postId: string,
    content?: string,
    commentId?: string
  ) => {
    try {
      switch (type) {
        case 'like':
          await likePost.mutateAsync(postId);
          await refetchPost();
          break;

        case 'repost':
          await repostPost.mutateAsync(postId);
          await refetchPost();
          break;

        case 'comment':
          if (!content) return;
          await commentOnPost.mutateAsync({ postId, content });
          setCommentContent('');
          await Promise.all([
            refetchComments(),
            refetchPost()
          ]);
          break;

        case 'delete':
          if (!commentId) {
            console.error('No commentId provided for delete operation');
            return;
          }
          await deletePost.mutateAsync(commentId);
          await Promise.all([
            refetchComments(),
            refetchPost()
          ]);
          break;
      }

    ;
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to perform action');
    }
  }

  const handleDelete = async (postId: string) => {
    try {
      await deletePost.mutateAsync(postId);
      await Promise.all([
        refetchComments(),
        refetchPost()
      ]);

    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  }

  // Show loading state while checking authentication
  if (status === 'loading') {
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

  // Show login prompt if not authenticated
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-cyan-300 font-mono flex items-center justify-center">
        <div className="text-center">
          <p className="text-cyan-300 mb-4">You need to be signed in to view this post</p>
          <Button 
            onClick={() => window.location.href = '/login'}
            className="bg-gradient-to-r from-cyan-700 via-cyan-600 to-cyan-500 
              hover:from-cyan-600 hover:via-cyan-500 hover:to-cyan-400 
              text-white font-medium rounded-full px-8 py-2
              transition-all duration-300 ease-in-out hover:scale-105
              shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40"
          >
            Go to Login
          </Button>
        </div>
      </div>
    )
  }

  // Show loading spinner while fetching post
  if (isLoading) {
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

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-cyan-300 font-mono">
        <Navbar onSearchOpen={() => setIsSearchOpen(true)} />
        <div className="min-h-[calc(100vh-4rem)]">
          <Sidebar />
          <main className="md:pl-64 h-[calc(100vh-4rem)]">
            <div className="flex items-center justify-center h-full">
              <p>Post not found</p>
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
        <main className="md:pl-64 pt-20">
          <div className="max-w-2xl mx-auto px-4">
            <Post
              post={post}
              isExpanded={true}
              onInteraction={handleInteraction}
              commentContent={commentContent}
              onCommentChange={setCommentContent}
              showComments={true}
              comments={comments}
              onDelete={handleDelete}
            />
          </div>
        </main>
      </div>
      <SearchDialog open={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </div>
  )
} 