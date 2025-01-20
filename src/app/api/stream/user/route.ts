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
    console.log('Session in stream/user:', session?.user)
    
    if (!session?.user?.id) {
      console.error('No session or user ID found')
      return NextResponse.json({ error: 'Unauthorized - No valid session' }, { status: 401 })
    }

    const { targetUserId, name, avatar } = await req.json()
    console.log('Received update data:', { targetUserId, name, avatar })

    if (targetUserId !== session.user.id) {
      console.error('User ID mismatch:', { target: targetUserId, session: session.user.id })
      return NextResponse.json({ error: 'Unauthorized - User ID mismatch' }, { status: 403 })
    }

    try {
      await serverClient.upsertUsers([
        {
          id: targetUserId,
          name: name || '',
          image: avatar,
          role: 'user'
        }
      ])

      return NextResponse.json({ success: true })
    } catch (streamError) {
      console.error('Stream API error:', streamError)
      throw streamError
    }
  } catch (error: any) {
    console.error('Stream user update error:', error)
    return NextResponse.json(
      { error: 'Failed to update Stream user', details: error.message },
      { status: 500 }
    )
  }
} 