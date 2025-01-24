'use client'

import { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { InteractionButtons } from './interaction-buttons'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { UserData } from '@/queries/user'
import Image from 'next/image'
import { MoreVertical, Trash2 } from 'lucide-react'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from '@/lib/utils'

interface Author {
  _id: string
  username: string
  avatar?: string
}

interface Comment {
  _id: string
  content: string
  author: Author
  likes: string[]
  reposts: string[]
  comments: Comment[]
  type: 'comment'
  depth: number
  createdAt: string
}

interface PostProps {
  post: {
    _id: string
    content: string
    author: Author
    likes: string[]
    reposts: string[]
    comments: Comment[]
    type: 'post' | 'comment'
    depth: number
    createdAt: string
    media?: {
      type: 'image' | 'video'
      url: string
      key: string
    }[]
  }
  isExpanded?: boolean
  onExpand?: (postId: string | null) => void
  onInteraction?: (type: 'like' | 'repost' | 'comment', postId: string, content?: string) => void
  commentContent?: string
  onCommentChange?: (content: string) => void
  showComments?: boolean
  comments?: Comment[]
  className?: string
  onDelete?: (postId: string) => void
}

const MediaDisplay = ({ media }: { media: Array<{ type: string; url: string }> }) => {
  if (!media || media.length === 0) return null;
  
  return (
    <div className="mt-2 grid grid-cols-2 gap-2">
      {media.map((item, index) => (
        <div key={index} className="relative">
          {item.type === 'image' ? (
            <div className="aspect-square relative overflow-hidden rounded-xl">
              <Image 
                src={item.url} 
                alt="" 
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                loading="lazy"
              />
            </div>
          ) : item.type === 'video' ? (
            <div className="aspect-square relative overflow-hidden rounded-xl">
              <video 
                src={item.url} 
                className="absolute w-full h-full object-cover"
                controls
                preload="metadata"
                onLoadedMetadata={(e) => {
                  const video = e.target as HTMLVideoElement;
                  // Force pause and seek to first frame
                  video.pause();
                  video.currentTime = 0.001; // Seek to first frame
                  
                  // Once we've seeked to the first frame
                  video.addEventListener('seeked', () => {
                    try {
                      const canvas = document.createElement('canvas');
                      canvas.width = video.videoWidth;
                      canvas.height = video.videoHeight;
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        video.poster = canvas.toDataURL('image/jpeg');
                      }
                    } catch (error) {
                      console.error('Error generating video thumbnail:', error);
                    }
                  }, { once: true }); // Only run this once
                }}
                // Prevent any kind of autoplay
                autoPlay={false}
                muted={true}
                playsInline={true}
                // Add load handler to ensure video starts paused
                onLoadStart={(e) => {
                  const video = e.target as HTMLVideoElement;
                  video.pause();
                }}
                // Add canplay handler as additional safety
                onCanPlay={(e) => {
                  const video = e.target as HTMLVideoElement;
                  video.pause();
                }}
              />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
};

export function Post({
  post,
  isExpanded,
  onExpand,
  onInteraction,
  commentContent = '',
  onCommentChange,
  showComments = false,
  comments = [],
  className = '',
  onDelete
}: PostProps) {
  const { data: session } = useSession()
  const [isHovered, setIsHovered] = useState(false)
  const [localIsExpanded, setLocalIsExpanded] = useState(false)
  const [localCommentContent, setLocalCommentContent] = useState('')
  const queryClient = useQueryClient()

  const prefetchUserData = useCallback(() => {
    if (post.author?.username) {
      queryClient.prefetchQuery({
        queryKey: ['user', post.author.username],
        queryFn: async () => {
          const response = await fetch(`/api/users/${post.author.username}`)
          if (!response.ok) throw new Error('Failed to fetch user data')
          return response.json()
        }
      })
    }
  }, [post.author?.username, queryClient])

  const handleInteraction = useCallback((type: 'like' | 'repost' | 'comment', postId: string) => {
    if (!post._id) {
      console.error('No post ID available for interaction')
      return
    }
    
    if (type === 'comment') {
      // For root post, use the parent's expand handler
      if (post.type === 'post') {
        onExpand?.(isExpanded ? null : post._id)
      } else {
        // For comments, use local state
        setLocalIsExpanded(!localIsExpanded)
      }
    }
    onInteraction?.(type, post._id)
  }, [post._id, post.type, isExpanded, localIsExpanded, onExpand, onInteraction])

  const handleLocalCommentSubmit = useCallback(() => {
    if (localCommentContent.trim()) {
      onInteraction?.('comment', post._id, localCommentContent)
      setLocalCommentContent('')
      setLocalIsExpanded(false)
    }
  }, [post._id, localCommentContent, onInteraction])

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDelete) {
      onDelete(post._id)
    }
  }, [post._id, onDelete])

  const handleCommentClick = (username?: string) => {
    // For root post, use the parent's expand handler
    if (post.type === 'post') {
      onExpand?.(isExpanded ? null : post._id)
      // Don't prefill username for main posts
    } else {
      // For comments, use local state and prefill username
      setLocalIsExpanded(!localIsExpanded)
      
      // Only prefill username when replying to comments
      if (username) {
        if (post.type === 'comment') {
          setLocalCommentContent(`@${username} `)
        } else {
          setLocalCommentContent(`@${username} `)
        }
      }
    }
  }

  // Determine if this post should show the comment form and comments
  const shouldShowCommentForm = post.type === 'post' ? isExpanded : localIsExpanded
  const shouldShowComments = post.type === 'post' ? showComments : localIsExpanded
  
  // Use the appropriate comment content based on post type
  const currentCommentContent = post.type === 'post' ? commentContent : localCommentContent
  const handleCommentChange = post.type === 'post' 
    ? onCommentChange 
    : setLocalCommentContent

  return (
    <div 
      className={`border bg-cyan-900/20 border-cyan-500/30 shadow-lg shadow-cyan-500/10 
        transition-all duration-300 ease-in-out rounded-xl
        ${post.type === 'post' 
          ? 'backdrop-blur-sm bg-cyan-900/20 mb-4 p-3 sm:p-4' 
          : 'mb-2 p-3'
        } ${className}`}
    >
      <div className="flex items-start space-x-4">
        <Link href={`/user/${post.author.username}`}>
          <Avatar className={`flex-shrink-0 ring-2 ring-cyan-500 ring-offset-2 ring-offset-gray-900 cursor-pointer 
            ${post.type === 'comment' ? 'w-8 h-8' : 'w-10 h-10'}`}>
            <AvatarImage 
              src={post.author.avatar} 
              alt={post.author.username} 
            />
            <AvatarFallback className="bg-gray-900 text-cyan-300">
              {post.author.username[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Link 
                href={`/user/${post.author.username}`}
                onMouseEnter={prefetchUserData}
              >
                <span className={`font-semibold text-cyan-300 hover:text-cyan-200 cursor-pointer ${
                  post.type === 'comment' ? 'text-sm' : ''
                }`}>
                  {post.author.username}
                </span>
              </Link>
              <span className={`text-cyan-500 ${post.type === 'comment' ? 'text-xs' : 'text-sm'}`}>
                @{post.author.username.toLowerCase()}
              </span>
            </div>
            
            {session?.user?.id === post.author._id && (
              <DropdownMenu>
                <DropdownMenuTrigger className={`absolute ${post.type === 'comment' ? 'top-2' : 'top-4'} right-4`}>
                  <MoreVertical className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="bg-gray-800/95 border border-cyan-500/20 backdrop-blur-sm rounded-xl shadow-lg"
                >
                  <DropdownMenuItem
                    className="flex items-center px-3 py-2 text-sm focus:text-red-400 text-red-400 cursor-pointer transition-all duration-200"
                    onClick={handleDelete}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete Post</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          <p className={`mt-1 break-words whitespace-pre-wrap ${
            post.type === 'comment' ? 'text-sm text-cyan-100/90' : 'text-cyan-100'
          }`}>
            {post.content}
          </p>

          {post.media && post.media.length > 0 && (
            <MediaDisplay media={post.media} />
          )}

          <InteractionButtons
            post={{
              _id: post._id,
              likes: post.likes,
              reposts: post.reposts,
              comments: post.comments.map(c => c._id),
              author: {
                _id: post.author._id
              },
              type: post.type,
              depth: post.depth
            }}
            onInteraction={handleInteraction}
            size="sm"
            authorUsername={post.author.username}
            onCommentClick={handleCommentClick}
          />

          {/* Comments */}
          {shouldShowComments && comments.length > 0 && (
            <div className={`mt-2 space-y-2 ${post.type === 'post' ? 'border-t border-cyan-500/30 pt-4' : ''}`}>
              {comments.map((comment) => {
                // Handle both string IDs and comment objects
                if (typeof comment === 'string') {
                  console.warn('Comment received as string ID, skipping render:', comment)
                  return null
                }
                
                // Skip rendering if comment doesn't have a valid ID
                if (!comment?._id) {
                  console.warn('Comment missing ID:', comment)
                  return null
                }
                
                return (
                  <Post
                    key={`comment-${post._id}-${comment._id}-${Date.parse(comment.createdAt) || Date.now()}`}
                    post={comment}
                    isExpanded={false}
                    onExpand={onExpand}
                    onInteraction={onInteraction}
                    commentContent=""
                    onCommentChange={onCommentChange}
                    showComments={false}
                    comments={Array.isArray(comment.comments) ? comment.comments.filter(c => typeof c !== 'string') : []}
                    onDelete={onDelete}
                    className={`${comment.depth > 0 ? 'ml-8' : ''}`}
                  />
                )
              })}
            </div>
          )}

          {/* Comment section - Moved below comments */}
          {shouldShowCommentForm && (
            <div className="mt-4 space-y-4 border-t border-cyan-500/20 pt-4">
              <textarea
                value={currentCommentContent}
                onChange={(e) => handleCommentChange?.(e.target.value)}
                placeholder="Write your comment..."
                className="w-full bg-cyan-900/30 border border-cyan-500/30 rounded-xl p-3 text-sm text-cyan-100 placeholder-cyan-500/50 focus:outline-none focus:border-cyan-400"
              />
              <Button
                onClick={post.type === 'post' 
                  ? () => onInteraction?.('comment', post._id, currentCommentContent)
                  : handleLocalCommentSubmit
                }
                disabled={!currentCommentContent?.trim()}
                className="bg-gradient-to-r from-cyan-700 via-cyan-600 to-cyan-500 hover:from-cyan-600 hover:via-cyan-500 hover:to-cyan-400 text-white font-medium rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-md hover:shadow-cyan-500/20"
              >
                Comment
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 