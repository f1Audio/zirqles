import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { generatePostMediaKey, getPresignedUploadUrl } from '@/lib/s3';

const ALLOWED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp'],
  video: ['video/mp4', 'video/quicktime']
};

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contentType } = await req.json();
    
    // Validate content type
    const mediaType = contentType.startsWith('image/') ? 'image' : 'video';
    if (!ALLOWED_TYPES[mediaType].includes(contentType)) {
      return NextResponse.json(
        { error: 'Invalid file type' },
        { status: 400 }
      );
    }

    // Generate new key and get upload URL
    const key = generatePostMediaKey(session.user.id, contentType);
    const { uploadUrl, publicUrl } = await getPresignedUploadUrl(key, contentType);

    return NextResponse.json({ 
      uploadUrl, 
      key, 
      publicUrl,
      type: mediaType 
    });
  } catch (error) {
    console.error('Error handling media upload:', error);
    return NextResponse.json(
      { error: 'Failed to process media upload' },
      { status: 500 }
    );
  }
} 