import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import connectDB from '@/lib/mongodb'
import { Notification } from '@/models/notification'

// Mark route as dynamic
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function GET() {
  try {
    await connectDB()
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ count: 0 })
    }

    const count = await Notification.countDocuments({
      recipient: session.user.id,
      read: false
    })

    return NextResponse.json({ count })
  } catch (error) {
    console.error('Error fetching unread notifications count:', error)
    return NextResponse.json({ count: 0 })
  }
} 