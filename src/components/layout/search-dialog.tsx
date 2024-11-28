'use client'

import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, X } from 'lucide-react'
import * as DialogRoot from "@radix-ui/react-dialog"
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface User {
  username: string
  avatar?: string
}

interface SearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // Keyboard shortcut handler
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open, onOpenChange])

  // Search users when query changes
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setUsers([])
        return
      }

      setIsLoading(true)
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`)
        if (!response.ok) throw new Error('Failed to fetch users')
        const data = await response.json()
        setUsers(data)
      } catch (error) {
        console.error('Error searching users:', error)
        setUsers([])
      } finally {
        setIsLoading(false)
      }
    }

    const debounceTimeout = setTimeout(searchUsers, 300)
    return () => clearTimeout(debounceTimeout)
  }, [searchQuery])

  const handleUserClick = (username: string) => {
    router.push(`/user/${username}`)
    onOpenChange(false)
  }

  return (
    <DialogRoot.Root open={open} onOpenChange={onOpenChange}>
      <DialogRoot.Portal>
        <DialogRoot.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <DialogRoot.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[95vw] sm:w-[90vw] max-w-[550px] translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-gray-900/95 shadow-2xl focus:outline-none border border-cyan-500/30 backdrop-blur-xl overflow-hidden">
          <div className="p-6 pb-4">
            <div className="flex items-center space-x-2">
              <Search className="h-5 w-5 text-cyan-400" />
              <Input
                placeholder="Search users..."
                className="flex-1 bg-transparent border-none text-cyan-100 placeholder-cyan-400/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <DialogRoot.Close asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/50 rounded-xl transition-all duration-300 ease-in-out hover:scale-105 overflow-hidden"
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogRoot.Close>
            </div>
          </div>
          <ScrollArea className="h-[300px] px-6">
            {isLoading ? (
              <p className="text-center text-cyan-400/50 mt-8">Searching...</p>
            ) : users.length > 0 ? (
              <div>
                <ul className="space-y-3">
                  {users.map((user) => (
                    <li
                      key={user.username}
                      onClick={() => handleUserClick(user.username)}
                      className="flex items-center space-x-3 text-cyan-100 hover:text-cyan-300 cursor-pointer transition-colors p-1 rounded-xl hover:bg-cyan-900/20"
                    >
                      <Avatar className="h-8 w-8 ring-2 ring-cyan-500 ring-offset-2 ring-offset-gray-900 flex-shrink-0">
                        <AvatarImage 
                          src={user.avatar || `/placeholder.svg?height=32&width=32&text=${user.username.charAt(0)}`} 
                          alt={user.username}
                        />
                        <AvatarFallback className="bg-cyan-900 text-cyan-100">
                          {user.username.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">@{user.username}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : searchQuery ? (
              <p className="text-center text-cyan-400/50 mt-8">No users found</p>
            ) : (
              <p className="text-center text-cyan-400/50 mt-8">Start typing to search users</p>
            )}
          </ScrollArea>
        </DialogRoot.Content>
      </DialogRoot.Portal>
    </DialogRoot.Root>
  )
} 