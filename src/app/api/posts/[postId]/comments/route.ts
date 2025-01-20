import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import dbConnect from '@/lib/mongodb'
import { Post, IPost } from '@/models/Post'
import { User } from '@/models/User'
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
  depth: number
  parentId?: mongoose.Types.ObjectId
  rootId?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
  media?: string[]
}

interface PopulatedPost extends Omit<IPost, 'author'> {
  _id: mongoose.Types.ObjectId
  author: {
    _id: mongoose.Types.ObjectId
    username: string
    avatar?: string
  }
  media: Array<{
    type: 'image' | 'video'
    url: string
    key: string
  }>
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
    
    // Find the parent post/comment and populate necessary fields
    const parentPost = await Post.findById(params.postId)
      .populate('author', '_id username avatar')
      .populate('rootId')
      .select('content author likes reposts comments type depth media rootId parentId')
      .lean() as PopulatedPost
    
    if (!parentPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Calculate depth based on parent post
    const depth = parentPost.type === 'comment' ? parentPost.depth + 1 : 1
    
    // Check max depth
    if (depth > 2) {
      return NextResponse.json({ error: 'Maximum comment depth exceeded' }, { status: 400 })
    }

    // For comments on comments, we need to track both the immediate parent and the root post
    const rootId = parentPost.type === 'comment' ? parentPost.rootId || parentPost._id : parentPost._id

    // Create the new comment
    const comment = await Post.create({
      content,
      author: session.user.id,
      type: 'comment',
      depth,
      parentId: parentPost._id,
      rootId,
      comments: [],
      media: []
    })

    // Update the parent's comments array
    const updatedParent = await Post.findByIdAndUpdate(
      parentPost._id,
      { 
        $push: { comments: comment._id },
        $set: { media: parentPost.media }
      },
      { 
        new: true,
        runValidators: true
      }
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
        post: rootId, // Use rootId for the notification to link to the main post
        read: false,
        createdAt: new Date()
      })
    }

    // Return the formatted comment with author info
    const populatedComment = await Post.findById(comment._id)
      .populate('author', 'username avatar')
      .lean() as PopulatedComment

    if (!populatedComment) {
      return NextResponse.json({ error: 'Comment not found after creation' }, { status: 404 })
    }

    return NextResponse.json({
      ...populatedComment,
      _id: populatedComment._id.toString(),
      author: {
        _id: populatedComment.author._id.toString(),
        username: populatedComment.author.username,
        avatar: populatedComment.author.avatar
      },
      post: {
        _id: parentPost._id.toString(),
        author: {
          _id: parentPost.author._id.toString(),
          username: parentPost.author.username,
          avatar: parentPost.author.avatar
        },
        media: parentPost.media || []
      },
      type: 'comment',
      depth,
      parentId: parentPost._id.toString(),
      rootId: rootId.toString(),
      comments: [],
      media: []
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
          },
          {
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
              },
              {
                path: 'comments',
                select: '_id'
              }
            ]
          }
        ]
      })
      .lean() as IPost

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Recursive function to format comments
    const formatComment = (comment: any): any => ({
      _id: comment._id.toString(),
      content: comment.content,
      author: {
        _id: comment.author._id.toString(),
        username: comment.author.username,
        avatar: comment.author.avatar
      },
      likes: comment.likes.map((like: any) => like._id.toString()),
      reposts: comment.reposts.map((repost: any) => repost._id.toString()),
      comments: Array.isArray(comment.comments) 
        ? comment.comments.map((c: any) => formatComment(c))
        : [],
      type: comment.type || 'comment',
      depth: comment.depth || 1,
      parentId: comment.parentId?.toString(),
      rootId: comment.rootId?.toString(),
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      media: comment.media || []
    })

    // Format comments with proper fields and string IDs
    const comments = (post.comments || []).map(formatComment)

    return NextResponse.json(comments)
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }
} 