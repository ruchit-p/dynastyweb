"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { signOut } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Bell, Settings, LogOut, Plus, BookOpen, Users, Home, PenSquare } from "lucide-react"

interface User {
  photoURL: string | null
  displayName: string | null
  email: string | null
}

interface NavbarProps {
  user: User
}

export default function Navbar({ user }: NavbarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false)
  const [profilePicture, setProfilePicture] = useState<string | null>(null)
  const [firstName, setFirstName] = useState<string | null>(null)
  const [lastName, setLastName] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return

      try {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser?.uid || ""))
        if (userDoc.exists()) {
          const data = userDoc.data()
          setProfilePicture(data.profilePicture || null)
          setFirstName(data.firstName || null)
          setLastName(data.lastName || null)
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      }
    }

    void fetchUserData()
  }, [user])

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container flex h-16 items-center px-2 sm:px-4">
        {/* Logo */}
        <Link href="/feed" className="flex items-center gap-2 mr-3 sm:mr-6">
          <Image
            src="/dynasty.png"
            alt="Dynasty Logo"
            width={32}
            height={32}
          />
          <span className="text-xl font-bold text-[#0A5C36] hidden sm:inline-block">Dynasty</span>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-3 sm:gap-6 mr-2 sm:mr-6">
          <Link
            href="/feed"
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#0A5C36]"
          >
            <Home className="h-4 w-4" />
            Feed
          </Link>
          <Link
            href="/family-tree"
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#0A5C36]"
          >
            <Users className="h-4 w-4" />
            Family Tree
          </Link>
          <Link
            href="/history-book"
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#0A5C36]"
          >
            <BookOpen className="h-4 w-4" />
            History Book
          </Link>
        </div>

        {/* Right Side Icons */}
        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          {/* Create Menu Dropdown */}
          <DropdownMenu open={isCreateMenuOpen} onOpenChange={setIsCreateMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600 hover:text-[#0A5C36]">
                <Plus className="h-5 w-5" />
                <span className="sr-only">Create New</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/create-story" className="flex items-center gap-2 cursor-pointer">
                  <PenSquare className="h-4 w-4" />
                  <span>New Story</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600 hover:text-[#0A5C36]">
            <Bell className="h-5 w-5" />
            <span className="sr-only">Notifications</span>
          </Button>

          {/* Profile Dropdown */}
          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full">
                <Image
                  src={profilePicture || "/avatar.svg"}
                  alt="Profile picture"
                  className="rounded-full object-cover"
                  width={32}
                  height={32}
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <div className="flex items-center gap-2 p-2">
                <div className="flex items-center gap-2 rounded-md p-1">
                  <Image
                    src={profilePicture || "/avatar.svg"}
                    alt="Profile picture"
                    className="rounded-full object-cover"
                    width={40}
                    height={40}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {firstName && lastName 
                        ? `${firstName} ${lastName}` 
                        : user.displayName || "User"}
                    </span>
                    <span className="text-xs text-gray-500">{user.email}</span>
                  </div>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/account-settings" className="flex items-center gap-2 cursor-pointer">
                  <Settings className="h-4 w-4" />
                  <span>Account Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center gap-2 text-red-600 focus:text-red-600 cursor-pointer"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  )
} 