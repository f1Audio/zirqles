import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import dbConnect from "@/lib/mongodb"
import { User } from '@/models/User'
import bcrypt from 'bcryptjs'
import type { DefaultSession, DefaultUser } from 'next-auth'
import type { JWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      username: string
      name: string
      email: string
      image?: string | null
      avatar?: string | null
    } & Omit<DefaultSession['user'], 'email' | 'image'>
  }
  
  interface User extends DefaultUser {
    username: string
    avatar?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    username: string
    email: string
    avatar?: string
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        await dbConnect()
        const user = await User.findOne({ email: credentials.email })
        if (!user) return null

        const isPasswordCorrect = await bcrypt.compare(credentials.password, user.password)
        if (!isPasswordCorrect) return null

        return { 
          id: user._id.toString(), 
          email: user.email, 
          username: user.username,
          avatar: user.avatar,
          image: user.avatar
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: '/login',
    error: '/login',
    signOut: '/',
  },
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      if (trigger === 'update' && session?.user) {
        return {
          ...token,
          username: session.user.username,
          email: session.user.email,
          image: session.user.avatar || session.user.image,
          avatar: session.user.avatar,
          id: session.user.id
        }
      }
      
      if (user) {
        return {
          ...token,
          id: user.id,
          username: user.username,
          email: user.email,
          image: user.avatar || user.image,
          avatar: user.avatar
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id
        session.user.username = token.username
        session.user.email = token.email
        session.user.image = token.image as string | null
        session.user.avatar = token.avatar as string | null
      }
      return session
    },
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        try {
          await dbConnect()
          
          // Check if user exists
          let existingUser = await User.findOne({ email: user.email })
          
          if (!existingUser) {
            // Generate username from email
            let baseUsername = user.email?.split('@')[0] || ''
            let finalUsername = baseUsername
            let counter = 1
            
            // Ensure unique username
            while (await User.findOne({ username: finalUsername })) {
              finalUsername = `${baseUsername}${counter}`
              counter++
            }
            
            // Create new user
            existingUser = await User.create({
              email: user.email,
              username: finalUsername,
              avatar: user.image || undefined,
              password: await bcrypt.hash(Math.random().toString(36), 10),
            })
          }
          
          // Update user object with database values
          user.id = existingUser._id.toString()
          user.username = existingUser.username
          user.avatar = existingUser.avatar || user.image || undefined
        } catch (error) {
          console.error('Google sign in error:', error)
          return false
        }
      }
      return true
    },
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET,
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
} 