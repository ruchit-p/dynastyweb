"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PenSquare, Book } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { fetchUserStories, type Story } from "@/utils/storyUtils"
import { StoryCard } from "@/components/Story"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface UserData {
  displayName: string;
  photoURL: string;
}

export default function HistoryBookPage() {
  const { user } = useAuth()
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.uid) return;
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data() as UserData);
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
      }
    };

    fetchUserData();
  }, [user?.uid]);

  useEffect(() => {
    let mounted = true

    const loadStories = async () => {
      console.log('Loading stories - User:', user?.uid)
      
      if (!user?.uid) {
        console.log('No user ID found, skipping story fetch')
        setLoading(false)
        return
      }
      
      try {
        setLoading(true)
        setError(null)
        console.log('Fetching stories for user:', user.uid)
        const userStories = await fetchUserStories(user.uid)
        console.log('Fetched stories:', userStories)
        if (mounted) {
          setStories(userStories)
        }
      } catch (err) {
        console.error('Error loading stories:', err)
        if (mounted) {
          setError('Failed to load stories. Please try again later.')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadStories()

    return () => {
      mounted = false
    }
  }, [user?.uid])

  if (!user) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-8">
          <p className="text-gray-600">Please sign in to view your stories.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between my-6 items-center mb-6">
        <h1 className="text-2xl font-bold">History Book</h1>
        <Link href="/create-story">
          <Button>
            <PenSquare className="mr-2 h-4 w-4" />
            Write a Story
          </Button>
        </Link>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A5C36] mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading your stories...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && stories.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <Book className="h-16 w-16 text-gray-400 mb-4" />
          <p className="text-xl text-gray-600 mb-2">Your history book is empty.</p>
          <p className="text-gray-500 mb-6">Start adding stories to preserve your family&apos;s legacy.</p>
          <Link href="/create-story">
            <Button>
              <PenSquare className="mr-2 h-4 w-4" />
              Write Your First Story
            </Button>
          </Link>
        </div>
      )}

      {!loading && !error && stories.length > 0 && (
        <div className="grid gap-6 pb-8">
          {stories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              currentUserId={user.uid}
              authorName={userData?.displayName || user.displayName || undefined}
              authorProfilePic={userData?.photoURL || user.photoURL || undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
} 