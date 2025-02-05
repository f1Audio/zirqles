import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import dbConnect from '@/lib/mongodb'
import { Post, IPost } from '@/models/Post'
import { Types } from 'mongoose'
import { Notification } from '@/models/notification'

interface PopulatedPost extends Omit<IPost, 'likes' | 'reposts' | 'comments'> {
  likes: { _id: Types.ObjectId }[]
  reposts: { _id: Types.ObjectId }[]
  comments: {
    _id: Types.ObjectId
    content: string
    author: { username: string }
    likes: { _id: Types.ObjectId }[]
    reposts: { _id: Types.ObjectId }[]
    type: 'comment'
    media: { type: 'image' | 'video'; url: string; key: string; }[]
  }[]
  media: { type: 'image' | 'video'; url: string; key: string; }[]
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
      await Notification.deleteOne({
        recipient: post.author,
        sender: userId,
        type: 'like',
        post: post._id
      })
    } else {
      post.likes.push(new Types.ObjectId(userId))
      
      if (post.author.toString() !== userId) {
        await Notification.create({
          recipient: post.author,
          sender: userId,
          type: post.type === 'comment' ? 'comment_like' : 'like',
          post: post._id,
          read: false
        })
      }
    }

    await post.save()

    const updatedPost = await Post.findById(post._id)
      .populate('author', 'username')
      .populate('likes', '_id')
      .populate('reposts', '_id')
      .populate({
        path: 'comments',
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
          },
          {
            path: 'comments',
            select: '_id'
          }
        ],
        select: 'content author likes reposts comments type depth media'
      })
      .select('content author likes reposts comments type depth media')
      .lean() as unknown as PopulatedPost

    if (!updatedPost) {
      return NextResponse.json({ error: 'Post not found after update' }, { status: 404 })
    }

    const formattedPost = {
      ...updatedPost,
      likes: updatedPost.likes.map(like => like._id.toString()),
      reposts: updatedPost.reposts.map(repost => repost._id.toString()),
      comments: updatedPost.comments.map(comment => ({
        ...comment,
        _id: comment._id.toString(),
        likes: comment.likes.map(like => like._id.toString()),
        reposts: comment.reposts.map(repost => repost._id.toString()),
        media: comment.media || []
      })),
      media: updatedPost.media || []
    }

    return NextResponse.json(formattedPost)
  } catch (error) {
    console.error('Error handling like:', error)
    return NextResponse.json({ error: 'Failed to handle like' }, { status: 500 })
  }
} 