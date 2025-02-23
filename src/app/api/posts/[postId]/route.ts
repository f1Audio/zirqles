import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import dbConnect from '@/lib/mongodb'
import { Post } from '@/models/Post'
import { deleteMediaFromS3 } from '@/lib/s3'
import { Notification } from '@/models/notification'

interface MongoPost {
  _id: any;
  content: string;
  author: {
    _id: any;
    username: string;
    avatar?: string;
  };
  likes: any[];
  reposts: any[];
  comments: any[];
  type?: 'post' | 'comment';
  depth?: number;
  media?: Array<{
    type: string;
    url: string;
    key: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export async function GET(
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
      .populate('author', 'username avatar')
      .populate('likes', '_id')
      .populate('reposts', '_id')
      .populate({
        path: 'comments',
        populate: [
          { path: 'author', select: 'username avatar' },
          { path: 'likes', select: '_id' },
          { path: 'reposts', select: '_id' },
          { 
            path: 'comments',
            populate: [
              { path: 'author', select: 'username avatar' },
              { path: 'likes', select: '_id' },
              { path: 'reposts', select: '_id' }
            ],
            select: 'content author likes reposts comments type depth media createdAt'
          }
        ],
        select: 'content author likes reposts comments type depth media createdAt'
      })
      .lean() as unknown as MongoPost

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Format the response
    const formattedPost = {
      _id: post._id.toString(),
      content: post.content,
      author: {
        _id: post.author._id.toString(),
        username: post.author.username,
        avatar: post.author.avatar
      },
      likes: post.likes.map((like: any) => like._id.toString()),
      reposts: post.reposts.map((repost: any) => repost._id.toString()),
      comments: (post.comments || []).map((comment: any) => ({
        _id: comment._id.toString(),
        content: comment.content,
        author: {
          _id: comment.author._id.toString(),
          username: comment.author.username,
          avatar: comment.author.avatar
        },
        likes: comment.likes.map((like: any) => like._id.toString()),
        reposts: comment.reposts.map((repost: any) => repost._id.toString()),
        comments: (comment.comments || []).map((nestedComment: any) => ({
          _id: nestedComment._id.toString(),
          content: nestedComment.content,
          author: {
            _id: nestedComment.author._id.toString(),
            username: nestedComment.author.username,
            avatar: nestedComment.author.avatar
          },
          likes: nestedComment.likes.map((like: any) => like._id.toString()),
          reposts: nestedComment.reposts.map((repost: any) => repost._id.toString()),
          type: nestedComment.type,
          depth: nestedComment.depth,
          media: nestedComment.media || [],
          createdAt: nestedComment.createdAt
        })),
        type: comment.type,
        depth: comment.depth,
        media: comment.media || [],
        createdAt: comment.createdAt
      })),
      type: post.type || 'post',
      depth: post.depth || 0,
      media: post.media || [],
      createdAt: post.createdAt,
      updatedAt: post.updatedAt
    }

    return NextResponse.json(formattedPost)
  } catch (error) {
    console.error('Error fetching post:', error)
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 })
  }
}

// Add this helper function outside the route handlers
async function getAllNestedCommentIds(postId: string): Promise<string[]> {
  const comments = await Post.find({ parentPost: postId })
  const nestedIds = await Promise.all(
    comments.map(async (comment) => {
      const nested = await getAllNestedCommentIds(comment._id.toString())
      return [comment._id.toString(), ...nested]
    })
  )
  return nestedIds.flat()
}

export async function DELETE(
  req: Request,
  { params }: { params: { postId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()
    
    // Find the post and verify ownership
    const post = await Post.findById(params.postId)
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    if (post.author.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Delete media from S3 if exists
    if (post.media && post.media.length > 0) {
      const mediaKeys = post.media.map((item: any) => item.key)
      await deleteMediaFromS3(mediaKeys)
    }

    // Delete all notifications related to this post
    await Notification.deleteMany({
      $or: [
        { post: post._id },
        { post: { $in: await getAllNestedCommentIds(post._id) } }
      ]
    })

    // Remove comment reference from parent post if this is a comment
    if (post.parentPost) {
      await Post.updateOne(
        { _id: post.parentPost },
        { $pull: { comments: post._id } }
      )
    }

    // Delete all nested comments recursively
    const deleteNestedComments = async (postId: string) => {
      const comments = await Post.find({ parentPost: postId })
      for (const comment of comments) {
        await deleteNestedComments(comment._id.toString())
        await Post.deleteOne({ _id: comment._id })
      }
    }
    await deleteNestedComments(post._id.toString())

    // Delete the post/comment itself
    await Post.deleteOne({ _id: post._id })

    // Return whether it was a comment or post based on the type field
    return NextResponse.json({ 
      message: post.type === 'comment' ? 'Comment deleted successfully' : 'Post deleted successfully',
      type: post.type
    })
  } catch (error) {
    console.error('Error in delete API:', error)
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
  }
} 