import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { User } from '@/models/User'
import { Post } from '@/models/Post'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'

export async function GET(
  req: Request,
  { params }: { params: { username: string } }
) {
  try {
    await dbConnect()
    
    const session = await getServerSession(authOptions)
    
    // Find user by username with all fields
    const user = await User.findOne(
      { username: params.username },
      'username email avatar createdAt location website bio following followers'
    ).lean() as any

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user's posts with fully populated comments
    const posts = await Post.find({ author: user._id })
      .populate('author', 'username avatar')
      .populate('likes', '_id')
      .populate('reposts', '_id')
      .populate({
        path: 'comments',
        populate: [
          { path: 'author', select: 'username avatar' },
          { path: 'likes', select: '_id' },
          { path: 'reposts', select: '_id' },
          { path: 'comments', select: '_id' }
        ]
      })
      .sort({ createdAt: -1 })
      .lean() as any[]

    // Get following and followers counts
    const followingCount = await User.countDocuments({ followers: user._id })
    const followersCount = await User.countDocuments({ following: user._id })

    // Check if the current user is following this user
    let isFollowing = false
    if (session?.user?.id) {
      const currentUser = await User.findById(session.user.id)
      isFollowing = currentUser?.following?.includes(user._id) || false
    }

    // Format the response with proper comment data
    const userData = {
      id: user._id.toString(),
      name: user.username,
      handle: `@${user.username.toLowerCase()}`,
      avatar: user.avatar || `/placeholder.svg?height=128&width=128&text=${user.username.charAt(0)}`,
      location: user.location || '',
      website: user.website || '',
      bio: user.bio || '',
      following: followingCount,
      followers: followersCount,
      isFollowing,
      joinDate: new Date(user.createdAt).toLocaleDateString('en-US', { 
        month: 'long',
        year: 'numeric'
      }),
      posts: posts.map(post => ({
        id: post._id.toString(),
        content: post.content,
        likes: post.likes.map((like: any) => like._id.toString()),
        reposts: post.reposts.map((repost: any) => repost._id.toString()),
        comments: (post.comments || []).map((comment: any) => ({
          _id: comment._id.toString(),
          content: comment.content,
          author: {
            _id: comment.author._id.toString(),
            username: comment.author.username,
            avatar: comment.author.avatar
          },
          likes: comment.likes.map((like: any) => like._id.toString()),
          reposts: comment.reposts.map((repost: any) => repost._id.toString()),
          comments: comment.comments || [],
          type: comment.type || 'comment',
          depth: comment.depth || 0,
          createdAt: comment.createdAt
        })),
        type: post.type || 'post',
        depth: post.depth || 0,
        createdAt: post.createdAt
      }))
    }

    const response = NextResponse.json(userData)
    
    // Add cache control headers
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=59')
    
    return response
  } catch (error) {
    console.error('Error fetching user data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 