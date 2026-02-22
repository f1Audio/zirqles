import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import connectDB from '@/lib/mongodb'
import { User } from '@/models/User'

export const dynamic = 'force-dynamic'

// Escape regex special characters to prevent NoSQL injection
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query) {
      return NextResponse.json([])
    }

    // Limit query length to prevent abuse
    if (query.length > 50) {
      return NextResponse.json({ error: 'Query too long' }, { status: 400 })
    }

    await connectDB()

    // Escape regex special characters to prevent injection
    const escapedQuery = escapeRegex(query)

    const users = await User.find({
      username: { $regex: escapedQuery, $options: 'i' }
    })
    .select('username avatar')
    .limit(10)
    .lean()

    return NextResponse.json(users)
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Failed to search users' }, { status: 500 })
  }
} 