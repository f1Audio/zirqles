import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import dbConnect from '@/lib/mongodb'
import { Post } from '@/models/Post'
import { Notification } from '@/models/notification'
import mongoose from 'mongoose'

interface PopulatedComment {
  _id: mongoose.Types.ObjectId
  content: string
  author: {
    _id: mongoose.Types.ObjectId
    username: string
    avatar?: string
  }
  type: 'post' | 'comment'
  likes: mongoose.Types.ObjectId[]
  reposts: mongoose.Types.ObjectId[]
  comments: mongoose.Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
  media: Array<{
    type: 'image' | 'video'
    url: string
    key: string
  }>
}

interface PopulatedPost {
  _id: mongoose.Types.ObjectId
  content: string
  author: {
    _id: mongoose.Types.ObjectId
    username: string
    avatar?: string
  }
  likes: mongoose.Types.ObjectId[]
  reposts: mongoose.Types.ObjectId[]
  comments: mongoose.Types.ObjectId[]
  type: 'post' | 'comment'
  media: Array<{
    type: 'image' | 'video'
    url: string
    key: string
  }>
  createdAt: Date
  updatedAt: Date
  __v?: number
}

export async function POST(
  req: Request,
  { params }: { params: { postId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()
    
    const { content } = await req.json()
    
    // Find the parent post
    const parentPost = await Post.findById(params.postId)
      .populate('author', '_id username avatar')
      .select('content author likes comments type media')
      .lean() as PopulatedPost
    
    if (!parentPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Only allow comments on posts, not on other comments
    if (parentPost.type === 'comment') {
      return NextResponse.json({ error: 'Cannot comment on comments' }, { status: 400 })
    }

    // Create the new comment
    const comment = await Post.create({
      content,
      author: session.user.id,
      type: 'comment',
      parentPost: params.postId,
      media: []
    })

    // Update the parent's comments array
    const updatedParent = await Post.findByIdAndUpdate(
      parentPost._id,
      { $push: { comments: comment._id } },
      { new: true }
    ).populate('author', 'username avatar')

    if (!updatedParent) {
      return NextResponse.json({ error: 'Failed to update parent post' }, { status: 500 })
    }

    // Create notification for the comment
    if (session.user.id !== parentPost.author._id.toString()) {
      await Notification.create({
        recipient: parentPost.author._id,
        sender: session.user.id,
        type: 'comment',
        post: parentPost._id,
        read: false,
        createdAt: new Date()
      })
    }

    // Return the formatted comment
    const populatedComment = await Post.findById(comment._id)
      .populate('author', 'username avatar')
      .lean() as unknown as PopulatedComment

    return NextResponse.json({
      ...populatedComment,
      _id: populatedComment._id.toString(),
      author: {
        _id: populatedComment.author._id.toString(),
        username: populatedComment.author.username,
        avatar: populatedComment.author.avatar
      },
      likes: [],
      reposts: [],
      comments: [],
      type: 'comment'
    })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
  }
}

// Get comments for a specific post
export async function GET(
  req: Request,
  { params }: { params: { postId: string } }
) {
  try {
    await dbConnect()
    const post = await Post.findById(params.postId)
      .populate({
        path: 'comments',
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
      .lean() as unknown as PopulatedPost

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Format comments with proper fields and string IDs
    const comments = (post.comments || []).map((comment: any) => ({
      _id: comment._id.toString(),
      content: comment.content,
      author: {
        _id: comment.author._id.toString(),
        username: comment.author.username,
        avatar: comment.author.avatar
      },
      likes: comment.likes.map((like: any) => like._id.toString()),
      reposts: comment.reposts.map((repost: any) => repost._id.toString()),
      comments: [],
      type: 'comment',
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      media: comment.media || []
    }))

    return NextResponse.json(comments)
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }
} 