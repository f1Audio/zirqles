import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { getPresignedUploadUrl, deleteAvatarFromS3 } from '@/lib/s3';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileType, oldKey } = await req.json();
    
    // Generate a unique key for the file
    const key = `avatars/${session.user.id}/${Date.now()}.${fileType.split('/')[1]}`;
    
    try {
      // Get the presigned URL using the updated function name
      const { uploadUrl: url, publicUrl } = await getPresignedUploadUrl(key, fileType);
      
      // Clean up old avatar if it exists and is not the default avatar
      if (oldKey && !oldKey.includes('placeholder.svg')) {
        await deleteAvatarFromS3(oldKey);
      }

      return NextResponse.json({ 
        url, 
        key,
        publicUrl 
      });
    } catch (error) {
      console.error('S3 error:', error);
      return NextResponse.json({ error: 'S3 operation failed' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' }, 
      { status: 500 }
    );
  }
} 