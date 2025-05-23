import { Button } from "./ui/button"
import { MessageCircle, Heart, Share } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

interface InteractionButtonsProps {
  post: {
    _id: string
    likes: string[]
    reposts: string[]
    comments: string[]
    author: {
      _id: string
    }
    type?: 'post' | 'comment'
  }
  onInteraction: (type: 'like' | 'repost' | 'comment', postId: string) => void
  size?: 'sm' | 'default'
  authorUsername?: string
}

export function InteractionButtons({ post, onInteraction, size = 'sm' }: InteractionButtonsProps) {
  const { data: session } = useSession()
  const userId = session?.user?.id || ''
  const isLiked = post.likes.includes(userId)
  const [optimisticLiked, setOptimisticLiked] = useState(isLiked)

  useEffect(() => {
    setOptimisticLiked(isLiked)
  }, [isLiked])

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!session?.user?.id) return

    setOptimisticLiked(!optimisticLiked)
    try {
      await onInteraction('like', post._id)
    } catch (error) {
      console.error('Error handling like:', error)
    }
  }

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const postUrl = `${window.location.origin}/post/${post._id}`
    
    try {
      await navigator.clipboard.writeText(postUrl)
      toast.success('Link copied to clipboard')
    } catch (error) {
      console.error('Failed to copy link:', error)
      toast.error('Failed to copy link')
    }
  }

  // Only show like button for comments
  if (post.type === 'comment') {
    return (
      <div className="flex items-center mt-2 text-cyan-400 text-sm">
        <Button 
          variant="ghost" 
          size={size}
          onClick={handleLike}
          className={`rounded-xl group transition-all duration-300 ease-in-out hover:scale-[1.02] overflow-hidden p-0 ${
            optimisticLiked ? 'text-pink-400 hover:text-pink-300' : 'hover:text-pink-400/90'
          }`}
        >
          <Heart className={`h-4 w-4 group-hover:animate-pulse ${optimisticLiked ? 'fill-pink-400' : ''}`} />
          <span className="ml-1">{optimisticLiked ? 
            post.likes.includes(userId) ? post.likes.length : post.likes.length + 1 
            : post.likes.includes(userId) ? post.likes.length - 1 : post.likes.length
          }</span>
        </Button>
      </div>
    )
  }

  // Show comment and like buttons for posts (removed repost button)
  return (
    <div className="flex items-center mt-4 text-cyan-400 text-sm">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size={size}
          onClick={(e) => {
            e.stopPropagation()
            onInteraction('comment', post._id)
          }}
          className="rounded-xl hover:text-cyan-300 group transition-all duration-300 ease-in-out hover:scale-[1.02] overflow-hidden p-0"
        >
          <MessageCircle className="h-4 w-4 group-hover:animate-pulse" />
          <span className="ml-1">{post.comments?.length || 0}</span>
        </Button>

        <Button 
          variant="ghost" 
          size={size}
          onClick={handleLike}
          className={`rounded-xl group transition-all duration-300 ease-in-out hover:scale-[1.02] overflow-hidden p-0 ${
            optimisticLiked ? 'text-pink-400 hover:text-pink-300' : 'hover:text-pink-400/90'
          }`}
        >
          <Heart className={`h-4 w-4 group-hover:animate-pulse ${optimisticLiked ? 'fill-pink-400' : ''}`} />
          <span className="ml-1">{optimisticLiked ? 
            post.likes.includes(userId) ? post.likes.length : post.likes.length + 1 
            : post.likes.includes(userId) ? post.likes.length - 1 : post.likes.length
          }</span>
        </Button>
      </div>
      <div className="ml-auto">
        <Button 
          variant="ghost" 
          size={size}
          onClick={handleShare}
          className="rounded-xl hover:text-cyan-300 group transition-all duration-300 ease-in-out hover:scale-[1.02] overflow-hidden p-0"
        >
          <Share className="h-4 w-4 group-hover:animate-pulse" />
        </Button>
      </div>
    </div>
  )
} 