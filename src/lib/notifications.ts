export async function createNotification(data: {
  recipient: string
  sender: string
  type: 'like' | 'comment' | 'follow' | 'repost' | 'system'
  post?: string
}) {
  const response = await fetch('/api/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    throw new Error('Failed to create notification')
  }

  return response.json()
} 