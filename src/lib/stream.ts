import { StreamChat } from 'stream-chat'

if (!process.env.NEXT_PUBLIC_STREAM_KEY) {
  throw new Error('STREAM_KEY is not defined in environment variables.')
}

// Initialize Stream Chat client
export const streamClient = StreamChat.getInstance(
  process.env.NEXT_PUBLIC_STREAM_KEY
)

// Helper function to get user token
export async function getStreamUserToken(userId: string): Promise<string> {
  const response = await fetch('/api/stream/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get stream token: ${error}`)
  }
  
  const { token } = await response.json()
  return token
} 