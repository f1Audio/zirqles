import { NextResponse, NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const token = await getToken({ 
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token'
  })
  
  const { pathname } = req.nextUrl

  // Always allow these paths
  if (
    pathname.includes('/api/') ||
    pathname === '/login' ||
    pathname.includes('/_next/') ||
    pathname.includes('/favicon.ico')
  ) {
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
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
