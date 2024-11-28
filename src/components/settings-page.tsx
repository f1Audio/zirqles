'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Camera, Lock, Mail, User, AlertTriangle, MapPin, LinkIcon } from 'lucide-react'
import { Navbar } from './layout/navbar'
import { Sidebar } from './layout/sidebar'
import { SearchDialog } from './layout/search-dialog'
import { useAuth } from "@/lib/auth"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useQueryClient } from "@tanstack/react-query"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { getPublicAvatarUrl } from "@/lib/s3"


export function SettingsPageComponent() {
  const router = useRouter()
  const { user, updateUser, updatePassword, deleteAccount } = useAuth()
  const { data: session, update } = useSession()
  const queryClient = useQueryClient()
  
  const [isLoading, setIsLoading] = useState(true)
  const [avatar, setAvatar] = useState("/placeholder.svg?height=128&width=128")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [bio, setBio] = useState("")
  const [location, setLocation] = useState("")
  const [website, setWebsite] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isProfileUpdating, setIsProfileUpdating] = useState(false)
  const [isPasswordUpdating, setIsPasswordUpdating] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  // Load user data when component mounts
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsLoading(true)
        if (!session?.user?.id) {
          router.push('/login')
          return
        }

        // Fetch fresh user data
        const response = await fetch('/api/user')
        if (!response.ok) throw new Error('Failed to fetch user')
        const userData = await response.json()

        setAvatar(userData.avatar || "/placeholder.svg?height=128&width=128")
        setUsername(userData.username || "")
        setEmail(userData.email || "")
        setBio(userData.bio || "")
        setLocation(userData.location || "")
        setWebsite(userData.website || "")
      } catch (error) {
        console.error('Error loading user data:', error)
        toast.error('Failed to load user data')
      } finally {
        setIsLoading(false)
      }
    }

    loadUserData()
  }, [session, router])

  // Show loading state while user data is being fetched
  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-gray-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsProfileUpdating(true);

      // Validate file type and size
      if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
        toast.error('Please upload a valid image file (JPEG, PNG, or WebP)');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      // Optimize image before upload
      const optimizedImage = await optimizeImage(file);

      // Get presigned URL for upload
      const presignedUrlResponse = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileType: file.type,
          oldKey: user?.avatar
        }),
      });

      if (!presignedUrlResponse.ok) throw new Error('Failed to get upload URL');
      const { url, key } = await presignedUrlResponse.json();

      // Upload to S3
      const uploadResponse = await fetch(url, {
        method: 'PUT',
        body: optimizedImage,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) throw new Error('Failed to upload file');

      // Update user avatar with the S3 key
      const response = await fetch('/api/users/avatar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });

      if (!response.ok) throw new Error('Failed to update avatar');

      // Generate public URL
      const publicUrl = getPublicAvatarUrl(key);

      // Update all relevant caches
      updateCaches(key, publicUrl);
      
      toast.success('Avatar updated successfully');
    } catch (error) {
      console.error('Error updating avatar:', error);
      toast.error('Failed to update avatar');
    } finally {
      setIsProfileUpdating(false);
    }
  };

  // Helper function to optimize image
  async function optimizeImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        // Calculate new dimensions (max 400x400)
        const maxSize = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and optimize
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to optimize image'));
          },
          'image/jpeg',
          0.8 // Quality setting
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  // Helper function to update all caches
  function updateCaches(key: string, displayUrl: string) {
    // Update local state
    setAvatar(displayUrl);
    
    // Update user cache
    queryClient.setQueryData(['user'], (old: any) => ({
      ...old,
      avatarKey: key
    }));

    // Update profile cache
    if (session?.user?.username) {
      queryClient.setQueryData(['user', session.user.username], (old: any) => ({
        ...old,
        avatarKey: key
      }));
    }

    // Update posts cache to reflect new avatar
    queryClient.setQueriesData({ queryKey: ['posts'] }, (old: any) => {
      if (!Array.isArray(old)) return old;
      return old.map((post: any) => {
        if (post.author?.id === session?.user?.id) {
          return {
            ...post,
            author: {
              ...post.author,
              avatarKey: key
            }
          };
        }
        return post;
      });
    });
  }

  const handleProfileUpdate = async () => {
    try {
      setIsProfileUpdating(true)
      await updateUser({
        username,
        email,
        bio,
        location,
        website
      })
      
      // Get the old username from the session for cache updates
      const oldUsername = session?.user?.username

      // Update both user query caches
      queryClient.setQueryData(['user', username], (old: any) => {
        if (!old) return old
        return {
          ...old,
          bio,
          location,
          website,
          name: username,
          handle: `@${username.toLowerCase()}`
        }
      })

      // Also update the basic user data cache if it exists
      queryClient.setQueryData(['user'], (old: any) => {
        if (!old) return old
        return {
          ...old,
          username,
          email,
          bio,
          location,
          website
        }
      })

      // Update all posts cache to reflect new username
      queryClient.setQueriesData({ queryKey: ['posts'] }, (old: any) => {
        if (!old) return old
        return old.map((post: any) => {
          if (post.author?.username === oldUsername) {
            return {
              ...post,
              author: {
                ...post.author,
                username,
                name: username,
                handle: `@${username.toLowerCase()}`
              }
            }
          }
          return post
        })
      })

      // Update the session with new username
      await update({
        ...session,
        user: {
          ...session?.user,
          username: username
        }
      })

      // Then invalidate to ensure consistency
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user'] }),
        queryClient.invalidateQueries({ queryKey: ['user', username] }),
        queryClient.invalidateQueries({ queryKey: ['posts'] }),
        // If old username exists, invalidate its queries too
        oldUsername && queryClient.invalidateQueries({ queryKey: ['user', oldUsername] }),
        queryClient.invalidateQueries({ queryKey: ['userPosts'] })
      ])
      
      toast.success('Profile updated successfully')

      // Force refetch of posts to ensure consistency
      queryClient.refetchQueries({ queryKey: ['posts'] })
      queryClient.refetchQueries({ queryKey: ['userPosts'] })
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile')
      console.error(error)
    } finally {
      setIsProfileUpdating(false)
    }
  }

  const handlePasswordUpdate = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    try {
      setIsPasswordUpdating(true)
      await updatePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Password updated successfully')
    } catch (error) {
      toast.error('Failed to update password')
      console.error(error)
    } finally {
      setIsPasswordUpdating(false)
    }
  }

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount()
      router.push('/login')
      toast.success('Account deleted successfully')
    } catch (error) {
      toast.error('Failed to delete account')
      console.error(error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-cyan-300 font-sans">
      <Navbar onSearchOpen={() => setIsSearchOpen(true)} />

      <div className="min-h-[calc(100vh-4rem)]">
        <Sidebar />

        <main className="md:pl-64">
          <div className="container mx-auto px-8">
            <div className="max-w-2xl mx-auto pb-20 md:pb-8">
              {/* Settings Content */}
              <div className="pt-20">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">
                  Account Settings
                </h1>

                <div className="space-y-8 mt-8">
                  {/* Profile Section */}
                  <div className="bg-cyan-900/20 rounded-2xl p-6 backdrop-blur-sm border border-cyan-500/20 shadow-md shadow-cyan-500/5 hover:shadow-cyan-400/10 transition-all duration-300">
                    <h2 className="text-xl font-semibold mb-6">Profile Information</h2>
                    <div className="flex flex-col md:flex-row items-start gap-8">
                      <div className="relative">
                        <Avatar className="w-32 h-32 ring-4 ring-cyan-500 ring-offset-4 ring-offset-gray-900">
                          <AvatarImage src={avatar} alt={username} />
                          <AvatarFallback className="bg-cyan-900 text-cyan-100 text-4xl">
                            {username.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <Label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-cyan-500 text-gray-900 rounded-xl p-2 cursor-pointer hover:bg-cyan-400 transition-all duration-300 hover:scale-105">
                          <Camera className="w-5 h-5" />
                          <input id="avatar-upload" type="file" className="sr-only" onChange={handleAvatarChange} accept="image/*" />
                        </Label>
                      </div>
                      <div className="space-y-4 flex-grow">
                        <div className="space-y-2">
                          <Label htmlFor="username" className="text-sm font-medium text-cyan-300">Username</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-500" />
                            <Input
                              id="username"
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                              className="pl-10 bg-gray-800/80 border-cyan-500/50 text-cyan-100 focus:border-cyan-400 focus:bg-gray-800 rounded-xl"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-sm font-medium text-cyan-300">Email</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-500" />
                            <Input
                              id="email"
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="pl-10 bg-gray-800/80 border-cyan-500/50 text-cyan-100 focus:border-cyan-400 focus:bg-gray-800 rounded-xl"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bio" className="text-sm font-medium text-cyan-300">Bio</Label>
                          <textarea
                            id="bio"
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            rows={3}
                            className="w-full bg-gray-800/80 border-cyan-500/50 text-cyan-100 focus:border-cyan-400 focus:bg-gray-800 rounded-xl p-3 resize-none"
                            placeholder="Tell us about yourself..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="location" className="text-sm font-medium text-cyan-300">Location</Label>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-500" />
                            <Input
                              id="location"
                              value={location}
                              onChange={(e) => setLocation(e.target.value)}
                              className="pl-10 bg-gray-800/80 border-cyan-500/50 text-cyan-100 focus:border-cyan-400 focus:bg-gray-800 rounded-xl"
                              placeholder="Your location"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="website" className="text-sm font-medium text-cyan-300">Website</Label>
                          <div className="relative">
                            <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-500" />
                            <Input
                              id="website"
                              type="url"
                              value={website}
                              onChange={(e) => setWebsite(e.target.value)}
                              className="pl-10 bg-gray-800/80 border-cyan-500/50 text-cyan-100 focus:border-cyan-400 focus:bg-gray-800 rounded-xl"
                              placeholder="https://your-website.com"
                            />
                          </div>
                        </div>
                        <Button 
                          className="w-full bg-gradient-to-r from-cyan-700 via-cyan-600 to-cyan-500 hover:from-cyan-600 hover:via-cyan-500 hover:to-cyan-400 text-white font-medium rounded-xl transition-all duration-300 hover:scale-[1.01] hover:shadow-md hover:shadow-cyan-500/20"
                          onClick={handleProfileUpdate}
                          disabled={isProfileUpdating}
                        >
                          {isProfileUpdating ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Security Section */}
                  <div className="bg-cyan-900/20 rounded-2xl p-6 backdrop-blur-sm border border-cyan-500/20 shadow-md shadow-cyan-500/5 hover:shadow-cyan-400/10 transition-all duration-300">
                    <h2 className="text-xl font-semibold mb-6">Security</h2>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="current-password" className="text-sm font-medium text-cyan-300">Current Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-500" />
                          <Input
                            id="current-password"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="pl-10 bg-gray-800/80 border-cyan-500/50 text-cyan-100 focus:border-cyan-400 focus:bg-gray-800 rounded-xl"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password" className="text-sm font-medium text-cyan-300">New Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-500" />
                          <Input
                            id="new-password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="pl-10 bg-gray-800/80 border-cyan-500/50 text-cyan-100 focus:border-cyan-400 focus:bg-gray-800 rounded-xl"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password" className="text-sm font-medium text-cyan-300">Confirm New Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-500" />
                          <Input
                            id="confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="pl-10 bg-gray-800/80 border-cyan-500/50 text-cyan-100 focus:border-cyan-400 focus:bg-gray-800 rounded-xl"
                          />
                        </div>
                      </div>
                      <Button 
                        className="w-full bg-gradient-to-r from-cyan-700 via-cyan-600 to-cyan-500 hover:from-cyan-600 hover:via-cyan-500 hover:to-cyan-400 text-white font-medium rounded-xl transition-all duration-300 hover:scale-[1.01] hover:shadow-md hover:shadow-cyan-500/20"
                        onClick={handlePasswordUpdate}
                        disabled={isPasswordUpdating}
                      >
                        {isPasswordUpdating ? "Updating..." : "Change Password"}
                      </Button>
                    </div>
                  </div>

                  {/* Preferences Section */}
                  <div className="bg-cyan-900/20 rounded-2xl p-6 backdrop-blur-sm border border-cyan-500/20 shadow-md shadow-cyan-500/5 hover:shadow-cyan-400/10 transition-all duration-300">
                    <h2 className="text-xl font-semibold mb-6">Preferences</h2>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="notifications" className="text-sm font-medium text-cyan-300">Enable Notifications</Label>
                        <Switch id="notifications" />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="dark-mode" className="text-sm font-medium text-cyan-300">Dark Mode</Label>
                        <Switch id="dark-mode" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="two-factor" className="text-sm font-medium text-cyan-300">Two-Factor Authentication</Label>
                        <Switch id="two-factor" />
                      </div>
                    </div>
                  </div>

                  <Separator className="my-8 bg-cyan-500/30" />

                  {/* Danger Zone */}
                  <div className="bg-red-900/20 rounded-2xl p-6 backdrop-blur-sm border border-red-500/20 shadow-md shadow-red-500/5 hover:shadow-red-400/10 transition-all duration-300">
                    <h2 className="text-xl font-semibold mb-6 text-red-400">Danger Zone</h2>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          className="w-full bg-gradient-to-r from-red-700 via-red-600 to-red-500 hover:from-red-600 hover:via-red-500 hover:to-red-400 text-white font-medium rounded-xl transition-all duration-300 hover:scale-[1.01] hover:shadow-md hover:shadow-red-500/20"
                        >
                          Delete Account
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-gray-900/95 border border-red-500/20 rounded-2xl backdrop-blur-xl shadow-xl shadow-red-500/10 p-6 max-w-lg mx-auto">
                        <AlertDialogHeader className="space-y-4">
                          <AlertDialogTitle className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">
                            Are you absolutely sure?
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-gray-300 text-base leading-relaxed">
                            This action cannot be undone. This will permanently delete your account and remove all of your data from our servers.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-8 flex gap-3">
                          <AlertDialogCancel className="flex-1 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white rounded-xl border border-gray-700 hover:border-gray-600 transition-all duration-300">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction 
                            className="flex-1 bg-gradient-to-r from-red-700 via-red-600 to-red-500 hover:from-red-600 hover:via-red-500 hover:to-red-400 text-white font-medium rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-md hover:shadow-red-500/20 border border-red-500/20"
                            onClick={handleDeleteAccount}
                          >
                            <AlertTriangle className="mr-2 h-5 w-5" />
                            Delete Account
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <SearchDialog open={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </div>
  )
}