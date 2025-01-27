import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import dbConnect from '@/lib/mongodb'
import { Post } from '@/models/Post'
import { User } from '@/models/User'
import { Types } from 'mongoose'

export async function POST(
  req: Request,
  { params }: { params: { postId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()
    
    // Find and validate the original post
    const originalPost = await Post.findById(params.postId)
      .populate('author', 'username avatar')
    
    if (!originalPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const userId = session.user.id
    const hasReposted = originalPost.reposts.includes(userId)

    if (hasReposted) {
      // Remove repost
      originalPost.reposts = originalPost.reposts.filter(
        (id: Types.ObjectId) => id.toString() !== userId
      )
      
      // Delete the repost from the posts collection
      await Post.deleteOne({
        type: 'repost',
        originalPost: originalPost._id,
        author: userId
      })
    } else {
      // Add repost
      originalPost.reposts.push(new Types.ObjectId(userId))
      
      // Create a new repost entry
      const repost = new Post({
        type: 'repost',
        originalPost: originalPost._id,
        author: userId,
        content: originalPost.content,
        media: originalPost.media,
        createdAt: new Date()
      })
      
      await repost.save()
    }

    await originalPost.save()

    // Return the updated post data
    const updatedPost = await Post.findById(originalPost._id)
      .populate('author', 'username avatar')
      .populate('likes', '_id')
      .populate('reposts', '_id')
      .populate({
        path: 'comments',
        populate: [
          { path: 'author', select: 'username avatar' },
          { path: 'likes', select: '_id' },
          { path: 'reposts', select: '_id' }
        ]
      })
      .lean() as any // Use type assertion here since we know the structure

    if (!updatedPost) {
      return NextResponse.json({ error: 'Post not found after update' }, { status: 404 })
    }

    return NextResponse.json({
      ...updatedPost,
      _id: updatedPost._id.toString(),
      author: {
        _id: updatedPost.author._id.toString(),
        username: updatedPost.author.username,
        avatar: updatedPost.author.avatar
      },
      likes: updatedPost.likes?.map((like: any) => like._id.toString()) || [],
      reposts: updatedPost.reposts?.map((repost: any) => repost._id.toString()) || [],
      comments: updatedPost.comments?.map((comment: any) => ({
        ...comment,
        _id: comment._id.toString(),
        author: {
          _id: comment.author._id.toString(),
          username: comment.author.username,
          avatar: comment.author.avatar
        }
      })) || [],
      originalPost: {
        _id: originalPost._id.toString(),
        author: {
          _id: originalPost.author._id.toString(),
          username: originalPost.author.username,
          avatar: originalPost.author.avatar
        }
      }
    })
  } catch (error) {
    console.error('Error handling repost:', error)
    return NextResponse.json(
      { error: 'Failed to handle repost' },
      { status: 500 }
    )
  }
} 