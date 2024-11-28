import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import dbConnect from '@/lib/mongodb'
import { Post, IPost } from '@/models/Post'
import { Types } from 'mongoose'

interface PopulatedPost extends Omit<IPost, 'likes' | 'reposts' | 'replies'> {
  likes: { _id: Types.ObjectId }[]
  reposts: { _id: Types.ObjectId }[]
  replies: {
    _id: Types.ObjectId
    content: string
    author: { username: string }
    likes: { _id: Types.ObjectId }[]
    reposts: { _id: Types.ObjectId }[]
  }[]
}

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
    const post = await Post.findById(params.postId)
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const userId = session.user.id
    const hasLiked = post.likes.includes(userId)

    if (hasLiked) {
      post.likes = post.likes.filter((id: Types.ObjectId) => id.toString() !== userId)
    } else {
      post.likes.push(new Types.ObjectId(userId))
    }

    await post.save()

    const updatedPost = await Post.findById(post._id)
      .populate('author', 'username')
      .populate('likes', '_id')
      .populate('reposts', '_id')
      .populate({
        path: 'replies',
        populate: [
          {
            path: 'author',
            select: 'username'
          },
          {
            path: 'likes',
            select: '_id'
          },
          {
            path: 'reposts',
            select: '_id'
          }
        ]
      })
      .lean() as PopulatedPost

    if (!updatedPost) {
      return NextResponse.json({ error: 'Post not found after update' }, { status: 404 })
    }

    const formattedPost = {
      ...updatedPost,
      likes: updatedPost.likes.map(like => like._id.toString()),
      reposts: updatedPost.reposts.map(repost => repost._id.toString()),
      replies: updatedPost.replies.map(reply => ({
        ...reply,
        _id: reply._id.toString(),
        likes: reply.likes.map(like => like._id.toString()),
        reposts: reply.reposts.map(repost => repost._id.toString())
      }))
    }

    return NextResponse.json(formattedPost)
  } catch (error) {
    console.error('Error handling like:', error)
    return NextResponse.json({ error: 'Failed to handle like' }, { status: 500 })
  }
} 