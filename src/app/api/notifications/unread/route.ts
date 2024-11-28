import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import connectDB from '@/lib/mongodb'
import { Notification } from '@/lib/models/notification'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const count = await Notification.countDocuments({
      recipient: session.user.id,
      read: false
    })

    return NextResponse.json({ count })
  } catch (error) {
    console.error('Error fetching unread notifications count:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
} 