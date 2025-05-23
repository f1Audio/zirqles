'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Camera, Lock, Mail, User, AlertTriangle, MapPin, LinkIcon, MessageSquare } from 'lucide-react'
import { Navbar } from './layout/navbar'
import { Sidebar } from './layout/sidebar'
import { SearchDialog } from './layout/search-dialog'
import { useAuth } from "@/lib/auth"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useQueryClient } from "@tanstack/react-query"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useUpdateAvatar } from '../queries/user'
import { validatePassword } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertCircle } from "lucide-react"
import { AvatarCropper } from './avatar-cropper'

export function SettingsPageComponent() {
  const router = useRouter()
  const { updatePassword, deleteAccount } = useAuth()
  const { data: session, status, update } = useSession()
  const queryClient = useQueryClient()
  const updateAvatarMutation = useUpdateAvatar();
  
  const [isLoading, setIsLoading] = useState(true)
  const [avatar, setAvatar] = useState("")
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
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [passwordRequirements, setPasswordRequirements] = useState<string[]>([])
  const [name, setName] = useState("")
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null)

  // Modified useEffect to handle loading state better
  useEffect(() => {
    const loadUserData = async () => {
      try {
        if (!session?.user?.email) {
          router.push('/login')
          return
        }

        setIsLoading(true)
        
        const response = await fetch('/api/user')
        if (!response.ok) {
          throw new Error('Failed to fetch user data')
        }
        
        const userData = await response.json()
        
        setName(userData.name || "")
        setAvatar(userData.avatar || "")
        setUsername(userData.username || "")
        setEmail(userData.email || "")
        setBio(userData.bio || "")
        setLocation(userData.location || "")
        setWebsite(userData.website || "")
      } catch (error) {
        console.error('Error loading user data:', error)
        toast.error('Failed to load user data')
        
        // Set defaults from session
        if (session?.user) {
          setName(session.user.name || "")
          setUsername(session.user.username || "")
          setEmail(session.user.email || "")
        }
      } finally {
        setIsLoading(false)
      }
    }

    if (session?.user) {
      loadUserData()
    }
  }, [session?.user, router])

  // Update the password validation useEffect
  useEffect(() => {
    if (newPassword) {
      const validation = validatePassword(newPassword)
      setPasswordError(validation.isValid ? null : validation.missing[0])
      setPasswordRequirements(validation.missing)
    } else {
      setPasswordError(null)
      setPasswordRequirements([])
    }
  }, [newPassword])

  // Add proper loading state check
  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Create a temporary URL for the cropper
    const tempUrl = URL.createObjectURL(file);
    setTempImageUrl(tempUrl);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    try {
      const toastId = toast.loading('Updating profile picture...');

      // Convert blob to File
      const croppedFile = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
      
      // Update avatar through mutation
      const result = await updateAvatarMutation.mutateAsync({
        file: croppedFile,
        oldAvatar: avatar,
        userId: session?.user?.id as string
      });

      // Get fresh user data first
      const userResponse = await fetch('/api/user');
      const userData = await userResponse.json();

      // Update session with fresh data
      await update({
        ...session,
        user: {
          ...session?.user,
          avatar: result,
          username: userData.username,
          email: userData.email
        }
      });

      // Update Stream chat with fresh data
      if (session?.user?.id) {
        await fetch('/api/stream/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetUserId: session.user.id,
            name: userData.name || userData.username,
            avatar: result
          }),
        });
      }

      toast.success('Profile picture updated successfully', { id: toastId });
      setTempImageUrl(null);

    } catch (error) {
      console.error('Error updating avatar:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update avatar');
    }
  };

  const handleCropCancel = () => {
    setTempImageUrl(null);
  };

  const handleProfileUpdate = async () => {
    try {
      // Update client-side validation
      if (username.length > 24) {
        toast.error('Username cannot be longer than 24 characters')
        return
      }

      setIsProfileUpdating(true)
      
      const response = await fetch('/api/user', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          username,
          email,
          bio,
          location,
          website,
          avatar
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update profile')
      }

      const updatedUser = await response.json()

      // Update session with fresh data including name
      await update({
        ...session,
        user: {
          ...session?.user,
          name: updatedUser.name,
          username: updatedUser.username,
          email: updatedUser.email,
          avatar: updatedUser.avatar
        }
      })

      // Force session refresh
      await fetch('/api/auth/session')
      
      // Update Stream chat user data
      if (session?.user?.id) {
        await fetch('/api/stream/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetUserId: session.user.id,
            name: updatedUser.name || updatedUser.username,
            avatar: updatedUser.avatar
          }),
        })
      }

      // Invalidate queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user'] }),
        queryClient.invalidateQueries({ queryKey: ['user', updatedUser.username] }),
        queryClient.invalidateQueries({ queryKey: ['posts'] })
      ])

      toast.success('Profile updated successfully')
    } catch (error: any) {
      console.error('Profile update error:', error)
      toast.error(error.message || 'Failed to update profile')
    } finally {
      setIsProfileUpdating(false)
    }
  }

  const handlePasswordUpdate = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields')
      return
    }

    const validation = validatePassword(newPassword)
    if (!validation.isValid) {
      toast.error(validation.missing[0])
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    setIsPasswordUpdating(true)
    try {
      await updatePassword(currentPassword, newPassword)
      toast.success('Password updated successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      console.error('Password update error:', error)
      toast.error('Failed to update password')
    } finally {
      setIsPasswordUpdating(false)
    }
  }

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount()
      toast.success('Account deleted successfully')
    } catch (error) {
      toast.error('Failed to delete account')
      console.error(error)
    }
  }

  // Add this before the return statement
  const isPasswordFormComplete = currentPassword && newPassword && confirmPassword

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
                    <div className="flex flex-col items-center md:items-start md:flex-row gap-8">
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
                      <div className="space-y-4 flex-grow w-full md:w-auto">
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-sm font-medium text-cyan-300 flex items-center gap-2">
                            <User className="w-4 h-4 text-cyan-500" />
                            <span>Display Name</span>
                          </Label>
                          <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={24}
                            className="bg-gray-800/80 border-cyan-500/50 text-cyan-100 focus:border-cyan-400 focus:bg-gray-800 rounded-xl"
                            
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="username" className="text-sm font-medium text-cyan-300 flex items-center gap-2">
                            <User className="w-4 h-4 text-cyan-500" />
                            <span>Username</span>
                          </Label>
                          <Input
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            maxLength={24}
                            className="bg-gray-800/80 border-cyan-500/50 text-cyan-100 focus:border-cyan-400 focus:bg-gray-800 rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-sm font-medium text-cyan-300 flex items-center gap-2">
                            <Mail className="w-4 h-4 text-cyan-500" />
                            <span>Email</span>
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="bg-gray-800/80 border-cyan-500/50 text-cyan-100 focus:border-cyan-400 focus:bg-gray-800 rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bio" className="text-sm font-medium text-cyan-300 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-cyan-500" />
                            <span>Bio</span>
                          </Label>
                          <textarea
                            id="bio"
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            rows={3}
                            className="w-full bg-gray-800/80 border border-cyan-500/50 text-cyan-100 focus:border-cyan-400 focus:bg-gray-800 rounded-xl p-3 resize-none placeholder:text-cyan-400/30 placeholder:font-light focus:outline-none"
                            placeholder="Tell us about yourself..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="location" className="text-sm font-medium text-cyan-300 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-cyan-500" />
                            <span>Location</span>
                          </Label>
                          <Input
                            id="location"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="bg-gray-800/80 border-cyan-500/50 text-cyan-100 focus:border-cyan-400 focus:bg-gray-800 rounded-xl placeholder:text-cyan-400/30 placeholder:font-light"
                            placeholder="Your location"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="website" className="text-sm font-medium text-cyan-300 flex items-center gap-2">
                            <LinkIcon className="w-4 h-4 text-cyan-500" />
                            <span>Website</span>
                          </Label>
                          <Input
                            id="website"
                            type="url"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                            className="bg-gray-800/80 border-cyan-500/50 text-cyan-100 focus:border-cyan-400 focus:bg-gray-800 rounded-xl placeholder:text-cyan-400/30 placeholder:font-light"
                            placeholder="https://your-website.com"
                          />
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
                        <Label htmlFor="current-password" className="text-sm font-medium text-cyan-300 flex items-center gap-2">
                          <Lock className="w-4 h-4 text-cyan-500" />
                          <span>Current Password</span>
                        </Label>
                        <Input
                          id="current-password"
                          placeholder="Enter current password"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="bg-gray-800/80 border-cyan-500/50 text-cyan-100 focus:border-cyan-400 focus:bg-gray-800 rounded-xl placeholder:text-cyan-400/30 placeholder:font-light"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password" className="text-sm font-medium text-cyan-300 flex items-center gap-2">
                          <Lock className="w-4 h-4 text-cyan-500" />
                          <span>New Password</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="new-password"
                            placeholder="Enter new password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            onBlur={() => setPasswordTouched(true)}
                            className={`bg-gray-800/80 border-cyan-500/50 text-cyan-100 focus:border-cyan-400 focus:bg-gray-800 rounded-xl placeholder:text-cyan-400/30 placeholder:font-light ${
                              passwordError && passwordTouched ? 'border-red-500 focus:border-red-500' : ''
                            }`}
                          />
                          {passwordError && passwordTouched && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertCircle className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500" />
                                </TooltipTrigger>
                                <TooltipContent 
                                  className="bg-gray-800/95 text-red-400 border border-red-500/30 px-3 py-2 rounded-lg shadow-lg backdrop-blur-sm"
                                  side="right"
                                  sideOffset={5}
                                >
                                  <p className="text-sm">{passwordError}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        {passwordTouched && passwordRequirements.length > 0 && (
                          <p className="text-xs text-red-400 animate-fadeIn py-2">
                            {passwordRequirements[0]}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password" className="text-sm font-medium text-cyan-300 flex items-center gap-2">
                          <Lock className="w-4 h-4 text-cyan-500" />
                          <span>Confirm New Password</span>
                        </Label>
                        <Input
                          id="confirm-password"
                          placeholder="Confirm new password"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="bg-gray-800/80 border-cyan-500/50 text-cyan-100 focus:border-cyan-400 focus:bg-gray-800 rounded-xl placeholder:text-cyan-400/30 placeholder:font-light"
                        />
                      </div>
                      <p className="text-xs text-cyan-300/70">
                        Password must be minimum 8 characters and include uppercase, lowercase, number, and special character.
                      </p>
                      <Button 
                        className="w-full bg-gradient-to-r from-cyan-700 via-cyan-600 to-cyan-500 hover:from-cyan-600 hover:via-cyan-500 hover:to-cyan-400 text-white font-medium rounded-xl transition-all duration-300 hover:scale-[1.01] hover:shadow-md hover:shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handlePasswordUpdate}
                        disabled={isPasswordUpdating || !isPasswordFormComplete}
                      >
                        {isPasswordUpdating ? "Updating..." : "Change Password"}
                      </Button>
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

      {tempImageUrl && (
        <AvatarCropper
          imageUrl={tempImageUrl}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={1}
        />
      )}
    </div>
  )
}