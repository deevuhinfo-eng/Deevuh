import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * DEEVUH Route Protection Proxy
 * 
 * Protects /admin/* and /dashboard routes by checking for the
 * access token cookie. Unauthenticated users are redirected to /login.
 * 
 * Note: This is a first-line defense. The backend ALSO validates
 * JWT tokens on every API request (defense in depth).
 */

const PROTECTED_ADMIN_ROUTES = ['/admin'];
const PROTECTED_USER_ROUTES = ['/dashboard'];

// Next.js 16 requires the proxy function to be named "proxy" (not "middleware")
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if the request is for a protected admin route
  const isAdminRoute = PROTECTED_ADMIN_ROUTES.some(route => 
    pathname.startsWith(route)
  );
  
  // Check if the request is for a protected user route
  const isUserRoute = PROTECTED_USER_ROUTES.some(route => 
    pathname.startsWith(route)
  );
  
  if (!isAdminRoute && !isUserRoute) {
    return NextResponse.next();
  }
  
  // Check for the access token cookie set by the backend
  const accessToken = request.cookies.get('deevuh_token')?.value;
  
  if (!accessToken) {
    // No token — redirect to login with return URL
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Token exists — allow through.
  // The admin panel itself will also verify the ADMIN role via API call.
  // The backend validates the token on every API request.
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
  ],
};
