import { redirect } from 'next/navigation'
import { getSession } from '@/app/actions/auth'
import Navbar from "@/components/Navbar"
import { Toaster } from "@/components/ui/toaster"

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { session, profile, error } = await getSession()

  if (!session || error) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <Navbar user={profile} />
      {children}
      <Toaster />
    </div>
  )
} 