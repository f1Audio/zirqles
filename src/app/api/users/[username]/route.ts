import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { User } from '@/models/User'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'

export async function GET(
  req: Request,
  { params }: { params: { username: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    await dbConnect()
    
    // Get user data and counts in a single aggregation
    const [user] = await User.aggregate([
      { $match: { username: params.username } },
      {
        $project: {
          _id: 1,
          username: 1,
          name: 1,
          avatar: 1,
          bio: 1,
          location: 1,
          website: 1,
          createdAt: 1,
          followers: 1,  // Keep the full followers array for checking
          followersCount: { $size: "$followers" },
          followingCount: { $size: "$following" }
        }
      }
    ])

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if current user is following this user
    let isFollowing = false
    if (session?.user?.id) {
      isFollowing = user.followers.some((id: any) => id.toString() === session.user.id)
    }

    return NextResponse.json({
      id: user._id.toString(),
      name: user.name,
      username: user.username,
      handle: `@${user.username.toLowerCase()}`,
      avatar: user.avatar || `/placeholder.svg?height=128&width=128&text=${user.username.charAt(0)}`,
      location: user.location || '',
      website: user.website || '',
      bio: user.bio || '',
      following: user.followingCount,
      followers: user.followersCount,
      isFollowing,
      joinDate: new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
      })
    })
  } catch (error) {
    console.error('GET /api/users/[username] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 