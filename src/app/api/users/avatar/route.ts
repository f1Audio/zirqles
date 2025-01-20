import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { generateAvatarKey, getPresignedUploadUrl, deleteAvatarFromS3 } from '@/lib/s3';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models/User';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contentType } = await req.json();
    
    // Validate content type
    if (!contentType.match(/^image\/(jpeg|png|webp)$/)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
        { status: 400 }
      );
    }

    // Generate new key and get upload URL
    const key = generateAvatarKey(session.user.id, contentType);
    const { uploadUrl, publicUrl } = await getPresignedUploadUrl(key, contentType);

    return NextResponse.json({ uploadUrl, key, publicUrl });
  } catch (error) {
    console.error('Error handling avatar upload:', error);
    return NextResponse.json(
      { error: 'Failed to process avatar upload' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { key } = await req.json();
    await dbConnect();

    // Get user and their current avatar
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Store old avatar key before updating
    const oldAvatarKey = user.avatar;

    // Generate the public URL for the new avatar (using direct S3 URL)
    const publicUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${key}`;

    // Update user's avatar in database with the full URL
    user.avatar = publicUrl;
    await user.save();

    // Delete old avatar from S3 if it exists and isn't the placeholder
    if (oldAvatarKey && !oldAvatarKey.includes('placeholder.svg')) {
      await deleteAvatarFromS3(oldAvatarKey);
    }

    return NextResponse.json({ 
      success: true,
      avatar: publicUrl 
    });
  } catch (error) {
    console.error('Error updating avatar:', error);
    return NextResponse.json(
      { error: 'Failed to update avatar' },
      { status: 500 }
    );
  }
} 