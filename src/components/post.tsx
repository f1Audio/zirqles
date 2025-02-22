'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { InteractionButtons } from './interaction-buttons'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import Image from 'next/image'
import { MoreVertical, Trash2, Heart, MoreHorizontal } from 'lucide-react'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from '@/lib/utils'
import { formatTextWithMentions } from '@/lib/utils'

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
  comments: string[]
  type: 'comment'
  createdAt: string
  media?: {
    type: 'image' | 'video'
    url: string
    key: string
  }[]
}

// First, let's define a proper discriminated union type for posts
interface BasePost {
  _id: string
  content: string
  author: Author
  likes: string[]
  reposts: string[]
  comments: string[]
  createdAt: string
  media?: {
    type: 'image' | 'video'
    url: string
    key: string
  }[]
}

interface MainPost extends BasePost {
  type: 'post'
}

interface CommentPost extends BasePost {
  type: 'comment'
}

type Post = MainPost | CommentPost

// Update PostProps to use the new Post type
interface PostProps {
  post: Post
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

// Add this helper function near the top of the file
function isCommentPost(post: Post): post is CommentPost {
  return post.type === 'comment'
}

// Add the formatTimestamp function near the top of the file
function formatTimestamp(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds}s`
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes}m`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours}h`
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days}d`
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }
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
                crossOrigin="anonymous"
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

// Update CommentLikeButton to receive optimisticLiked state
function CommentLikeButton({ 
  onInteraction,
  optimisticLiked
}: { 
  onInteraction: (type: 'like' | 'repost' | 'comment') => void 
  optimisticLiked: boolean
}) {
  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation()
    onInteraction('like')
  }

  return (
    <button
      onClick={handleLike}
      className={cn(
        "transition-colors duration-200",
        optimisticLiked ? 'text-pink-400 hover:text-pink-300' : 'text-gray-400 hover:text-pink-400/90'
      )}
    >
      <Heart className={cn(
        "h-4 w-4",
        optimisticLiked && "fill-pink-400"
      )} />
    </button>
  )
}

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [optimisticLiked, setOptimisticLiked] = useState(false)
  const queryClient = useQueryClient()
  const userId = session?.user?.id || ''

  // Update optimisticLiked when post.likes changes
  useEffect(() => {
    if (isCommentPost(post)) {
      setOptimisticLiked(post.likes.includes(userId))
    }
  }, [post, post.likes, userId])

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
    if (!postId) {
      console.error('No post ID available for interaction')
      return
    }
    
    if (type === 'like') {
      // Update main posts query
      queryClient.setQueryData(['posts'], (oldData: any) => {
        if (!oldData?.pages) return oldData
        
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((p: any) => {
              // Update comments within posts
              if (p.comments) {
                return {
                  ...p,
                  comments: p.comments.map((c: any) => {
                    if (c._id === post._id) {
                      const userId = session?.user?.id || ''
                      const hasLiked = c.likes.includes(userId)
                      return {
                        ...c,
                        likes: hasLiked 
                          ? c.likes.filter((id: string) => id !== userId)
                          : [...c.likes, userId]
                      }
                    }
                    return c
                  })
                }
              }
              // Update main post if it matches
              if (p._id === post._id) {
                const userId = session?.user?.id || ''
                const hasLiked = p.likes.includes(userId)
                return {
                  ...p,
                  likes: hasLiked 
                    ? p.likes.filter((id: string) => id !== userId)
                    : [...p.likes, userId]
                }
              }
              return p
            })
          }))
        }
      })

      // Also update individual post comments query if it exists
      const parentPostId = queryClient.getQueryData(['currentPostId'])
      if (parentPostId) {
        queryClient.setQueryData(['comments', parentPostId], (oldComments: any) => {
          if (!oldComments) return oldComments
          return oldComments.map((c: any) => {
            if (c._id === post._id) {
              const userId = session?.user?.id || ''
              const hasLiked = c.likes.includes(userId)
              return {
                ...c,
                likes: hasLiked 
                  ? c.likes.filter((id: string) => id !== userId)
                  : [...c.likes, userId]
              }
            }
            return c
          })
        })
      }
    } else if (type === 'comment') {
      // Handle comment expansion
      if (!isCommentPost(post)) {
        onExpand?.(isExpanded ? null : post._id)
      } else {
        setLocalIsExpanded(!localIsExpanded)
      }
    }
    
    onInteraction?.(type, post._id)
  }, [post, isExpanded, localIsExpanded, onExpand, onInteraction, session?.user?.id, queryClient])

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDelete) {
      onDelete(post._id)
    }
  }, [post._id, onDelete])

  // Determine if this post should show the comment form and comments
  const shouldShowCommentForm = !isCommentPost(post) ? isExpanded : localIsExpanded
  const shouldShowComments = !isCommentPost(post) ? showComments : localIsExpanded
  
  // Use the appropriate comment content based on post type
  const currentCommentContent = !isCommentPost(post) ? commentContent : localCommentContent
  const handleCommentChange = !isCommentPost(post) 
    ? onCommentChange 
    : setLocalCommentContent

  // Define handleCommentLike unconditionally
  const handleCommentLike = useCallback((type: 'like' | 'repost' | 'comment') => {
    if (type === 'like') {
      setOptimisticLiked(!optimisticLiked)
    }
    handleInteraction(type, post._id)
  }, [optimisticLiked, handleInteraction, post._id])

  // For comments, render a simpler view
  if (isCommentPost(post)) {
    return (
      <div 
        className="flex items-start space-x-3 py-2 px-1"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          if (!isDropdownOpen) {
            setIsHovered(false)
          }
        }}
        onTouchStart={() => setIsHovered(true)}
      >
        <Link href={`/user/${post.author.username}`} className="flex-shrink-0">
          <Avatar className="h-8 w-8 ring-2 ring-cyan-500/30 ring-offset-1 ring-offset-gray-900">
            <AvatarImage src={post.author.avatar} alt={post.author.username} />
            <AvatarFallback className="bg-gray-900 text-cyan-300">
              {post.author.username[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <Link href={`/user/${post.author.username}`}>
                  <span className="font-semibold text-sm text-cyan-300 hover:text-cyan-200">
                    {post.author.username}
                  </span>
                </Link>
                <span className="text-xs text-cyan-500/50">·</span>
                <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400">
                  {formatTimestamp(post.createdAt)}
                </span>
              </div>
              
              <p className="text-sm text-cyan-100/90 break-words whitespace-pre-wrap">
                {formatTextWithMentions(post.content).map((part, index) => {
                  if (part.type === 'mention') {
                    return (
                      <Link
                        key={index}
                        href={`/user/${part.username}`}
                        className="text-cyan-400 hover:text-cyan-300 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        @{part.username}
                      </Link>
                    )
                  }
                  return <span key={index}>{part.content}</span>
                })}
              </p>

              {post.media && post.media.length > 0 && (
                <div className="mt-2">
                  <MediaDisplay media={post.media} />
                </div>
              )}

              <div className="flex items-center gap-2 mt-1">
                {(optimisticLiked ? 
                  post.likes.includes(userId) ? post.likes.length : post.likes.length + 1 
                  : post.likes.includes(userId) ? post.likes.length - 1 : post.likes.length) > 0 && (
                  <p className="text-xs text-cyan-400">
                    {optimisticLiked ? 
                      post.likes.includes(userId) ? post.likes.length : post.likes.length + 1 
                      : post.likes.includes(userId) ? post.likes.length - 1 : post.likes.length
                    } {(optimisticLiked ? 
                      post.likes.includes(userId) ? post.likes.length : post.likes.length + 1 
                      : post.likes.includes(userId) ? post.likes.length - 1 : post.likes.length) === 1 ? 'like' : 'likes'}
                  </p>
                )}
                
                {(session?.user?.id === post.author._id && (isHovered || isDropdownOpen || window?.matchMedia('(max-width: 768px)').matches)) && (
                  <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                    <DropdownMenuTrigger className="text-gray-400 hover:text-gray-300 transition-colors duration-200">
                      <MoreHorizontal className="h-3 w-3" />
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
                        <span>Delete Comment</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            <div className="ml-4">
              <CommentLikeButton 
                onInteraction={handleCommentLike}
                optimisticLiked={optimisticLiked}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Regular post render remains the same
  return (
    <div className={`border bg-cyan-900/20 border-cyan-500/30 shadow-lg shadow-cyan-500/10 
      transition-all duration-300 ease-in-out rounded-xl backdrop-blur-sm mb-4 p-3 sm:p-4 ${className}`}
    >
      <div className="flex items-start space-x-4">
        <Link href={`/user/${post.author.username}`}>
          <Avatar className={cn(
            "flex-shrink-0 ring-2 ring-cyan-500 ring-offset-2 ring-offset-gray-900 cursor-pointer",
            isCommentPost(post) ? 'w-8 h-8' : 'w-10 h-10'
          )}>
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
                <span className={cn(
                  "font-semibold text-cyan-300 hover:text-cyan-200 cursor-pointer",
                  isCommentPost(post) && "text-sm"
                )}>
                  {post.author.username}
                </span>
              </Link>
              <span className="text-xs text-cyan-500/50">·</span>
              <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400">
                {formatTimestamp(post.createdAt)}
              </span>
            </div>
            
            {session?.user?.id === post.author._id && (
              <DropdownMenu>
                <DropdownMenuTrigger className={cn(
                  "absolute right-4",
                  isCommentPost(post) ? 'top-2' : 'top-4'
                )}>
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
          
          <p className={cn(
            "mt-1 break-words whitespace-pre-wrap",
            isCommentPost(post) ? 'text-sm text-cyan-100/90' : 'text-cyan-100'
          )}>
            {formatTextWithMentions(post.content).map((part, index) => {
              if (part.type === 'mention') {
                return (
                  <Link
                    key={index}
                    href={`/user/${part.username}`}
                    className="text-cyan-400 hover:text-cyan-300 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    @{part.username}
                  </Link>
                )
              }
              return <span key={index}>{part.content}</span>
            })}
          </p>

          {post.media && post.media.length > 0 && (
            <MediaDisplay media={post.media} />
          )}

          <InteractionButtons
            post={post}
            onInteraction={handleInteraction}
            size="sm"
            authorUsername={post.author.username}
          />

          {/* Update comments section styling */}
          {!isCommentPost(post) && (
            <>
              {shouldShowComments && comments.length > 0 && (
                <div className="mt-3 space-y-0.5 border-t border-cyan-500/20 pt-2">
                  {comments.map((comment) => (
                    <Post
                      key={comment._id}
                      post={comment}
                      onInteraction={onInteraction}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              )}

              {shouldShowCommentForm && (
                <div className="mt-3 border-t border-cyan-500/20 pt-3">
                  <textarea
                    value={currentCommentContent}
                    onChange={(e) => handleCommentChange?.(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full bg-transparent text-sm text-cyan-100 placeholder-cyan-300/50 focus:outline-none resize-none"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (currentCommentContent.trim()) {
                          onInteraction?.('comment', post._id, currentCommentContent);
                          if (!isCommentPost(post)) {
                            onCommentChange?.('');
                          } else {
                            setLocalCommentContent('');
                          }
                        }
                      }
                    }}
                  />
                  <Button
                    onClick={() => onInteraction?.('comment', post._id, currentCommentContent)}
                    disabled={!currentCommentContent?.trim()}
                    className="mt-2 bg-gradient-to-r from-cyan-700 via-cyan-600 to-cyan-500 hover:from-cyan-600 hover:via-cyan-500 hover:to-cyan-400 text-white text-sm font-medium rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-md hover:shadow-cyan-500/20"
                  >
                    Post
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
} 