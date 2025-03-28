'use client'

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { StreamChat, Channel } from 'stream-chat'
import { SessionProvider, useSession } from 'next-auth/react'
import { getStreamUserToken } from '@/lib/stream'

// Create client outside component but only on client side
const streamClient = typeof window !== 'undefined' 
  ? StreamChat.getInstance(process.env.NEXT_PUBLIC_STREAM_KEY!, {
      enableWSFallback: true,
      allowServerSideConnect: false,
    })
  : null;

interface StreamChatContextType {
  client: StreamChat | null
  activeChannel: Channel | null
  setActiveChannel: (channel: Channel | null) => void
  createChat: (targetUserId: string) => Promise<Channel | undefined>
  unreadCount: number
  totalUnreadCount: number
}

const StreamChatContext = createContext<StreamChatContextType>({
  client: null,
  activeChannel: null,
  setActiveChannel: () => {},
  createChat: async () => undefined,
  unreadCount: 0,
  totalUnreadCount: 0
})

function StreamChatProviderWithSession({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const [client, setClient] = useState<StreamChat | null>(null)
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [totalUnreadCount, setTotalUnreadCount] = useState(0)

  useEffect(() => {
    if (!streamClient || !session?.user?.id) {
      if (streamClient?.wsConnection) {
        streamClient.disconnectUser().catch(console.error)
      }
      setClient(null)
      setUnreadCount(0)
      setTotalUnreadCount(0)
      return
    }

    let didCancel = false

    const connectUserAsync = async () => {
      try {
        if (didCancel || !session.user.id) return

        const token = await getStreamUserToken(session.user.id)
        await streamClient.connectUser(
          {
            id: session.user.id,
            name: session.user.name ?? session.user.username ?? '',
            image: session.user.image ?? '',
          },
          token
        )
        
        if (!didCancel) {
          setClient(streamClient)
          
          // Get initial unread count from all channels
          const filter = { type: 'messaging', members: { $in: [session.user.id] } }
          const channels = await streamClient.queryChannels(filter)
          const total = channels.reduce((acc, channel) => acc + channel.state.unreadCount, 0)
          setTotalUnreadCount(total)

          // Listen for message.new events
          streamClient.on('message.new', (event) => {
            if (event.user?.id !== session.user.id) {
              setTotalUnreadCount(prev => prev + 1)
            }
          })

          // Listen for notification.mark_read events
          streamClient.on('notification.mark_read', () => {
            // Update total unread count when a channel is marked as read
            const filter = { type: 'messaging', members: { $in: [session.user.id] } }
            streamClient.queryChannels(filter).then(channels => {
              const total = channels.reduce((acc, channel) => acc + channel.state.unreadCount, 0)
              setTotalUnreadCount(total)
            })
          })

          // Add message.read event listener
          streamClient.on('message.read', () => {
            // Update total unread count when messages are marked as read
            const filter = { type: 'messaging', members: { $in: [session.user.id] } }
            streamClient.queryChannels(filter).then(channels => {
              const total = channels.reduce((acc, channel) => acc + channel.state.unreadCount, 0)
              setTotalUnreadCount(total)
            })
          })
        }
      } catch (error) {
        console.error('Error connecting to Stream:', error)
        if (!didCancel) {
          setClient(null)
        }
      }
    }

    connectUserAsync()

    return () => {
      didCancel = true
      if (streamClient?.wsConnection) {
        streamClient.disconnectUser().catch(console.error)
      }
      setClient(null)
      setUnreadCount(0)
      setTotalUnreadCount(0)
    }
  }, [session?.user?.id, session?.user?.name, session?.user?.username, session?.user?.image])

  const createChat = useCallback(async (targetUserId: string) => {
    try {
      if (!client || !session?.user) {
        console.error("Client or session not available")
        return
      }

      // First check if target user exists in Stream
      let targetUser
      try {
        targetUser = await client.queryUsers({ id: targetUserId })
      } catch (error) {
        console.error("Error querying Stream user:", error)
      }

      // If user doesn't exist in Stream, create them through our API
      if (!targetUser?.users?.length) {
        try {
          // Fetch user details from your API
          const userResponse = await fetch(`/api/users/id/${targetUserId}`)
          if (!userResponse.ok) {
            throw new Error('Failed to fetch user details')
          }
          const userData = await userResponse.json()

          // Create user in Stream through our API
          const streamResponse = await fetch('/api/stream/user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetUserId,
              name: userData.name || userData.username,
              avatar: userData.avatar,
            }),
          })

          if (!streamResponse.ok) {
            throw new Error('Failed to create Stream user')
          }
        } catch (error) {
          console.error("Error creating Stream user:", error)
          throw new Error('Failed to create user in Stream')
        }
      }

      const channelId = [session.user.id, targetUserId].sort().join('-')
      
      const channel = client.channel('messaging', channelId, {
        members: [
          { user_id: session.user.id},
          { user_id: targetUserId}
        ],
        created_by_id: session.user.id,
      })

      await channel.create()
      
      await channel.watch()
      
      return channel
    } catch (error) {
      
      throw error
    }
  }, [client, session?.user])

  const value = useMemo(() => ({
    client,
    activeChannel,
    setActiveChannel,
    createChat,
    unreadCount,
    totalUnreadCount
  }), [client, activeChannel, unreadCount, totalUnreadCount, createChat])

  return (
    <StreamChatContext.Provider value={value}>
      {children}
    </StreamChatContext.Provider>
  )
}

export function StreamChatProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <StreamChatProviderWithSession>{children}</StreamChatProviderWithSession>
    </SessionProvider>
  )
}

export const useStreamChat = () => useContext(StreamChatContext) 