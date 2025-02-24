import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/lib/shared/types/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const next = requestUrl.searchParams.get('next') || '/family-tree'

    if (!code) {
      throw new Error('No code provided')
    }

    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Exchange the code for a session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) throw exchangeError

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) throw userError
    if (!user) throw new Error("User not found")

    // If the user's email is confirmed, update their profile
    if (user.email_confirmed_at) {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          is_pending_signup: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) throw updateError
    }

    // Redirect to the appropriate page
    return NextResponse.redirect(new URL(next, requestUrl.origin))
  } catch (error) {
    console.error('Auth callback error:', error)
    // Redirect to error page or login with error message
    return NextResponse.redirect(new URL('/login?error=auth_callback_failed', request.url))
  }
} 