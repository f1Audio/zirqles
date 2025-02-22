import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import dbConnect from '@/lib/mongodb'
import { Post } from '@/models/Post'
import { User } from '@/models/User'
import { Notification } from '@/models/notification'
import { formatTextWithMentions } from '@/lib/utils'
import mongoose from 'mongoose'

export async function POST(
  req: Request,
  { params }: { params: { postId: string } }
) {
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

    // Create the comment
    const comment = await Post.create({
      content: content.trim(),
      author: session.user.id,
      type: 'comment',
      parentPost: params.postId
    })

    // Get the parent post author for notification
    const parentPost = await Post.findById(params.postId).select('author')
    
    // Create notifications array
    const notifications = []

    // Add comment notification for post author
    if (parentPost?.author.toString() !== session.user.id) {
      notifications.push({
        recipient: new mongoose.Types.ObjectId(parentPost?.author),
        sender: new mongoose.Types.ObjectId(session.user.id),
        type: 'comment',
        post: new mongoose.Types.ObjectId(params.postId),
        read: false
      })
    }

    // Handle mentions
    const mentions = formatTextWithMentions(content)
      .filter(part => part.type === 'mention')
      .map(part => part.username)

    if (mentions.length > 0) {
      const mentionedUsers = await User.find({
        username: { $in: mentions }
      }).select('_id')

      // Add mention notifications
      const mentionNotifications = mentionedUsers
        .filter(user => user._id.toString() !== session.user.id)
        .map(user => ({
          recipient: new mongoose.Types.ObjectId(user._id),
          sender: new mongoose.Types.ObjectId(session.user.id),
          type: 'mention',
          post: new mongoose.Types.ObjectId(comment._id),
          read: false
        }))

      notifications.push(...mentionNotifications)
    }

    // Create all notifications
    if (notifications.length > 0) {
       await Notification.insertMany(notifications)
    }

    // Return the populated comment
    const populatedComment = await Post.findById(comment._id)
      .populate('author', 'username avatar')
      .lean()

    return NextResponse.json(populatedComment)
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    )
  }
} 