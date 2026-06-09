import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do NOT use supabase.auth.getSession() here.
  // getUser() sends a request to the Supabase auth server every time
  // to revalidate the Auth token, while getSession() reads from
  // local storage which can be tampered with.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Pages that don't require authentication
  const isAuthPage =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/signup') ||
    request.nextUrl.pathname.startsWith('/verify') ||
    request.nextUrl.pathname.startsWith('/forgot-password')

  const isCallbackPage = request.nextUrl.pathname.startsWith('/auth/callback')
  const isPublicApi =
    request.nextUrl.pathname.startsWith('/api/auth/verify-email') ||
    request.nextUrl.pathname.startsWith('/api/auth/allowed-universities') ||
    request.nextUrl.pathname.startsWith('/api/universities/apply')

  // Redirect unauthenticated users to login (except auth pages, callback page, public APIs & landing)
  if (!user && !isAuthPage && !isCallbackPage && !isPublicApi && request.nextUrl.pathname !== '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages (except callback page)
  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
