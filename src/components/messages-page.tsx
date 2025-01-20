'use client'

import { useState } from 'react'
import { ChatPageComponent } from './chat-page'
import { Button } from "./ui/button"
import { Plus } from 'lucide-react'
import { useStreamChat } from "@/contexts/StreamChatContext"
import { SearchDialog } from "./layout/search-dialog"

export function MessagesPageComponent() {
  const { createChat, setActiveChannel } = useStreamChat()
  const [isSearchOpen, setIsSearchOpen] = useState(false)

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

  return (
    <div className="container mx-auto px-4">
      <div className="max-w-6xl mx-auto pb-20 md:pb-8">
        <div className="pt-20">
          <div className="bg-gray-800/50 rounded-2xl backdrop-blur-xl border border-cyan-500/30 overflow-hidden">
            <ChatPageComponent />
          </div>
        </div>
      </div>

      <Button
        onClick={() => setIsSearchOpen(true)}
        className="fixed bottom-6 right-6 rounded-full p-4 bg-cyan-600 hover:bg-cyan-500 shadow-lg"
      >
        <Plus className="h-5 w-5" />
      </Button>

      <SearchDialog 
        open={isSearchOpen} 
        onOpenChange={setIsSearchOpen}
        onUserSelect={handleUserSelect}
      />
    </div>
  )
} 