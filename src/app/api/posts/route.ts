import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/options'
import dbConnect from '@/lib/mongodb'
import { Post } from '@/models/Post'
import { User } from '@/models/User'
import { Notification } from '@/models/notification'
import { formatTextWithMentions } from '@/lib/utils'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()
    
    // Get current user and their following list
    const currentUser = await User.findById(session.user.id)
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    // Create query to get posts from followed users and own posts
    const query = {
      $and: [
        { type: 'post' },
        {
          $or: [
            { author: currentUser._id }, // Own posts
            { author: { $in: currentUser.following || [] } } // Posts from followed users
          ]
        }
      ]
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
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
      .lean()

    const totalPosts = await Post.countDocuments(query)
    const hasMore = totalPosts > skip + posts.length

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
        media: comment.media || [],
        createdAt: comment.createdAt
      })),
      type: post.type || 'post',
      depth: post.depth || 0,
      media: post.media || [],
      createdAt: post.createdAt,
      updatedAt: post.updatedAt
    }))

    return NextResponse.json({
      posts: formattedPosts,
      nextPage: hasMore ? page + 1 : undefined
    })
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

    // Handle mentions and create notifications
    const mentions = formatTextWithMentions(content)
      .filter(part => part.type === 'mention')
      .map(part => part.username)

    if (mentions.length > 0) {
      const mentionedUsers = await User.find({
        username: { $in: mentions }
      }).select('_id')

      const notifications = mentionedUsers
        .filter(user => user._id.toString() !== session.user.id) // Don't notify self
        .map(user => ({
          recipient: user._id,
          sender: session.user.id,
          type: 'mention',
          post: savedPost._id,
          read: false
        }))

      if (notifications.length > 0) {
        await Notification.insertMany(notifications)
      }
    }

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