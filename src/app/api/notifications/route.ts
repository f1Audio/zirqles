import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import connectDB from '@/lib/mongodb'
import { Notification } from '@/lib/models/notification'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const notifications = await Notification.find({
      recipient: session.user.id
    })
    .populate('sender', 'username avatar')
    .populate({
      path: 'post',
      select: 'content type parentPost author likes comments reposts createdAt',
      populate: {
        path: 'author',
        select: 'username avatar'
      }
    })
    .sort({ createdAt: -1 })
    .lean()

    // Format notifications consistently
    const formattedNotifications = notifications.map(notification => ({
      _id: notification._id,
      type: notification.type,
      user: notification.sender.username,
      avatar: notification.sender.avatar,
      content: getNotificationContent(notification),
      time: getRelativeTime(new Date(notification.createdAt)),
      read: notification.read,
      postId: notification.post?._id,
      // Include additional fields for mention notifications
      sender: notification.sender,
      post: notification.post,
      createdAt: notification.createdAt
    }))

    return NextResponse.json(formattedNotifications)
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
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
    await Notification.deleteMany({ recipient: session.user.id })

    return NextResponse.json({ message: 'Notifications cleared' })
  } catch (error) {
    console.error('Error clearing notifications:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// Helper function to format notification content
function getNotificationContent(notification: any) {
  switch (notification.type) {
    case 'like':
      return 'liked your post'
    case 'comment':
      return 'commented on your post'
    case 'follow':
      return 'started following you'
    case 'repost':
      return 'reposted your post'
    case 'mention':
      return `mentioned you in a ${notification.post?.type || 'post'}`
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