import { Button } from "./ui/button"
import { MessageCircle, Repeat2, Heart, Share } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { createNotification } from '@/lib/notifications'

interface InteractionButtonsProps {
  post: {
    _id: string
    likes: string[]
    reposts: string[]
    replies: string[]
    author: {
      _id: string
    }
  }
  onInteraction: (type: 'like' | 'repost' | 'reply', postId: string) => void
  size?: 'sm' | 'default'
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
      if (!optimisticLiked && post.author._id !== session.user.id) {
        await createNotification({
          recipient: post.author._id,
          sender: session.user.id,
          type: 'like',
          post: post._id
        })
      }
    } catch (error) {
      console.error('Error handling like:', error)
    }
  }

  return (
    <div className="flex items-center mt-4 text-cyan-400 text-sm">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size={size}
          onClick={(e) => {
            e.stopPropagation()
            onInteraction('reply', post._id)
          }}
          className="rounded-xl hover:text-cyan-300 group transition-all duration-300 ease-in-out hover:scale-[1.02] overflow-hidden p-0"
        >
          <MessageCircle className="h-4 w-4 group-hover:animate-pulse" />
          <span className="ml-1">{post.replies.length}</span>
        </Button>
        <Button 
          variant="ghost" 
          size={size}
          onClick={(e) => {
            e.stopPropagation()
            onInteraction('repost', post._id)
          }}
          className="rounded-xl hover:text-cyan-300 group transition-all duration-300 ease-in-out hover:scale-[1.02] overflow-hidden p-0"
        >
          <Repeat2 className="h-4 w-4 group-hover:animate-pulse" />
          <span className="ml-1">{post.reposts.length}</span>
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
          className="rounded-xl hover:text-cyan-300 group transition-all duration-300 ease-in-out hover:scale-[1.02] overflow-hidden p-0"
        >
          <Share className="h-4 w-4 group-hover:animate-pulse" />
        </Button>
      </div>
    </div>
  )
} 