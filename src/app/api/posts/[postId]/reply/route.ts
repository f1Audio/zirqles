import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import dbConnect from '@/lib/mongodb'
import { Post, IPost } from '@/models/Post'
import { User } from '@/models/User'
import { Notification } from '@/models/notification'
import mongoose from 'mongoose'

interface PopulatedReply {
  _id: mongoose.Types.ObjectId
  content: string
  author: {
    _id: mongoose.Types.ObjectId
    username: string
    avatar?: string
  }
  createdAt: Date
  updatedAt: Date
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
    const post = await Post.findById(params.postId)
      .populate('author', '_id')
    
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const reply = await Post.create({
      content,
      author: session.user.id,
      replyTo: post._id,
    })

    post.replies.push(reply._id)
    await post.save()

    // Create notification for the reply
    if (session.user.id !== post.author._id.toString()) {
      await Notification.create({
        recipient: post.author._id,
        sender: session.user.id,
        type: 'comment',
        post: post._id,
        read: false,
        createdAt: new Date()
      })
    }

    // Return the formatted reply with the post author info
    const populatedReply = await Post.findById(reply._id)
      .populate('author', 'username avatar')
      .lean() as PopulatedReply

    if (!populatedReply) {
      return NextResponse.json({ error: 'Reply not found after creation' }, { status: 404 })
    }

    return NextResponse.json({
      ...populatedReply,
      _id: populatedReply._id.toString(),
      author: {
        _id: populatedReply.author._id.toString(),
        username: populatedReply.author.username,
        avatar: populatedReply.author.avatar
      },
      post: {
        _id: post._id.toString(),
        author: {
          _id: post.author._id.toString()
        }
      }
    })
  } catch (error) {
    console.error('Error creating reply:', error)
    return NextResponse.json({ error: 'Failed to create reply' }, { status: 500 })
  }
}

// Get replies for a specific post
export async function GET(
  req: Request,
  { params }: { params: { postId: string } }
) {
  try {
    await dbConnect()
    const post = await Post.findById(params.postId)
      .populate({
        path: 'replies',
        populate: [
          {
            path: 'author',
            select: 'username'
          },
          {
            path: 'likes',
            select: '_id'
          },
          {
            path: 'reposts',
            select: '_id'
          },
          {
            path: 'replies'
          }
        ]
      })
      .lean() as IPost

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Ensure replies exist and are properly formatted with string IDs
    const replies = (post.replies || []).map((reply: any) => ({
      _id: reply._id.toString(),
      content: reply.content,
      author: reply.author,
      likes: reply.likes.map((like: any) => like._id.toString()),
      reposts: reply.reposts.map((repost: any) => repost._id.toString()),
      replies: reply.replies || [],
      createdAt: reply.createdAt,
      updatedAt: reply.updatedAt
    }))

    return NextResponse.json(replies)
  } catch (error) {
    console.error('Error fetching replies:', error)
    return NextResponse.json({ error: 'Failed to fetch replies' }, { status: 500 })
  }
} 