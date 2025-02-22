import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import { User } from '@/models/User'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query) {
      return NextResponse.json([])
    }

    await connectDB()

    const users = await User.find({
      username: { $regex: query, $options: 'i' }
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