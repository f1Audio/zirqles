import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import dbConnect from '@/lib/mongodb';
import { Post } from '@/models/Post';
import { User } from '@/models/User';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, mediaItems } = await req.json();
    
    if (!content?.trim() && (!mediaItems || mediaItems.length === 0)) {
      return NextResponse.json({ error: 'Content or media is required' }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create post with media
    const post = await Post.create({
      content: content.trim(),
      author: user._id,
      media: mediaItems
    });

    // Fetch the populated post
    const populatedPost = await Post.findById(post._id)
      .populate('author', 'username avatar')
      .select('content author media likes reposts replies createdAt updatedAt')
      .lean();

    return NextResponse.json(populatedPost);
  } catch (error) {
    console.error('Error creating post with media:', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
