import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import dbConnect from '@/lib/mongodb'
import { User } from '@/models/User'
import { Types } from 'mongoose'
import { Notification } from '@/models/notification'

export async function POST(
  req: Request,
  { params }: { params: { username: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    // Get both users in parallel
    const [targetUser, currentUser] = await Promise.all([
      User.findOne({ username: params.username }),
      User.findById(session.user.id)
    ])

    if (!targetUser || !currentUser) {
      return NextResponse.json({ 
        error: !targetUser ? 'Target user not found' : 'Current user not found' 
      }, { status: 404 })
    }

    // Check if already following
    const isFollowing = currentUser.following?.includes(targetUser._id) || false

    // Prepare update operations
    const updates = isFollowing 
      ? {
          currentUser: { $pull: { following: targetUser._id } },
          targetUser: { $pull: { followers: currentUser._id } }
        }
      : {
          currentUser: { $addToSet: { following: targetUser._id } },
          targetUser: { $addToSet: { followers: currentUser._id } }
        }

    // Execute updates in parallel
    await Promise.all([
      User.updateOne({ _id: currentUser._id }, updates.currentUser),
      User.updateOne({ _id: targetUser._id }, updates.targetUser),
      !isFollowing && Notification.create({
        recipient: targetUser._id,
        sender: currentUser._id,
        type: 'follow',
        read: false,
        createdAt: new Date()
      })
    ])

    // Get updated counts using aggregation for accuracy
    const [updatedTarget, updatedCurrent] = await Promise.all([
      User.aggregate([
        { $match: { _id: targetUser._id } },
        { $project: {
          followers: { $size: "$followers" },
          following: { $size: "$following" }
        }}
      ]).then(([user]) => user),
      User.aggregate([
        { $match: { _id: currentUser._id } },
        { $project: {
          followers: { $size: "$followers" },
          following: { $size: "$following" }
        }}
      ]).then(([user]) => user)
    ])

    return NextResponse.json({
      success: true,
      isFollowing: !isFollowing,
      stats: {
        target: {
          followers: updatedTarget?.followers || 0,
          following: updatedTarget?.following || 0,
          isFollowing: !isFollowing
        },
        current: {
          followers: updatedCurrent?.followers || 0,
          following: updatedCurrent?.following || 0
        }
      }
    })
  } catch (error) {
    console.error('Error handling follow:', error)
    return NextResponse.json({ error: 'Failed to handle follow' }, { status: 500 })
  }
} 