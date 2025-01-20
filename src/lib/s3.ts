import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize S3 client
export const s3Client = new S3Client({
  region: process.env.AWS_REGION as string,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

// Generate a unique key for avatar
export const generateAvatarKey = (userId: string, fileType: string) => {
  const extension = fileType.split('/')[1];
  return `avatars/${userId}/${Date.now()}.${extension}`;
};

// Get presigned URL for upload
export const getPresignedUploadUrl = async (key: string, contentType: string) => {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME as string,
    Key: key,
    ContentType: contentType,
  });

  try {
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    const publicUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${key}`;
    
    return { uploadUrl, publicUrl };
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw new Error('Failed to generate upload URL');
  }
};

// Delete avatar from S3
export const deleteAvatarFromS3 = async (key: string) => {
  if (!key || key.includes('placeholder.svg')) return;

  // Extract key from full URL if necessary
  const cleanKey = key.includes('amazonaws.com') 
    ? key.split('.com/')[1] 
    : key;

  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME as string,
        Key: cleanKey,
      })
    );
  } catch (error) {
    console.error('Error deleting avatar from S3:', error);
    throw new Error('Failed to delete avatar from S3');
  }
};

// Generate a unique key for post media
export const generatePostMediaKey = (userId: string, fileType: string) => {
  const extension = fileType.split('/')[1];
  return `posts/${userId}/${Date.now()}.${extension}`;
};

// Delete media from S3
export const deleteMediaFromS3 = async (keys: string[]) => {
  if (!keys || keys.length === 0) return;

  try {
    await Promise.all(
      keys.map(key => {
        const cleanKey = key.includes('amazonaws.com') 
          ? key.split('.com/')[1] 
          : key;
          
        return s3Client.send(
          new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME as string,
            Key: cleanKey,
          })
        );
      })
    );
  } catch (error) {
    console.error('Error deleting media from S3:', error);
    throw new Error('Failed to delete media from S3');
  }
}; 