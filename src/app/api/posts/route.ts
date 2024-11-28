import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/options'
import dbConnect from '@/lib/mongodb'
import { Post, IPost } from '@/models/Post'
import { User } from '@/models/User'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    // Get the current user's following list
    const currentUser = await User.findById(session.user.id)
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Find posts from followed users
    const posts = await Post.find({
      author: { $in: [...currentUser.following, currentUser._id] } // Include own posts
    })
      .populate('author', 'username avatar')
      .populate('likes', '_id')
      .populate('reposts', '_id')
      .populate({
        path: 'replies',
        populate: [
          {
            path: 'author',
            select: 'username avatar'
          },
          {
            path: 'likes',
            select: '_id'
          },
          {
            path: 'reposts',
            select: '_id'
          }
        ]
      })
      .sort({ createdAt: -1 })
      .lean() 

    const formattedPosts = posts.map((post: any) => ({
      _id: post._id,
      content: post.content,
      author: {
        _id: post.author._id,
        username: post.author.username,
        avatar: post.author.avatar
      },
      likes: post.likes.map((like: { _id: { toString: () => string } }) => like._id.toString()),
      reposts: post.reposts.map((repost: { _id: { toString: () => string } }) => repost._id.toString()),
      replies: post.replies || [],
      createdAt: post.createdAt,
      updatedAt: post.updatedAt
    }))

    return NextResponse.json(formattedPosts)
  } catch (error) {
    console.error('Error fetching posts:', error)
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { content } = await req.json()
    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    await dbConnect()
    const user = await User.findById(session.user.id)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const post = new Post({
      content,
      author: user._id,
    })

    await post.save()
    const populatedPost = await Post.findById(post._id)
      .populate('author', 'username')
      .lean()

    return NextResponse.json(populatedPost, { status: 201 })
  } catch (error) {
    console.error('Error creating post:', error)
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
  }
} 