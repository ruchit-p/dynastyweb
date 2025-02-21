"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { fetchAccessibleStories, type Story } from "@/utils/storyUtils"
import { Button } from "@/components/ui/button"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { PenSquare, BookOpen } from "lucide-react"
import { StoryCard } from "@/components/Story"

interface StoryWithAuthor extends Story {
  authorName?: string;
  authorProfilePic?: string;
}

export default function FeedPage() {
  const { user } = useAuth()
  const [stories, setStories] = useState<StoryWithAuthor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const loadStories = async () => {
      if (!user?.uid) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // First, get the user's family tree ID
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (!userDoc.exists()) {
          setError("User document not found. Please try logging in again.")
          setStories([])
          setLoading(false)
          return
        }

        const userData = userDoc.data()
        const familyTreeId = userData.familyTreeId
        
        if (!familyTreeId) {
          setError("No family tree found. Please make sure you're part of a family tree.")
          setStories([])
          setLoading(false)
          return
        }

        // Fetch all accessible stories
        const accessibleStories = await fetchAccessibleStories(user.uid, familyTreeId)
        
        // Fetch author information for each story
        const storiesWithAuthors = await Promise.all(
          accessibleStories.map(async (story) => {
            try {
              const authorDoc = await getDoc(doc(db, "users", story.authorID))
              if (authorDoc.exists()) {
                const authorData = authorDoc.data()
                return {
                  ...story,
                  authorName: authorData.displayName || `${authorData.firstName} ${authorData.lastName}`.trim(),
                  authorProfilePic: authorData.profilePicture
                }
              }
              return {
                ...story,
                authorName: 'Anonymous'
              }
            } catch (error) {
              console.error(`Error fetching author ${story.authorID}:`, error)
              return {
                ...story,
                authorName: 'Anonymous'
              }
            }
          })
        )

        if (mounted) {
          setStories(storiesWithAuthors)
        }
      } catch (err) {
        console.error('Error loading stories:', err)
        if (mounted) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load stories. Please try again later.'
          setError(`Error: ${errorMessage}`)
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
      <div className="min-h-screen bg-gray-50">
        <main className="container py-6">
          <div className="text-center py-8">
            <p className="text-gray-600">Please sign in to view stories.</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container  py-6">
        <div className="flex justify-between my-6 items-center mb-6">
          <h1 className="text-2xl font-bold">Feed</h1>
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A5C36] mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading stories...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && stories.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <BookOpen className="h-16 w-16 text-gray-400 mb-4" />
            <p className="text-xl text-gray-600 mb-2">No stories to display yet</p>
            <p className="text-gray-500 mb-6">Be the first to share a story with your family!</p>
            <Link href="/create-story">
              <Button>
                <PenSquare className="mr-2 h-4 w-4" />
                Share Your First Story
              </Button>
            </Link>
          </div>
        )}

        {!loading && !error && stories.length > 0 && (
          <div className="grid gap-6 my-6">
            {stories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                currentUserId={user.uid}
                authorName={story.authorName}
                authorProfilePic={story.authorProfilePic}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
} 