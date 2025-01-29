import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import dbConnect from '@/lib/mongodb'
import { User } from '@/models/User'
import { Post } from '@/models/Post'

export async function GET(
  req: Request,
  { params }: { params: { username: string } }
) {
  try {
    await dbConnect()
    
    const user = await User.findOne({ username: params.username })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const posts = await Post.find({ 
      author: user._id,
      type: 'post' // Only fetch root posts
    })
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
      .lean()

    const formattedPosts = posts.map((post: any) => ({
      _id: post._id.toString(),
      content: post.content,
      author: {
        _id: user._id.toString(),
        username: user.username,
        avatar: user.avatar
      },
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
        type: comment.type,
        createdAt: comment.createdAt
      })),
      type: post.type || 'post',
      depth: post.depth || 0,
      media: post.media || [],
      createdAt: post.createdAt
    }))

    return NextResponse.json({ posts: formattedPosts })
  } catch (error) {
    console.error('Error fetching user posts:', error)
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
  }
} 