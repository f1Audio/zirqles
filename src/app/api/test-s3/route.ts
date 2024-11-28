import { NextResponse } from 'next/server';
import { testS3Connection } from '@/lib/s3-test';

export async function GET() {
  try {
    const isConnected = await testS3Connection();
    
    if (isConnected) {
      return NextResponse.json({ 
        status: 'success', 
        message: 'Successfully connected to S3' 
      });
    } else {
      return NextResponse.json({ 
        status: 'error', 
        message: 'Failed to connect to S3' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('S3 test error:', error);
    return NextResponse.json({ 
      status: 'error', 
      message: 'Error testing S3 connection',
      error: (error as Error).message 
    }, { status: 500 });
  }
} 