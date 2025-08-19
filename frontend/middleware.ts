import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  const protectedRoutes = ['/dashboard', '/setup', '/assessment', '/plan'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  const publicRoutes = ['/login', '/signup', '/'];

  if (isProtectedRoute && !token) {
    // User is not authenticated and trying to access a protected route, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (token && publicRoutes.includes(pathname)) {
    // User is authenticated and trying to access a public route, redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // If the user logs out, the token is removed, so we need to check for that
  if (pathname === '/login' && !token) {
    return NextResponse.next();
  }

  return NextResponse.next();
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
};
