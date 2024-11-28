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

    const posts = await Post.find({ author: user._id })
      .populate('author', 'username avatar')
      .populate('likes', '_id')
      .populate('reposts', '_id')
      .populate({
        path: 'replies',
        populate: [
          { path: 'author', select: 'username avatar' },
          { path: 'likes', select: '_id' },
          { path: 'reposts', select: '_id' }
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
      replies: post.replies.map((reply: any) => ({
        _id: reply._id.toString(),
        content: reply.content,
        author: {
          _id: reply.author._id.toString(),
          username: reply.author.username,
          avatar: reply.author.avatar
        },
        likes: reply.likes.map((like: any) => like._id.toString()),
        reposts: reply.reposts.map((repost: any) => repost._id.toString()),
        createdAt: reply.createdAt
      })),
      createdAt: post.createdAt
    }))

    return NextResponse.json({ posts: formattedPosts })
  } catch (error) {
    console.error('Error fetching user posts:', error)
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
  }
} 