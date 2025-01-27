import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import dbConnect from '@/lib/mongodb'
import { User } from '@/models/User'
import { Post } from '@/models/Post'
import { s3Client } from '@/lib/s3';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { StreamChat } from 'stream-chat'

// Initialize Stream client
const serverClient = StreamChat.getInstance(
  process.env.NEXT_PUBLIC_STREAM_KEY!,
  process.env.STREAM_SECRET!
)

// GET /api/user
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    const user = await User.findOne(
      { email: session.user.email },
      '_id username email avatar bio location website followers following createdAt'
    ).lean()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Format response to match PATCH endpoint
    const response = {
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio || '',
      location: user.location || '',
      website: user.website || '',
      followers: user.followers?.length || 0,
      following: user.following?.length || 0,
      createdAt: user.createdAt
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/user
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const { username, email, bio, location, website, avatar } = data

    // Validate input
    if (!username && !email && !bio && !location && !website && !avatar) {
      return NextResponse.json({ error: 'No data to update' }, { status: 400 })
    }

    await dbConnect()

    // Username uniqueness check
    if (username && username !== session.user.username) {
      const existingUser = await User.findOne({ 
        username,
        email: { $ne: session.user.email }
      })
      
      if (existingUser) {
        return NextResponse.json({ 
          error: 'Username already taken',
          message: 'This username is already in use. Please choose a different one.'
        }, { status: 400 })
      }
    }

    // Email uniqueness check
    if (email && email !== session.user.email) {
      const existingUser = await User.findOne({ 
        email,
        _id: { $ne: session.user.id }
      })
      if (existingUser) {
        return NextResponse.json({ 
          error: 'Email already taken',
          message: 'This email is already associated with an account.'
        }, { status: 400 })
      }
    }

    // Update user with all fields
    const updatedUser = await User.findOneAndUpdate(
      { email: session.user.email },
      { 
        ...(username && { username }),
        ...(email && { email }),
        ...(bio !== undefined && { bio }),
        ...(location !== undefined && { location }),
        ...(website !== undefined && { website }),
        ...(avatar && { avatar })
      },
      { 
        new: true, 
        select: '_id username email avatar bio location website followers following createdAt'
      }
    )

    if (!updatedUser) {
      return NextResponse.json({ error: 'Failed to update user' }, { status: 404 })
    }

    // Format the response
    const response = {
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      avatar: updatedUser.avatar,
      bio: updatedUser.bio,
      location: updatedUser.location,
      website: updatedUser.website,
      followers: updatedUser.followers?.length || 0,
      following: updatedUser.following?.length || 0,
      createdAt: updatedUser.createdAt
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('PATCH /api/user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/user
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()
    
    // Find the user first to get their ID
    const user = await User.findOne({ email: session.user.email })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userId = user._id

    // 1. Delete user from Stream Chat (hard delete)
    try {
      await serverClient.deleteUsers([userId.toString()], {
        conversations: 'hard',
        messages: 'hard',
        user: 'hard'
      });
    } catch (streamError) {
      console.error('Error deleting user from Stream:', streamError);
      // Continue with account deletion even if Stream deletion fails
    }

    // 2. Remove user's likes from all posts
    await Post.updateMany(
      { likes: userId },
      { $pull: { likes: userId } }
    )

    // 3. Remove user's reposts from all posts
    await Post.updateMany(
      { reposts: userId },
      { $pull: { reposts: userId } }
    )

    // 4. Find all posts that are replies by this user
    const userReplies = await Post.find({ author: userId, replyTo: { $exists: true } })
    
    // 5. Remove reply references from parent posts
    for (const reply of userReplies) {
      await Post.updateOne(
        { _id: reply.replyTo },
        { $pull: { replies: reply._id } }
      )
    }

    // 6. Delete all posts by the user (including replies)
    await Post.deleteMany({ author: userId })

    // 7. Remove all replies to user's posts from other users' posts
    const userPosts = await Post.find({ author: userId })
    const userPostIds = userPosts.map(post => post._id)
    
    await Post.deleteMany({ replyTo: { $in: userPostIds } })

    // 8. Delete avatar from S3 if exists
    if (user.avatar) {
      try {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME as string,
          Key: user.avatar
        }));
      } catch (error) {
        console.error('Error deleting user avatar:', error);
        // Continue with user deletion even if avatar deletion fails
      }
    }

    // 9. Delete all sessions for this user from the database
    if (process.env.NEXTAUTH_URL) {
      try {
        await fetch(`${process.env.NEXTAUTH_URL}/api/auth/session`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: userId.toString() }),
        })
      } catch (error) {
        console.error('Error deleting sessions:', error)
        // Continue with account deletion even if session deletion fails
      }
    }

    // 10. Finally delete the user
    await User.deleteOne({ _id: userId })

    return NextResponse.json({ message: 'User and all associated data deleted successfully' })
  } catch (error) {
    console.error('DELETE /api/user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 