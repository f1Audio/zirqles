import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import connectDB from '@/lib/mongodb'
import { Notification } from '@/models/notification'

// Add this export to mark the route as dynamic
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await connectDB()
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const notifications = await Notification.find({ recipient: session.user.id })
      .populate('sender', 'username avatar')
      .populate({
        path: 'post',
        populate: {
          path: 'parentPost',
          select: '_id'
        },
        select: 'type content parentPost _id'
      })
      .sort({ createdAt: -1 })
      .lean()

    // Filter out notifications with deleted senders
    const validNotifications = notifications.filter(notification => notification.sender)

    // Format notifications
    const formattedNotifications = validNotifications.map((notification: any) => ({
      _id: notification._id.toString(),
      type: notification.type,
      user: notification.sender?.username || 'Deleted User',
      avatar: notification.sender?.avatar || 'DU',
      content: getNotificationContent(notification),
      time: getRelativeTime(new Date(notification.createdAt)),
      read: notification.read,
      postId: notification.post?._id,
      sender: notification.sender ? {
        username: notification.sender.username,
        avatar: notification.sender.avatar
      } : {
        username: 'Deleted User',
        avatar: 'DU'
      },
      post: notification.post ? {
        type: notification.post.type,
        content: notification.post.content,
        _id: notification.post._id.toString(),
        parentPost: notification.post.parentPost?._id.toString()
      } : undefined,
      createdAt: notification.createdAt
    }))

    return NextResponse.json(formattedNotifications)
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { recipient, sender, type, post } = body

    await connectDB()

    const notification = await Notification.create({
      recipient,
      sender,
      type,
      post,
      read: false,
      createdAt: new Date()
    })

    return NextResponse.json({ notification }, { status: 201 })
  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    
    // Delete all notifications where the user is the recipient
    const result = await Notification.deleteMany({ 
      recipient: session.user.id 
    })

    if (result.deletedCount === 0) {
      return NextResponse.json({ message: 'No notifications to clear' })
    }

    return NextResponse.json({ 
      message: 'Notifications cleared',
      deletedCount: result.deletedCount
    })
  } catch (error) {
    console.error('Error clearing notifications:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// Helper function to format notification content
function getNotificationContent(notification: any) {
  const username = notification.sender?.username || 'Deleted User'
  
  switch (notification.type) {
    case 'like':
      return `${username} liked your post`
    case 'comment_like':
      return `${username} liked your comment`
    case 'comment':
      return `${username} commented on your post`
    case 'follow':
      return `${username} started following you`
    case 'repost':
      return `${username} reposted your post`
    case 'mention':
      const contentType = notification.post?.type === 'comment' ? 'comment' : 'post'
      return `${username} mentioned you in a ${contentType}`
    default:
      return notification.content || ''
  }
}

// Helper function to format relative time
function getRelativeTime(date: Date) {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 60) return `${minutes} minutes ago`
  if (hours < 24) return `${hours} hours ago`
  return `${days} days ago`
} 