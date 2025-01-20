import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import dbConnect from '@/lib/mongodb'
import { Post } from '@/models/Post'
import { deleteMediaFromS3 } from '@/lib/s3'

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

    // Remove comment reference from parent post if this is a comment
    if (post.parentId) {
      await Post.updateOne(
        { _id: post.parentId },
        { $pull: { comments: post._id } }
      )
    }

    // Delete all nested comments recursively
    const deleteNestedComments = async (postId: string) => {
      const comments = await Post.find({ parentId: postId })
      for (const comment of comments) {
        await deleteNestedComments(comment._id.toString())
        await Post.deleteOne({ _id: comment._id })
      }
    }
    await deleteNestedComments(post._id.toString())

    // Delete the post/comment itself
    await Post.deleteOne({ _id: post._id })

    return NextResponse.json({ message: 'Post deleted successfully' })
  } catch (error) {
    console.error('Error in delete API:', error)
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
  }
} 