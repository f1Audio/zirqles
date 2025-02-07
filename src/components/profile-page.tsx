'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useQueryClient } from '@tanstack/react-query'
import { usePosts, useComments, usePostMutations, useUserMutations, useUserPosts } from '@/queries/posts'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { MessageCircle, Repeat2, Heart, Share, UserPlus, Mail, MapPin, Calendar, Link as LinkIcon, ArrowLeft, Settings } from 'lucide-react'
import Link from 'next/link'
import { LoadingSpinner } from './ui/loading-spinner'
import { InteractionButtons } from './interaction-buttons'
import { Post } from './post'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { UserListDialog } from './user-list-dialog'
import { useStreamChat } from '@/contexts/StreamChatContext'
import { useInView } from 'react-intersection-observer'
import { InfiniteScrollSpinner } from './ui/infinite-scroll-spinner'
import React from 'react'

interface ProfilePageProps {
  username: string
}

interface UserData {
  _id: string
  username: string
  email: string
  avatar?: string
  bio?: string
  location?: string
  website?: string
  following?: string[]
  followers?: string[]
  createdAt: string
  updatedAt: string
  isFollowing?: boolean
  posts?: {
    _id: string
    content: string
    author: {
      _id: string
      username: string
      avatar?: string
    }
    likes: string[]
    reposts: string[]
    replies: string[]
    createdAt: string
    media?: string[]
  }[]
}

interface Post {
  _id: string
  content: string
  likes: string[]
  reposts: string[]
  comments: string[]
  type: 'post' | 'comment'
  depth: number
  createdAt: string
  media?: string[]
}

interface Comment {
  _id: string
  content: string
  author: {
    _id: string
    username: string
    avatar: string
  }
  likes: string[]
  reposts: string[]
  comments: string[]
  type: 'comment'
  depth: number
  createdAt: string
}

function getUniquePostKey(post: any, pageIndex: number) {
  return `${post._id}-${pageIndex}`
}

export function ProfilePageComponent({ username }: ProfilePageProps) {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const { likePost, repostPost, commentOnPost, deletePost } = usePostMutations(session)
  const { followUser } = useUserMutations(session)
  const [isLoading, setIsLoading] = useState(true)
  const [scrollPosition, setScrollPosition] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const [expandedPost, setExpandedPost] = useState<string | null>(null)
  const [commentContent, setCommentContent] = useState<{[key: string]: string}>({})
  const { data: comments = [] } = useComments(expandedPost)
  const [listType, setListType] = useState<'followers' | 'following' | null>(null)
  const { createChat, setActiveChannel } = useStreamChat()
  const { ref, inView } = useInView()
  
  const { 
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useUserPosts(username)

  const { data: currentUser } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const response = await fetch('/api/user')
      if (!response.ok) throw new Error('Failed to fetch user data')
      return response.json()
    },
    enabled: !!session?.user?.email
  })

  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['profile', username],
    queryFn: async () => {
      const response = await fetch(`/api/users/${username}`)
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/404')
          return null
        }
        throw new Error('Failed to fetch profile data')
      }
      return response.json()
    },
    enabled: !!username
  })

  const [isUsernameLong, setIsUsernameLong] = useState(false)
  const usernameRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const checkUsernameLength = () => {
      if (usernameRef.current) {
        const usernameWidth = usernameRef.current.scrollWidth
        const containerWidth = usernameRef.current.offsetWidth
        setIsUsernameLong(usernameWidth > containerWidth)
      }
    }

    checkUsernameLength()
    window.addEventListener('resize', checkUsernameLength)
    return () => window.removeEventListener('resize', checkUsernameLength)
  }, [username])

  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        setScrollPosition(scrollRef.current.scrollTop)
      }
    }

    const currentRef = scrollRef.current
    if (currentRef) {
      currentRef.addEventListener('scroll', handleScroll, { passive: true })
      return () => currentRef.removeEventListener('scroll', handleScroll)
    }
  }, [])

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  const allPosts = data?.pages.flatMap(page => page.posts) || []

  const handleFollow = async () => {
    if (!session) {
      toast.error('Please login to follow users')
      return
    }

    try {
      queryClient.setQueryData(['user', username], (old: any) => ({
        ...old,
        isFollowing: !old?.isFollowing,
        followers: (old?.followers || 0) + (!old?.isFollowing ? 1 : -1)
      }))

      await followUser.mutateAsync(username)
      
      queryClient.invalidateQueries({ queryKey: ['user', username] })
      if (session.user?.username) {
        queryClient.invalidateQueries({ queryKey: ['user', session.user.username] })
      }
    } catch (error) {
      queryClient.setQueryData(['user', username], (old: any) => ({
        ...old,
        isFollowing: !old?.isFollowing,
        followers: (old?.followers || 0) + (old?.isFollowing ? 1 : -1)
      }))
      console.error('Error following user:', error)
      toast.error('Failed to update follow status')
    }
  }

  const handleMessage = async () => {
    if (!session) {
      toast.error('Please login to send messages')
      return
    }

    try {
      // Ensure we have a valid target user ID
      const targetUserId = userData.id || userData._id
      if (!targetUserId) {
        console.error('Target user ID is missing:', userData)
        toast.error('Failed to open chat')
        return
      }

      // Create or get existing chat channel
      const channel = await createChat(targetUserId.toString())
      
      if (channel) {
        // Set as active channel
        setActiveChannel(channel)
        
        // Navigate to messages page
        router.push('/messages')
      } else {
        toast.error('Failed to open chat')
      }
    } catch (error) {
      console.error('Error opening chat:', error)
      toast.error('Failed to open chat')
    }
  }

  const handleInteraction = async (
    type: 'like' | 'repost' | 'comment',
    postId: string,
    content?: string
  ) => {
    if (!postId) {
      console.error('No postId provided for interaction:', type);
      return;
    }

    try {
      switch (type) {
        case 'like':
          await likePost.mutateAsync(postId);
          break;
        case 'repost':
          await repostPost.mutateAsync(postId);
          break;
        case 'comment':
          if (!content) return;
          await commentOnPost.mutateAsync({ postId, content });
          setCommentContent(prev => ({
            ...prev,
            [postId]: ''
          }));
          break;
      }
    } catch (error) {
      console.error(`Error handling ${type}:`, error);
      toast.error(`Failed to ${type} post`);
    }
  }

  const handleDelete = async (postId: string) => {
    try {
      await deletePost.mutateAsync(postId)
      // Cache will be automatically updated by the mutation
    } catch (error) {
      console.error('Error deleting post:', error)
      toast.error('Failed to delete post')
    }
  }

  const isOwnProfile = currentUser?.username === username

  const displayName = session?.user?.username === username 
    ? session.user.username 
    : userData?.name || session?.user?.username || 'Loading...'

  const displayAvatar = isOwnProfile
    ? currentUser?.avatar || session?.user?.avatar
    : userData?.avatar || session?.user?.avatar

  const avatarSection = (
    <Avatar className="w-24 h-24 ring-2 ring-purple-500 ring-offset-2 ring-offset-gray-900">
      <AvatarImage 
        src={displayAvatar} 
        alt={displayName} 
      />
      <AvatarFallback className="bg-gray-900 text-purple-300">
        {displayName.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  )

  if (userLoading || !userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-cyan-300 font-mono">
        <div className="min-h-[calc(100vh-4rem)] pt-14">
          <div className="md:pl-64 h-[calc(100vh-4rem)]">
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-cyan-300 font-mono">
      <div ref={scrollRef} className="min-h-[calc(100vh-4rem)] pt-14">
        {/* Header Section */}
        <div className="bg-gradient-to-b from-gray-900 via-gray-900/95 to-transparent">
          {/* Profile Info Container */}
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto pt-8 pb-20 md:pb-8">
              {/* Profile Header with Avatar */}
              <div className="flex flex-col gap-6">
                {/* Avatar and Name Section */}
                <div className="flex flex-col items-center text-center">
                  {avatarSection}
                  <div className="mt-4">
                    <h2 className="font-bold text-lg lg:text-2xl mb-1">
                      {displayName}
                    </h2>
                    <p className="text-cyan-500 text-sm lg:text-base">
                      @{username.toLowerCase().slice(0, 30)}
                    </p>
                  </div>
                </div>

                {/* Bio Section */}
                {userData.bio && (
                  <p className="text-sm text-cyan-100 whitespace-pre-wrap text-center max-w-md mx-auto">
                    {userData.bio}
                  </p>
                )}

                {/* User Metadata */}
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-cyan-300/80">
                  {userData.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{userData.location}</span>
                    </div>
                  )}
                  {userData.website && (
                    <div className="flex items-center gap-1">
                      <LinkIcon className="h-4 w-4" />
                      <Link 
                        href={userData.website}
                        className="text-cyan-400 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {userData.website.replace(/^https?:\/\//, '')}
                      </Link>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {userData.joinDate}</span>
                  </div>
                </div>

                {/* Following/Followers */}
                <div className="flex justify-center gap-6 text-sm">
                  <button
                    onClick={() => setListType('followers')}
                    className="hover:underline flex items-center gap-1"
                  >
                    <span className="font-bold text-cyan-100">
                      {userData?.followers || 0}
                    </span>
                    <span className="text-cyan-500">Followers</span>
                  </button>
                  <button
                    onClick={() => setListType('following')}
                    className="hover:underline flex items-center gap-1"
                  >
                    <span className="font-bold text-cyan-100">
                      {userData?.following || 0}
                    </span>
                    <span className="text-cyan-500">Following</span>
                  </button>
                </div>

                {/* Action Buttons - Now at the bottom */}
                <div className="flex justify-center gap-3 pt-2">
                  {isOwnProfile ? (
                    <Button
                      className="rounded-full bg-gray-800/80 hover:bg-gray-700 text-cyan-300 hover:text-cyan-200 border border-gray-700 px-6"
                      size="sm"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      <span>Edit Profile</span>
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={handleFollow}
                        disabled={followUser.isPending}
                        className={`rounded-full px-6 ${
                          userData?.isFollowing
                            ? 'bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-gray-200 border border-gray-700'
                            : 'bg-gradient-to-r from-cyan-700 via-cyan-600 to-cyan-500 hover:from-cyan-600 hover:via-cyan-500 hover:to-cyan-400 text-white'
                        }`}
                        size="sm"
                      >
                        {followUser.isPending ? (
                          <span className="flex items-center">
                            <LoadingSpinner className="w-4 h-4 mr-2" />
                            <span className="text-sm">
                              {userData?.isFollowing ? 'Unfollowing...' : 'Following...'}
                            </span>
                          </span>
                        ) : (
                          <span className="text-sm">
                            {userData?.isFollowing ? 'Following' : 'Follow'}
                          </span>
                        )}
                      </Button>
                      <Button 
                        onClick={handleMessage}
                        className="rounded-full bg-gray-800/80 hover:bg-gray-700 text-cyan-300 hover:text-cyan-200 px-6"
                        size="sm"
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        <span>Message</span>
                      </Button>
                    </>
                  )}
                </div>

                {/* User List Dialog */}
                {listType && (
                  <UserListDialog
                    username={username}
                    type={listType}
                    open={!!listType}
                    onOpenChange={(open) => !open && setListType(null)}
                  />
                )}
              </div>

              {/* Tabs with Post Count */}
              <div className="border-b border-cyan-500/20 mt-4">
                <div className="flex items-center">
                  <Button 
                    variant="ghost" 
                    className="relative text-cyan-300 rounded-none px-6 py-4 font-medium"
                  >
                    Posts {userData?.posts?.length || 0}
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500" />
                  </Button>
                </div>
              </div>

              {/* Posts Feed */}
              <div className="py-4">
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
                        onCommentChange={(content: string) => setCommentContent(prev => ({
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
                
                {/* Loading trigger */}
                <div ref={ref}>
                  {isFetchingNextPage && <InfiniteScrollSpinner />}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
