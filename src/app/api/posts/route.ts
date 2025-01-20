import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/options'
import dbConnect from '@/lib/mongodb'
import { Post, IPost } from '@/models/Post'
import { User } from '@/models/User'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    const currentUser = await User.findById(session.user.id)
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const posts = await Post.find({
      author: { $in: [...(currentUser.following || []), currentUser._id] },
      type: 'post' // Only fetch root posts
    })
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
      .select('content author likes reposts comments type depth media createdAt updatedAt')
      .sort({ createdAt: -1 })
      .lean()

    const formattedPosts = posts.map((post: any) => ({
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
    }))

    return NextResponse.json(formattedPosts)
  } catch (error) {
    console.error('Error fetching posts:', error)
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { content, media } = body
    
    if (!content?.trim() && (!media || media.length === 0)) {
      return NextResponse.json({ error: 'Content or media is required' }, { status: 400 })
    }

    await dbConnect()
    const user = await User.findById(session.user.id)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create post with explicit media array
    const mediaArray = Array.isArray(media) ? media.map(item => ({
      type: item.type,
      url: item.url,
      key: item.key
    })) : []

    const postData = {
      content: content.trim() || '',
      author: user._id,
      media: mediaArray,
      likes: [],
      reposts: [],
      comments: [],
      type: 'post',
      depth: 0
    }
    
    const newPost = new Post(postData)
    const savedPost = await newPost.save()

    // Fetch the post with populated author
    const populatedPost = await Post.findById(savedPost._id)
      .populate('author', 'username avatar')
      .lean() as any

    if (!populatedPost) {
      throw new Error('Failed to fetch created post')
    }

    // Format the response
    const formattedPost = {
      _id: populatedPost._id.toString(),
      content: populatedPost.content,
      author: {
        _id: populatedPost.author._id.toString(),
        username: populatedPost.author.username,
        avatar: populatedPost.author.avatar
      },
      likes: [],
      reposts: [],
      comments: [],
      type: populatedPost.type,
      depth: populatedPost.depth,
      media: populatedPost.media || [],
      createdAt: populatedPost.createdAt,
      updatedAt: populatedPost.updatedAt
    }

    return NextResponse.json(formattedPost)
  } catch (error) {
    console.error('Error creating post:', error)
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    )
  }
} 