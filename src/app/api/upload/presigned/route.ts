import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { cleanupAvatar, getPublicAvatarUrl, s3Client } from '@/lib/s3';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileType, oldKey } = await req.json();
    const key = `avatars/${session.user.id}/avatar.${fileType.split('/')[1]}`;

    // Generate upload URL first
    const putCommand = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME as string,
      Key: key,
      ContentType: fileType,
      CacheControl: 'public, max-age=31536000',
      Metadata: {
        userId: session.user.id as string,
        uploadedAt: new Date().toISOString(),
        oldKey: oldKey || '', // Track for potential rollback
      },
    });

    const uploadUrl = await getSignedUrl(s3Client, putCommand, { 
      expiresIn: 3600 
    });

    // Only delete old avatar after successful generation of new upload URL
    if (oldKey && oldKey !== key) {
      await cleanupAvatar(oldKey);
    }

    return NextResponse.json({ 
      url: uploadUrl,
      key,
      publicUrl: getPublicAvatarUrl(key)
    });
  } catch (error) {
    console.error('Error in avatar upload:', error);
    return NextResponse.json(
      { error: 'Failed to process avatar upload' },
      { status: 500 }
    );
  }
} 