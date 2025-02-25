import { redirect } from 'next/navigation'
import { createClient } from '@/lib/server/supabase'
import Navbar from "@/components/Navbar"
import { Toaster } from "@/components/ui/toaster"

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Create a Supabase client for server components
  const supabase = await createClient()
  
  // Get the session
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