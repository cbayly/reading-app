import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // Define protected routes
  const protectedRoutes = ['/dashboard', '/setup', '/assessment'];

  // Define public routes (for logged-in users to be redirected from)
  const publicRoutes = ['/login', '/signup'];

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isPublicRoute = publicRoutes.includes(pathname);

  if (isProtectedRoute && !token) {
    // User is trying to access a protected route without a token, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isPublicRoute && token) {
    // User is logged in and trying to access login/signup, redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
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