import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import dbConnect from '@/lib/mongodb'
import { User } from '@/models/User'

// Add support for both GET and POST methods
export async function GET(request: Request) {
  return handleSession(request)
}

export async function POST(request: Request) {
  return handleSession(request)
}

async function handleSession(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({})
    }

    // Get fresh user data from database
    await dbConnect()
    const user = await User.findById(session.user.id)
    
    if (!user) {
      return NextResponse.json({})
    }

    // Return sanitized session with fresh user data
    const sanitizedSession = {
      ...session,
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        image: user.avatar, // Maintain compatibility with NextAuth
        name: user.username // Maintain compatibility with NextAuth
      }
    }

    return NextResponse.json(sanitizedSession)
  } catch (error) {
    console.error('Session update error:', error)
    // Return an empty object instead of an error for client-side handling
    return NextResponse.json({})
  }
} 