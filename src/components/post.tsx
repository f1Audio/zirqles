'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { InteractionButtons } from './interaction-buttons'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'

interface Author {
  _id: string
  username: string
  avatar?: string
}

interface Reply {
  _id: string
  content: string
  author: Author
  likes: string[]
  reposts: string[]
  replies: string[]
  createdAt: string
}

interface PostProps {
  post: {
    _id: string
    content: string
    author: Author
    likes: string[]
    reposts: string[]
    replies: string[]
    createdAt: string
  }
  isExpanded?: boolean
  onExpand?: (postId: string | null) => void
  onInteraction?: (type: 'like' | 'repost' | 'reply', postId: string, content?: string) => void
  replyContent?: string
  onReplyChange?: (content: string) => void
  showReplies?: boolean
  replies?: Reply[]
  className?: string
}

export function Post({
  post,
  isExpanded,
  onExpand,
  onInteraction,
  replyContent = '',
  onReplyChange,
  showReplies = false,
  replies = [],
  className = ''
}: PostProps) {
  const { data: session } = useSession()
  const [isHovered, setIsHovered] = useState(false)
  const queryClient = useQueryClient()

  const prefetchUserData = () => {
    queryClient.prefetchQuery({
      queryKey: ['user', post.author.username],
      queryFn: async () => {
        const response = await fetch(`/api/users/${post.author.username}`)
        if (!response.ok) throw new Error('Failed to fetch user data')
        return response.json()
      }
    })
  }

  const handleInteraction = (type: 'like' | 'repost' | 'reply', postId: string) => {
    if (!post._id) {
      console.error('No post ID available for interaction');
      return;
    }
    
    if (type === 'reply') {
      onExpand?.(isExpanded ? null : post._id);
    }
    onInteraction?.(type, post._id);
  }

  return (
    <div 
      className={`mb-4 bg-cyan-900/20 rounded-xl p-3 sm:p-4 backdrop-blur-sm border border-cyan-500/30 
        shadow-lg shadow-cyan-500/10 hover:shadow-cyan-400/30 hover:bg-cyan-800/30 
        transition-all duration-300 ease-in-out ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start space-x-4">
        <Link href={`/user/${post.author.username}`}>
          <Avatar className="flex-shrink-0 ring-2 ring-cyan-500 ring-offset-2 ring-offset-gray-900 cursor-pointer hover:opacity-80 transition-opacity duration-300">
            <AvatarImage 
              src={post.author.avatar || `/placeholder.svg?height=40&width=40&text=${post.author.username.charAt(0)}`}
              alt={post.author.username} 
            />
            <AvatarFallback className="bg-cyan-900 text-cyan-100">
              {post.author.username.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link 
              href={`/user/${post.author.username}`}
              onMouseEnter={prefetchUserData}
            >
              <span className="font-semibold text-cyan-300 hover:text-cyan-200 cursor-pointer">
                {post.author.username}
              </span>
            </Link>
            <span className="text-cyan-500 text-sm">
              @{post.author.username.toLowerCase()}
            </span>
          </div>
          
          <p className="mt-1 text-sm text-cyan-100 break-words whitespace-pre-wrap">
            {post.content}
          </p>

          <InteractionButtons
            post={post}
            onInteraction={(type) => handleInteraction(type, post._id)}
            size="sm"
          />

          {/* Reply section */}
          {isExpanded && (
            <div className="mt-4 space-y-4 border-t border-cyan-500/20 pt-4">
              <textarea
                value={replyContent}
                onChange={(e) => onReplyChange?.(e.target.value)}
                placeholder="Write your reply..."
                className="w-full bg-cyan-900/30 border border-cyan-500/30 rounded-xl p-3 text-sm text-cyan-100 placeholder-cyan-500/50 focus:outline-none focus:border-cyan-400"
              />
              <Button
                onClick={() => onInteraction?.('reply', post._id, replyContent)}
                disabled={!replyContent?.trim()}
                className="bg-gradient-to-r from-cyan-700 via-cyan-600 to-cyan-500 hover:from-cyan-600 hover:via-cyan-500 hover:to-cyan-400 text-white font-medium rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-md hover:shadow-cyan-500/20"
              >
                Reply
              </Button>
            </div>
          )}

          {/* Replies */}
          {showReplies && replies.length > 0 && (
            <div className="mt-4 space-y-4 border-t border-cyan-500/20 pt-4">
              {replies.map((reply) => (
                <Post
                  key={reply._id}
                  post={{
                    _id: reply._id,
                    content: reply.content,
                    author: reply.author,
                    likes: reply.likes,
                    reposts: reply.reposts,
                    replies: reply.replies,
                    createdAt: reply.createdAt
                  }}
                  onInteraction={onInteraction}
                  className="ml-4 border-l-2 border-cyan-500/20"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 