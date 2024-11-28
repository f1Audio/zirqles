import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    return NextResponse.json(session)
  } catch (error) {
    console.error('Session update error:', error)
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
  }
} 