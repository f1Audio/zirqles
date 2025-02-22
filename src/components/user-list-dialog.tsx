'use client'

import * as DialogRoot from "@radix-ui/react-dialog"
import { UserList } from "./user-list"
import { ArrowLeft, X } from "lucide-react"
import { Button } from "./ui/button"

interface UserListDialogProps {
  username: string
  type: 'followers' | 'following'
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserListDialog({ username, type, open, onOpenChange }: UserListDialogProps) {
  return (
    <DialogRoot.Root open={open} onOpenChange={onOpenChange}>
      <DialogRoot.Portal>
        <DialogRoot.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <DialogRoot.Content 
          className="fixed left-[50%] top-[50%] max-h-[85vh] w-[95vw] sm:w-[90vw] max-w-[550px] translate-x-[-50%] translate-y-[-50%] rounded-[40px] bg-gray-900/95 shadow-2xl focus:outline-none border border-cyan-500/30 backdrop-blur-xl overflow-hidden"
          
        >
          <DialogRoot.Description  className="sr-only">
            List of users that {username} {type === 'followers' ? 'is followed by' : 'is following'}
          </DialogRoot.Description>
          
          <div className="p-6 border-b border-cyan-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => onOpenChange(false)}
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <DialogRoot.Title className="text-xl font-semibold text-cyan-100">
                  {username}'s {type}
                </DialogRoot.Title>
              </div>
              <DialogRoot.Close asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/50 rounded-xl transition-all duration-300 ease-in-out hover:scale-105"
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogRoot.Close>
            </div>
          </div>
          <div className="p-4">
            <UserList username={username} type={type} />
          </div>
        </DialogRoot.Content>
      </DialogRoot.Portal>
    </DialogRoot.Root>
  )
} 