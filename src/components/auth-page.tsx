'use client'

import { useState, useEffect, useContext } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Loader2, AlertCircle, User, Mail, Lock } from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import { toast } from 'sonner'
import { validatePassword } from '@/lib/utils'

const Icons = {
  spinner: Loader2,
  google: (props: LucideProps) => (
    <svg viewBox="0 0 24 24" {...props}>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
      <path d="M1 1h22v22H1z" fill="none" />
    </svg>
  ),
  user: User,
  mail: Mail,
  lock: Lock,
}

export function AuthPageComponent() {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [username, setUsername] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [confirmPassword, setConfirmPassword] = useState<string>('')
  const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [passwordRequirements, setPasswordRequirements] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState('login')
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (password && passwordTouched) {
      const validation = validatePassword(password)
      setPasswordRequirements(validation.missing)
      setPasswordError(validation.missing.length > 0 ? validation.missing[0] : null)
    } else {
      setPasswordRequirements([])
      setPasswordError(null)
    }

    if (password && confirmPassword) {
      setPasswordsMatch(password === confirmPassword)
    } else {
      setPasswordsMatch(null)
    }
  }, [password, confirmPassword, passwordTouched])

  async function onSubmit(event: React.SyntheticEvent, mode: 'login' | 'register') {
    event.preventDefault()
    
    if (mode === 'register') {
      const validation = validatePassword(password)
      if (!validation.isValid) {
        toast.error(validation.missing.join('\n'))
        return
      }
    }

    setIsLoading(true)

    try {
      if (mode === 'login') {
        const result = await signIn('credentials', {
          redirect: false,
          username,
          password,
        })

        if (result?.error) {
          console.error(result.error)
          toast.error('Login failed. Please check your credentials.')
        } else {
          const urlParams = new URLSearchParams(window.location.search)
          const callbackUrl = urlParams.get('callbackUrl') || '/'
          
          // Force a session update
          await fetch('/api/auth/session')
          
          // Wait for session to be updated
          await new Promise(resolve => setTimeout(resolve, 500))
          
          // Use window.location for a full page navigation
          window.location.href = decodeURIComponent(callbackUrl)
        }
      } else {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password }),
        })

        if (response.ok) {
          // Automatically sign in after successful registration
          const result = await signIn('credentials', {
            redirect: false,
            email,
            password,
          })

          if (!result?.error) {
            // Wait for session to be updated
            await fetch('/api/auth/session')
            
            // Wait a bit for the session to be fully established
            await new Promise(resolve => setTimeout(resolve, 500))
            
            // Use window.location for a full page navigation
            window.location.href = '/'
          } else {
            console.error(result.error)
            toast.error('Auto-login failed after registration')
          }
        } else {
          const data = await response.json()
          console.error(data.message)
          toast.error(data.message || 'Registration failed.')
        }
      }
    } catch (error) {
      console.error('Auth error:', error)
      toast.error('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const getInputStyle = (isPassword: boolean) => {
    if (!isPassword || passwordsMatch === null) return ''
    return passwordsMatch ? 'border-green-500 focus:border-green-500' : 'border-red-500 focus:border-red-500'
  }

  const handleGoogleSignIn = () => {
    signIn('google', { 
      callbackUrl: '/',
      redirect: true,
    })
  }

  return (
    <div className="flex items-center justify-center min-h-screen w-full bg-gray-900">
      <div className="container px-4 py-8 mx-auto">
        <Card className="w-full max-w-md mx-auto bg-gray-900/50 backdrop-blur-md border border-cyan-500/30 shadow-lg shadow-cyan-500/20 rounded-2xl">
          <CardHeader className="space-y-1 p-6 sm:p-8">
            <CardTitle className="text-2xl sm:text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">
              Welcome to Zirqles
            </CardTitle>
            <CardDescription className="text-center text-sm sm:text-base text-cyan-300/70">
              Connect with the digital underground
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 sm:p-8">
            <Tabs defaultValue="login" className="space-y-4" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 bg-gray-800/50 border border-cyan-500/30 rounded-2xl p-1 h-12">
                <TabsTrigger 
                  value="login" 
                  className="rounded-xl data-[state=active]:bg-cyan-900/50 data-[state=active]:text-cyan-300 data-[state=active]:rounded-xl text-cyan-400 transition-all duration-200 flex items-center justify-center"
                >
                  Login
                </TabsTrigger>
                <TabsTrigger 
                  value="register"
                  className="rounded-xl data-[state=active]:bg-cyan-900/50 data-[state=active]:text-cyan-300 data-[state=active]:rounded-xl text-cyan-400 transition-all duration-200  flex items-center justify-center"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <form onSubmit={(e) => onSubmit(e, 'login')}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username" className="flex items-center space-x-2 text-cyan-300">
                        <Icons.user className="w-4 h-4" />
                        <span>Username</span>
                      </Label>
                      <Input 
                        id="username" 
                        placeholder="Username" 
                        required 
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="bg-gray-800/50 border-cyan-500/30 text-cyan-100 placeholder:text-cyan-300/50 focus:border-cyan-400 focus:ring-cyan-400/30 rounded-xl h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="flex items-center space-x-2 text-cyan-300">
                        <Icons.lock className="w-4 h-4" />
                        <span>Password</span>
                      </Label>
                      <div className="relative">
                        <Input 
                          id="password" 
                          placeholder="Password"
                          required 
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onBlur={() => setPasswordTouched(true)}
                          className={`bg-gray-800/50 border-cyan-500/30 text-cyan-100 placeholder:text-cyan-300/50 focus:ring-cyan-400/30 ${
                            passwordError && activeTab === 'register' ? 'border-red-500 focus:border-red-500' : ''
                          } rounded-xl h-11`}
                        />
                      </div>
                      {activeTab === 'register' && passwordTouched && passwordRequirements.length > 0 && (
                        <p className="text-xs text-red-400 animate-fadeIn py-2">
                          {passwordRequirements[0]}
                        </p>
                      )}
                    </div>
                    <Button 
                      className="w-full bg-gradient-to-r from-cyan-700 via-cyan-600 to-cyan-500 hover:from-cyan-600 hover:via-cyan-500 hover:to-cyan-400 text-white border-0 rounded-xl h-11 transition-all duration-300" 
                      type="submit"
                    >
                      {isLoading && (
                        <Icons.spinner className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      Login
                    </Button>
                  </div>
                </form>
              </TabsContent>
              <TabsContent value="register">
                <form onSubmit={(e) => onSubmit(e, 'register')}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username" className="flex items-center space-x-2 text-cyan-300">
                        <Icons.user className="w-4 h-4" />
                        <span>Username</span>
                      </Label>
                      <Input 
                        id="username" 
                        placeholder="Username" 
                        required 
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="bg-gray-800/50 border-cyan-500/30 text-cyan-100 placeholder:text-cyan-300/50 focus:border-cyan-400 focus:ring-cyan-400/30 rounded-xl h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center space-x-2 text-cyan-300">
                        <Icons.mail className="w-4 h-4" />
                        <span>Email</span>
                      </Label>
                      <Input 
                        id="email" 
                        placeholder="email@example.com" 
                        required 
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-gray-800/50 border-cyan-500/30 text-cyan-100 placeholder:text-cyan-300/50 focus:border-cyan-400 focus:ring-cyan-400/30 rounded-xl h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="flex items-center space-x-2 text-cyan-300">
                        <Icons.lock className="w-4 h-4" />
                        <span>Password</span>
                      </Label>
                      <div className="relative">
                        <Input 
                          id="password" 
                          placeholder="Password"
                          required 
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onBlur={() => setPasswordTouched(true)}
                          className={`bg-gray-800/50 border-cyan-500/30 text-cyan-100 placeholder:text-cyan-300/50 focus:ring-cyan-400/30 ${
                            passwordError && activeTab === 'register' ? 'border-red-500 focus:border-red-500' : ''
                          } rounded-xl h-11`}
                        />
                      </div>
                      {activeTab === 'register' && passwordTouched && passwordRequirements.length > 0 && (
                        <p className="text-xs text-red-400 animate-fadeIn py-2">
                          {passwordRequirements[0]}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password" className="flex items-center space-x-2 text-cyan-300">
                        <Icons.lock className="w-4 h-4" />
                        <span>Confirm Password</span>
                      </Label>
                      <div className="relative">
                        <Input 
                          id="confirm-password" 
                          placeholder="Password"
                          required 
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className={`bg-gray-800/50 border-cyan-500/30 text-cyan-100 placeholder:text-cyan-300/50 focus:ring-cyan-400/30 ${getInputStyle(true)} rounded-xl h-11`}
                        />
                      </div>
                    </div>
                    <Button 
                      className="w-full bg-gradient-to-r from-cyan-700 via-cyan-600 to-cyan-500 hover:from-cyan-600 hover:via-cyan-500 hover:to-cyan-400 text-white border-0 rounded-xl h-11 transition-all duration-300" 
                      type="submit" 
                      disabled={!passwordsMatch}
                    >
                      {isLoading && (
                        <Icons.spinner className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      Create Account
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-cyan-500/30" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="px-4 bg-gray-900 text-cyan-300/70 rounded-full">Or continue with</span>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="w-full border-cyan-500/30 text-cyan-300 hover:text-cyan-200 hover:bg-cyan-900/50 hover:border-cyan-400 rounded-xl h-11 transition-all duration-300" 
              onClick={handleGoogleSignIn}
            >
              <Icons.google className="w-4 h-4 mr-2" />
              Google
            </Button>
          </CardContent>
          <CardFooter className="flex justify-center p-6 sm:p-8">
            <p className="px-4 sm:px-8 text-xs sm:text-sm text-center text-cyan-300/70">
              By clicking continue, you agree to our{" "}
              <a href="/terms" className="text-cyan-400 hover:text-cyan-300 underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/privacy" className="text-cyan-400 hover:text-cyan-300 underline">
                Privacy Policy
              </a>
              .
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
