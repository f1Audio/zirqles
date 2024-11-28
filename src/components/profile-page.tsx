'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useQueryClient } from '@tanstack/react-query'
import { usePosts, useReplies, usePostMutations, useUserMutations } from '@/queries/posts'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { MessageCircle, Repeat2, Heart, Share, UserPlus, Mail, MapPin, Calendar, Link as LinkIcon, ArrowLeft, Settings } from 'lucide-react'
import Link from 'next/link'
import { LoadingSpinner } from './ui/loading-spinner'
import { InteractionButtons } from './interaction-buttons'
import { Post } from './post'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

interface ProfilePageProps {
  username: string
}

interface UserData {
  id: string
  name: string
  handle: string
  avatar: string
  joinDate: string
  location: string
  website: string
  bio: string
  following: number
  followers: number
  posts: {
    id: string
    content: string
    likes: string[]
    reposts: string[]
    replies: string[]
    createdAt: string
  }[]
}

interface Post {
  _id: string
  content: string
  likes: string[]
  reposts: string[]
  replies: string[]
  createdAt: string
}

interface Reply {
  _id: string
  content: string
  author: {
    _id: string
    username: string
    avatar: string
  }
  createdAt: string
}

export function ProfilePageComponent({ username }: ProfilePageProps) {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const { likePost, repostPost, replyToPost } = usePostMutations(session)
  const { followUser } = useUserMutations(session)
  const [isLoading, setIsLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [scrollPosition, setScrollPosition] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const [expandedPost, setExpandedPost] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState<{[key: string]: string}>({})
  const [followStats, setFollowStats] = useState({
    following: 0,
    followers: 0
  })

  const { data: userData, isLoading: isUserDataLoading, error: userDataError } = useQuery({
    queryKey: ['user', username],
    queryFn: async () => {
      const response = await fetch(`/api/users/${username}`)
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/404')
          return null
        }
        throw new Error('Failed to fetch user data')
      }
      const data = await response.json()
      
      setIsFollowing(data.isFollowing)
      setFollowStats({
        following: data.following,
        followers: data.followers
      })
      
      return data
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false
  })

  const { data: userPosts = [] } = useQuery({
    queryKey: ['user', username, 'posts'],
    queryFn: async () => {
      const response = await fetch(`/api/users/${username}/posts`)
      if (!response.ok) throw new Error('Failed to fetch posts')
      const data = await response.json()
      return data.posts || []
    },
    enabled: !!username,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0
  })

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
    if (userData) {
      setIsFollowing(userData.isFollowing)
      setFollowStats({
        following: userData.following,
        followers: userData.followers
      })
    }
  }, [userData])

  const handleFollow = async () => {
    if (!session) {
      toast.error('Please login to follow users')
      return
    }

    try {
      const result = await followUser.mutateAsync(username)
      
      toast.success(result.isFollowing ? 'Followed successfully' : 'Unfollowed successfully')
    } catch (error) {
      console.error('Error following user:', error)
    }
  }

  const handleMessage = () => {
    // TODO: Implement messaging functionality
    console.log("Opening message dialog")
  }

  const handleInteraction = async (
    type: 'like' | 'repost' | 'reply',
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
        case 'reply':
          if (!content) return;
          await replyToPost.mutateAsync({ postId, content });
          setReplyContent(prev => ({
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

  const isOwnProfile = session?.user?.username === username

  if (isUserDataLoading) {
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

  if (userDataError || !userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-cyan-300 font-mono">
        <div className="min-h-[calc(100vh-4rem)] pt-14">
          <div className="md:pl-64 h-[calc(100vh-4rem)]">
            <div className="flex items-center justify-center h-full">
              <p>Error loading profile</p>
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
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div className="flex gap-8">
                    <Avatar className="w-24 h-24 ring-2 ring-purple-500 ring-offset-2 ring-offset-gray-900">
                      <AvatarImage src={userData.avatar} alt={userData.name} />
                      <AvatarFallback className="bg-gray-900 text-purple-300">
                        {userData.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col justify-center">
                      <h2 className="font-bold text-2xl mb-1">{userData.name}</h2>
                      <p className="text-cyan-500 text-lg">{userData.handle}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {isOwnProfile ? (
                      <Link href="/settings">
                        <Button
                          className="rounded-full bg-gray-800 hover:bg-gray-700 text-cyan-300 hover:text-cyan-200 border border-gray-700"
                          size="sm"
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Edit Profile
                        </Button>
                      </Link>
                    ) : (
                      <>
                        <Button 
                          onClick={handleMessage}
                          className="rounded-full bg-gray-800/80 hover:bg-gray-700 text-cyan-300 hover:text-cyan-200"
                          size="sm"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={handleFollow}
                          disabled={followUser.isPending}
                          className={`rounded-full ${
                            isFollowing
                              ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-gray-200 border border-gray-700'
                              : 'bg-gradient-to-r from-cyan-700 via-cyan-600 to-cyan-500 hover:from-cyan-600 hover:via-cyan-500 hover:to-cyan-400'
                          } text-white font-medium px-4`}
                          size="sm"
                        >
                          {followUser.isPending ? (
                            <span className="flex items-center">
                              <LoadingSpinner className="w-4 h-4 mr-2" />
                              {isFollowing ? 'Unfollowing...' : 'Following...'}
                            </span>
                          ) : (
                            isFollowing ? 'Following' : 'Follow'
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {userData.bio && (
                  <p className="text-sm text-cyan-100 whitespace-pre-wrap">{userData.bio}</p>
                )}

                {/* User Metadata */}
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-cyan-300/80">
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
                <div className="flex gap-4 text-sm">
                  <Link href={`/user/${userData.handle}/following`} className="hover:underline">
                    <span className="font-bold text-cyan-100">{followStats.following}</span>
                    <span className="text-cyan-500 ml-1">Following</span>
                  </Link>
                  <Link href={`/user/${userData.handle}/followers`} className="hover:underline">
                    <span className="font-bold text-cyan-100">{followStats.followers}</span>
                    <span className="text-cyan-500 ml-1">Followers</span>
                  </Link>
                </div>
              </div>

              {/* Tabs with Post Count */}
              <div className="border-b border-cyan-500/20 mt-4">
                <div className="flex items-center">
                  <Button 
                    variant="ghost" 
                    className="relative text-cyan-300 rounded-none px-6 py-4 font-medium"
                  >
                    Posts {userPosts.length}
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500" />
                  </Button>
                </div>
              </div>

              {/* Posts Feed */}
              <div className="py-4">
                {userPosts.map((post: any) => (
                  <Post
                    key={post._id}
                    post={{
                      _id: post._id,
                      content: post.content,
                      author: {
                        _id: userData.id,
                        username: userData.name,
                        avatar: userData.avatar
                      },
                      likes: post.likes || [],
                      reposts: post.reposts || [],
                      replies: post.replies || [],
                      createdAt: post.createdAt
                    }}
                    isExpanded={expandedPost === post._id}
                    onExpand={setExpandedPost}
                    onInteraction={handleInteraction}
                    replyContent={replyContent[post._id] || ''}
                    onReplyChange={(content) => setReplyContent(prev => ({
                      ...prev,
                      [post._id]: content
                    }))}
                    showReplies={expandedPost === post._id}
                    replies={[]}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
