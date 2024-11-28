import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import dbConnect from "@/lib/mongodb"
import { User } from '@/models/User'
import bcrypt from 'bcryptjs'
import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface User {
    username?: string
    avatar?: string
  }
  interface Session {
    user: {
      id?: string
      username?: string
      avatar?: string
    } & DefaultSession['user']
  }
}

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(dbConnect as any),
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
  },
  callbacks: {
    async jwt({ token, user, account, profile, trigger, session }) {
      if (trigger === 'update' && session?.user) {
        return { 
          ...token, 
          username: session.user.username,
          image: session.user.avatar || session.user.image
        }
      } else if (user) {
        return { 
          ...token,
          id: user.id,
          username: user.username,
          image: user.avatar || user.image
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id as string
        session.user.username = token.username as string
        session.user.image = token.image as string
      }
      return session
    },
  },
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