import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: any }[]) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith('/admin/proctoring') || pathname.startsWith('/admin/audit-logs')) {
    return NextResponse.redirect(new URL('/admin/tampering-logs', request.url));
  }
  const requiredRole = pathname.startsWith('/admin') ? 'admin' : pathname.startsWith('/faculty') ? 'faculty' : 'student';

  if (!user) return NextResponse.redirect(new URL('/login', request.url));

  const { data: profile } = await supabase.from('profiles').select('role, is_verified').eq('id', user.id).single();
  if (!profile || profile.role !== requiredRole || (requiredRole !== 'admin' && profile.is_verified !== true)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/student/:path*', '/faculty/:path*', '/admin/:path*'],
};
