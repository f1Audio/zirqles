import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { connectDB } from './mongodb';
import { User } from '@/models/User';

export const s3Client = new S3Client({
  region: process.env.AWS_REGION as string,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

export function getPublicAvatarUrl(key: string): string {
  if (!key) return '';
  const bucketName = process.env.AWS_BUCKET_NAME;
  const region = process.env.AWS_REGION;
  return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
}

export async function generateUploadUrl(key: string, fileType: string) {
  const putCommand = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME as string,
    Key: key,
    ContentType: fileType,
    CacheControl: 'public, max-age=31536000',
  });

  return getSignedUrl(s3Client, putCommand, { expiresIn: 3600 });
}

export async function cleanupAvatar(key: string | null) {
  if (!key) return;
  
  try {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME as string,
      Key: key
    }));
  } catch (error) {
    console.error('Error cleaning up avatar:', error);
    throw new Error('Failed to cleanup old avatar');
  }
}

export async function cleanupOrphanedAvatars() {
  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_BUCKET_NAME as string,
      Prefix: 'avatars/'
    });

    const { Contents = [] } = await s3Client.send(command);
    
    // Get list of valid avatar keys from database
    await connectDB();
    const users = await User.find({}, 'avatar');
    const validKeys = new Set(users.map(user => user.avatar).filter(Boolean));

    // Delete orphaned avatars
    for (const object of Contents) {
      if (object.Key && !validKeys.has(object.Key)) {
        await cleanupAvatar(object.Key);
        console.log(`Cleaned up orphaned avatar: ${object.Key}`);
      }
    }
  } catch (error) {
    console.error('Error in cleanup:', error);
    throw error;
  }
} 