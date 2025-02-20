"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { fetchAccessibleStories, type Story } from "@/utils/storyUtils"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { PenSquare, BookOpen } from "lucide-react"

export default function FeedPage() {
  const { user } = useAuth()
  const [stories, setStories] = useState<Story[]>([])
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
          setStories([])
          setLoading(false)
          return
        }

        const familyTreeId = userDoc.data().familyTreeID
        if (!familyTreeId) {
          setStories([])
          setLoading(false)
          return
        }

        // Fetch all accessible stories
        const accessibleStories = await fetchAccessibleStories(user.uid, familyTreeId)
        if (mounted) {
          setStories(accessibleStories)
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
      <main className="container py-6">
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
              <div key={story.id} className="p-6 bg-white rounded-lg shadow-sm border">
                <div className="flex items-center gap-4 mb-4">
                  <Image
                    src="/placeholder.svg?height=40&width=40"
                    alt="User avatar"
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                  <div>
                    <h3 className="font-medium">{story.title}</h3>
                    <p className="text-sm text-gray-500">
                      {format(story.createdAt.toDate(), 'MMMM d, yyyy')}
                    </p>
                  </div>
                </div>

                {story.subtitle && (
                  <p className="text-gray-600 mb-2">{story.subtitle}</p>
                )}

                {story.blocks.length > 0 && story.blocks[0].type === 'text' && (
                  <p className="text-gray-600 mb-4">
                    {story.blocks[0].data.length > 200 
                      ? `${story.blocks[0].data.substring(0, 200)}...` 
                      : story.blocks[0].data}
                  </p>
                )}

                {story.blocks.length > 0 && story.blocks[0].type === 'image' && (
                  <div className="mb-4">
                    <Image
                      src={story.blocks[0].data}
                      alt="Story image"
                      width={600}
                      height={400}
                      className="rounded-lg object-cover"
                    />
                  </div>
                )}

                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    {story.location && (
                      <span className="text-sm text-gray-500">
                        📍 {story.location.address}
                      </span>
                    )}
                  </div>
                  <Link href={`/story/${story.id}`}>
                    <Button variant="link" className="text-[#0A5C36]">
                      Read More
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
} 