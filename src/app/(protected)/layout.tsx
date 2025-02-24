import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/shared/types/supabase'
import Navbar from "@/components/Navbar"
import { Toaster } from "@/components/ui/toaster"

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = cookies()
  const supabase = createServerComponentClient<Database, 'public'>({ 
    cookies: () => cookieStore 
  })
  
  const { data: { session }, error } = await supabase.auth.getSession()

  if (!session || error) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <Navbar user={profile} />
      {children}
      <Toaster />
    </div>
  )
} 