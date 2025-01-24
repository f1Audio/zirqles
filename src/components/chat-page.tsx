'use client'

import { useState } from 'react'
import { useStreamChat } from '@/contexts/StreamChatContext'
import {
  Chat,
  Channel,
  ChannelHeader,
  MessageList,
  MessageInput,
  Thread,
  Window,
  ChannelList,
  ChannelPreviewUIComponentProps
} from 'stream-chat-react'
import { Channel as StreamChannel } from 'stream-chat'
import type { DefaultStreamChatGenerics } from 'stream-chat-react'
import { Button } from "./ui/button"
import { Plus, ChevronLeft } from 'lucide-react'
import { SearchDialog } from "./layout/search-dialog"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { EmojiPicker } from "stream-chat-react/emojis";

const getOtherUser = (members: Record<string, any>, currentUserId: string) => {
  return Object.values(members).find(
    (member: any) => member.user?.id !== currentUserId
  )?.user
}

export function ChatPageComponent() {
  const { client, activeChannel, setActiveChannel, createChat } = useStreamChat()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [showMobileChat, setShowMobileChat] = useState(false)

  if (!client) {
    return null
  }

  const filters = { 
    type: 'messaging', 
    members: { $in: [client.userID || ''] } 
  }
  const sort = [{ last_message_at: -1 as const }]

  const handleUserSelect = async (username: string) => {
    try {
      console.log("Starting conversation with:", username);
      
      const response = await fetch(`/api/users/${username}`)
      if (!response.ok) {
        console.error("Failed to fetch user data:", await response.text());
        return;
      }
      const user = await response.json()
      console.log("Found user:", user);
      
      const userId = user.id || user._id
      if (!userId) {
        console.error("User ID is missing from response:", user);
        return;
      }

      const channel = await createChat(userId)
      console.log("Created channel:", channel);
      
      if (channel) {
        setActiveChannel(channel)
        setIsSearchOpen(false)
      } else {
        console.error("Channel creation failed");
      }
    } catch (error) {
      console.error("Failed to create conversation:", error)
    }
  }

  const handleChannelSelect = async (channel: StreamChannel) => {
    try {
      // Set active channel and show mobile chat first for immediate UI response
      setActiveChannel(channel)
      setShowMobileChat(true)
      
      // Then watch channel and mark all messages as read
      await channel.watch()
      
      // Mark channel as read - this will mark all messages as read
      await channel.markRead()
      
      // Update unread counts in the StreamChatContext
      if (client) {
        const filter = { type: 'messaging', members: { $in: [client.userID || ''] } }
        const channels = await client.queryChannels(filter)
        const total = channels.reduce((acc, channel) => acc + channel.state.unreadCount, 0)
        // The totalUnreadCount will be automatically updated through the StreamChatContext
      }
    } catch (error) {
      console.error('Error watching/marking channel:', error)
    }
  }

  const handleBackToList = () => {
    setShowMobileChat(false)
  }

  return (
    <div className="min-h-screen flex items-start justify-center bg-gray-900 md:items-center md:p-4 md:pt-24">
      <div className="w-full max-w-7xl h-[calc(100vh-9rem)] mt-20 mb-8 md:mt-0 md:h-[calc(100vh-12rem)] md:mx-auto">
        <div className="bg-gray-800/50 backdrop-blur-xl border-cyan-500/30 overflow-hidden md:rounded-2xl h-full">
          <div className="h-full flex flex-col">
            <Chat client={client} theme="str-chat__theme-dark">
              <div className="flex h-full relative overflow-hidden">
                {/* Channel List Sidebar */}
                <div className={`
                  md:w-64 md:block md:border-r md:border-gray-800
                  ${showMobileChat ? 'hidden' : 'w-full'} 
                  transition-all duration-300 ease-in-out
                  bg-gray-900 md:bg-transparent
                `}>
                  <div className="p-4 border-b border-gray-800">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-100">Messages</h2>
                      <Button
                        onClick={() => setIsSearchOpen(true)}
                        className="h-8 w-8 p-0 rounded-full bg-cyan-600 hover:bg-cyan-500"
                        size="icon"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <ChannelList 
                    filters={filters} 
                    sort={sort}
                    options={{ state: true, presence: true, limit: 10 }}
                    customActiveChannel={activeChannel?.id}
                    Preview={(previewProps: ChannelPreviewUIComponentProps<DefaultStreamChatGenerics>) => {
                      const otherUser = getOtherUser(previewProps.channel.state.members, client.userID || '')
                      const hasUnread = previewProps.channel.countUnread() > 0
                      const unreadCount = previewProps.channel.countUnread()
                      
                      return (
                        <div 
                          className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                            previewProps.channel?.id === activeChannel?.id 
                              ? 'md:bg-cyan-900/40 md:hover:bg-cyan-900/50' 
                              : 'hover:bg-gray-800'
                          }`}
                          onClick={() => {
                            if (previewProps.channel) {
                              handleChannelSelect(previewProps.channel)
                            }
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className={`h-10 w-10 border ${
                              hasUnread ? 'border-cyan-500' : 'border-gray-700'
                            }`}>
                              <AvatarImage src={otherUser?.image} />
                              <AvatarFallback className="bg-gray-800 text-gray-300">
                                {otherUser?.name?.[0]?.toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className={`font-medium truncate ${
                                hasUnread ? 'text-cyan-300' : 'text-gray-200'
                              }`}>
                                {otherUser?.name || 'Unknown User'}
                              </div>
                              {previewProps.lastMessage && typeof previewProps.lastMessage === 'object' && (
                                <div className={`text-sm truncate ${
                                  hasUnread ? 'text-cyan-400 font-medium' : 'text-gray-400'
                                }`}>
                                  {previewProps.lastMessage.text}
                                </div>
                              )}
                            </div>
                            {hasUnread && (
                              <div className="flex flex-col items-end gap-1">
                                <div className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-cyan-500 text-xs font-medium text-white flex items-center justify-center">
                                  {unreadCount}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    }}
                    EmptyStateIndicator={() => (
                      <div className="text-sm text-gray-400 text-center mt-4 p-4">
                        No conversations yet
                      </div>
                    )}
                  />
                </div>

                {/* Chat Area */}
                <div className={`
                  md:flex-1 md:block
                  w-full h-full
                  ${!showMobileChat ? 'translate-x-full md:translate-x-0' : 'translate-x-0'} 
                  transition-transform duration-300 ease-in-out
                  absolute md:relative left-0 top-0
                  bg-gray-900 md:bg-transparent
                `}>
                  {activeChannel ? (
                    <Channel EmojiPicker={EmojiPicker} channel={activeChannel}>
                      <Window>
                        <div className="md:hidden p-2 border-b border-gray-800">
                          <Button
                            onClick={handleBackToList}
                            variant="ghost"
                            size="sm"
                            className="text-cyan-400"
                          >
                            <ChevronLeft className="h-5 w-5 mr-2" />
                            Back to Messages
                          </Button>
                        </div>
                        <ChannelHeader />
                        <MessageList />
                        <MessageInput />
                      </Window>
                      <Thread />
                    </Channel>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                      Select a conversation or start a new one
                    </div>
                  )}
                </div>
              </div>
            </Chat>
          </div>
        </div>
      </div>
      
      <SearchDialog 
        open={isSearchOpen} 
        onOpenChange={setIsSearchOpen}
        onUserSelect={handleUserSelect}
      />
    </div>
  )
}