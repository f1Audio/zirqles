import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'

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
    
    // Return an empty object if no session exists
    if (!session) {
      return NextResponse.json({})
    }

    // Ensure user object exists and has required properties
    const sanitizedSession = {
      ...session,
      user: session.user ? {
        ...session.user,
        id: session.user.id || undefined,
        email: session.user.email || undefined,
        username: session.user.username || undefined,
        image: session.user.image || undefined,
        avatar: session.user.avatar || undefined,
      } : undefined
    }

    return NextResponse.json(sanitizedSession)
  } catch (error) {
    console.error('Session update error:', error)
    // Return an empty object instead of an error for client-side handling
    return NextResponse.json({})
  }
} 