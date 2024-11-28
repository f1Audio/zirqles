import { s3Client } from './s3';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';

export async function testS3Connection() {
  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_BUCKET_NAME!,
      MaxKeys: 1
    });
    const response = await s3Client.send(command);
    console.log('Successfully connected to S3 bucket:', response);
    return true;
  } catch (error) {
    console.error('Error connecting to S3:', error);
    return false;
  }
} 