'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useQueryClient } from '@tanstack/react-query'

interface User {
  id: string
  username: string
  email: string
  avatar?: string
  bio?: string
  location?: string
  website?: string
}

interface AuthContextType {
  user: User | null
  updateUser: (data: Partial<User>) => Promise<void>
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>
  deleteAccount: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const { data: session, status, update: updateSession } = useSession()
  const queryClient = useQueryClient()

  useEffect(() => {
    const fetchUser = async () => {
      if (session?.user?.id) {
        try {
          const response = await fetch('/api/user')
          if (!response.ok) throw new Error('Failed to fetch user')
          const userData = await response.json()
          setUser(userData)
        } catch (error) {
          console.error('Error fetching user:', error)
        }
      } else if (status === 'unauthenticated') {
        setUser(null)
      }
    }

    fetchUser()
  }, [session, status])

  const updateUser = async (data: Partial<User>) => {
    try {
      const response = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update user')
      }
      
      const updatedUser = await response.json()
      setUser(updatedUser)
      
      // Update session with new data
      await updateSession({
        ...session,
        user: {
          ...session?.user,
          ...updatedUser
        }
      })

      // Force session revalidation
      await revalidateSession()
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['user'] })
      if (updatedUser.username) {
        queryClient.invalidateQueries({ queryKey: ['user', updatedUser.username] })
      }
    } catch (error) {
      throw error
    }
  }

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    const response = await fetch('/api/user/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword })
    })
    
    if (!response.ok) throw new Error('Failed to update password')
  }

  const deleteAccount = async () => {
    const response = await fetch('/api/user', {
      method: 'DELETE'
    })
    
    if (!response.ok) throw new Error('Failed to delete account')
    
    // Sign out after successful deletion
    await signOut({ callbackUrl: '/login' })
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, updateUser, updatePassword, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export async function revalidateSession() {
  // Force a session refresh using POST
  await fetch('/api/auth/session', { method: 'POST' })
  
  // Wait for session to propagate
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // Force a client-side update
  document.dispatchEvent(new Event("visibilitychange"))
} 