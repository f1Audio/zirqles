import { NextResponse, NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const token = await getToken({ 
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })
  
  const { pathname } = req.nextUrl

  // Always allow these paths
  if (
    pathname.includes('/api/auth') ||
    pathname.startsWith('/login') ||
    pathname.includes('/_next/') ||
    pathname.includes('/favicon.ico') ||
    pathname.includes('/images/') ||
    pathname.includes('/fonts/')
  ) {
    // If user is logged in and trying to access login page, redirect to home
    if (token && pathname.startsWith('/login')) {
      return NextResponse.redirect(new URL('/', req.url))
    }
    return NextResponse.next()
  }

  // If there's no token and we're not on an allowed path, redirect to login
  if (!token) {
    const loginUrl = new URL('/login', req.url)
    // Preserve the original URL as a callback
    loginUrl.searchParams.set('callbackUrl', encodeURIComponent(pathname))
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /api/auth/* (authentication routes)
     * 2. /_next/* (Next.js internals)
     * 3. /fonts/* (static font files)
     * 4. /images/* (static image files)
     * 5. /favicon.ico (favicon file)
     */
    '/((?!api/auth|_next|fonts|images|favicon.ico).*)',
  ],
}
