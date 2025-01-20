import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import dbConnect from '@/lib/mongodb'
import { User } from '@/models/User'
import { Types } from 'mongoose'

interface UserDocument {
  _id: Types.ObjectId
  username: string
  avatar?: string
  bio?: string
  following?: Types.ObjectId[]
}

export async function GET(
  req: Request,
  { params }: { params: { username: string; type: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!params.username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    await dbConnect()

    // Find user by username with specific fields
    const user = await User.findOne(
      { username: params.username },
      'username avatar bio following followers'
    ).lean()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let users: UserDocument[] = []
    if (params.type === 'following') {
      users = await User.find(
        { _id: { $in: user.following || [] } },
        'username avatar bio'
      ).lean()
    } else if (params.type === 'followers') {
      users = await User.find(
        { _id: { $in: user.followers || [] } },
        'username avatar bio'
      ).lean()
    }

    // Check if current user is following each user
    const currentUser = await User.findById(session.user.id)
    if (!currentUser) {
      return NextResponse.json({ error: 'Current user not found' }, { status: 404 })
    }

    const formattedUsers = users.map((u) => ({
      id: u._id.toString(),
      username: u.username,
      avatar: u.avatar || `/placeholder.svg?height=128&width=128&text=${u.username.charAt(0)}`,
      bio: u.bio || '',
      isFollowing: currentUser.following?.some(id => id.equals(u._id)) || false
    }))

    return NextResponse.json({ users: formattedUsers })
  } catch (error) {
    console.error('Error fetching user list:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 