import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import { StreamChat } from 'stream-chat'

if (!process.env.NEXT_PUBLIC_STREAM_KEY || !process.env.STREAM_SECRET) {
  throw new Error('Stream credentials are not properly configured')
}

const serverClient = StreamChat.getInstance(
  process.env.NEXT_PUBLIC_STREAM_KEY,
  process.env.STREAM_SECRET
)

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Verify the requesting user matches the token request
    if (userId !== session.user.id) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 403 })
    }

    // Generate token
    const token = serverClient.createToken(userId)

    return NextResponse.json({ token })
  } catch (error) {
    console.error('Stream token generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate token' }, 
      { status: 500 }
    )
  }
} 