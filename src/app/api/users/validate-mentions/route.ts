import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { User } from '@/models/User'

export async function POST(req: Request) {
  try {
    const { usernames } = await req.json()
    
    if (!Array.isArray(usernames)) {
      return NextResponse.json(
        { message: 'Invalid request format' },
        { status: 400 }
      )
    }

    await dbConnect()

    // Find all mentioned users
    const users = await User.find({
      username: { $in: usernames }
    }).select('username')

    // Check if all mentioned users exist
    const foundUsernames = users.map(user => user.username)
    const invalidMentions = usernames.filter(
      username => !foundUsernames.includes(username)
    )

    if (invalidMentions.length > 0) {
      return NextResponse.json(
        { 
          message: `Invalid mentions: @${invalidMentions.join(', @')}`,
          invalidMentions 
        },
        { status: 400 }
      )
    }

    return NextResponse.json({ valid: true })
  } catch (error) {
    console.error('Error validating mentions:', error)
    return NextResponse.json(
      { message: 'Failed to validate mentions' },
      { status: 500 }
    )
  }
} 