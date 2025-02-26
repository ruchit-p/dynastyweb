import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Get data from request
    const { url, options } = await request.json()
    
    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 })
    }
    
    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('process-media', {
      body: { url, options }
    })
    
    if (error) {
      console.error('Error calling process-media function:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Error in process-media API route:', error)
    return NextResponse.json(
      { error: error.message || 'An error occurred processing media' },
      { status: 500 }
    )
  }
} 