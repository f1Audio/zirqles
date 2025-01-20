import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import { StreamChat } from 'stream-chat'

const serverClient = StreamChat.getInstance(
  process.env.NEXT_PUBLIC_STREAM_KEY!,
  process.env.STREAM_SECRET!
)

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await req.json()
    
    // Verify the requesting user matches the token user
    if (userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Generate user token with 24 hour expiration
    const token = serverClient.createToken(userId, Math.floor(Date.now() / 1000) + (24 * 60 * 60))

    return NextResponse.json({ token })
  } catch (error) {
    console.error('Stream token generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate token' }, 
      { status: 500 }
    )
  }
} 