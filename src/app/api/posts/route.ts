import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/options'
import dbConnect from '@/lib/mongodb'
import { Post, IPost } from '@/models/Post'
import { User } from '@/models/User'
import mongoose from 'mongoose'

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

    // Debug logs
    console.log('Current user:', currentUser._id)
    console.log('Following:', currentUser.following?.length || 0, 'users')
    console.log('Following IDs:', currentUser.following)

    // Get all users that the current user follows and ensure they're ObjectIds
    const followedUsers = (currentUser.following || []).map(id => 
      typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
    )

    // Log the query we're about to execute
    const query = {
      $and: [
        { type: 'post' },
        {
          $or: [
            { author: new mongoose.Types.ObjectId(currentUser._id.toString()) },
            { author: { 
              $in: followedUsers.map(id => new mongoose.Types.ObjectId(id.toString())) 
            } }
          ]
        }
      ]
    }
    console.log('MongoDB query:', JSON.stringify(query, null, 2))

    // Execute query and log results before processing
    const rawPosts = await Post.find(query).lean()
    console.log('Raw posts count:', rawPosts.length)
    console.log('Posts by author:', rawPosts.reduce((acc: { [key: string]: number }, post) => {
      const authorId = post.author.toString()
      acc[authorId] = (acc[authorId] || 0) + 1
      return acc
    }, {}))

    const posts = await Post.find(query)
      .populate({
        path: 'author',
        select: '_id username avatar'
      })
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

    console.log('Final posts count:', posts.length)
    console.log('Author IDs in final posts:', posts.map(p => p.author._id.toString()))

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