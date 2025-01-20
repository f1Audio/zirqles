'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { UserList } from "./user-list"
import { ArrowLeft } from "lucide-react"
import { Button } from "./ui/button"

interface UserListDialogProps {
  username: string
  type: 'followers' | 'following'
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserListDialog({ username, type, open, onOpenChange }: UserListDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-gray-800/95 border border-cyan-500/20 text-cyan-100 backdrop-blur-xl rounded-2xl p-0 gap-0">
        <DialogHeader className="p-4 border-b border-cyan-500/20">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => onOpenChange(false)}
              variant="ghost"
              size="sm"
              className="rounded-full hover:bg-cyan-500/10 hover:text-cyan-300"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle className="text-xl font-semibold">
              {username}'s {type}
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500/20 scrollbar-track-transparent">
          <UserList username={username} type={type} />
        </div>
      </DialogContent>
    </Dialog>
  )
} 