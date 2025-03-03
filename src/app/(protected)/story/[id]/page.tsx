"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { CalendarIcon, MapPin, Lock, Users, Trash2, Edit } from "lucide-react"
import { format } from "date-fns"
import Image from "next/image"
import { useToast } from "@/components/ui/use-toast"
import AudioPlayer from "@/components/AudioPlayer"
import VideoPlayer from "@/components/VideoPlayer"
import ProtectedRoute from "@/components/ProtectedRoute"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { deleteStory } from "@/utils/functionUtils"

// Helper function to handle both production and emulator image URLs
const getImageUrl = (url: string) => {
  if (!url) return "/placeholder.svg"
  
  // Check if we're using the emulator
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
    // Replace the emulator URL with the production URL pattern
    return url.replace('http://127.0.0.1:9199/v0/b/dynasty-eba63.firebasestorage.app', 'https://firebasestorage.googleapis.com')
  }
  
  return url
}

interface StoryData {
  title: string
  subtitle?: string
  authorID: string
  createdAt: { seconds: number; nanoseconds: number }
  eventDate?: { seconds: number; nanoseconds: number }
  location?: { lat: number; lng: number; address: string }
  privacy: "family" | "privateAccess" | "custom"
  peopleInvolved: string[]
  blocks: {
    type: "text" | "image" | "video" | "audio"
    data: string
    localId: string
  }[]
  coverPhotoUrl?: string
}

export default function StoryDetailsPage() {
  const { id } = useParams()
  const router = useRouter()
  const { currentUser } = useAuth()
  const { toast } = useToast()
  const [story, setStory] = useState<StoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  useEffect(() => {
    const fetchStory = async () => {
      if (!id) return

      try {
        const storyDoc = await getDoc(doc(db, "stories", id as string))
        if (storyDoc.exists()) {
          setStory(storyDoc.data() as StoryData)
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Story not found",
          })
        }
      } catch (error) {
        console.error("Error fetching story:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load story details",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchStory()
  }, [id, toast])

  const handleDelete = async () => {
    if (!story || !id || !currentUser) return;
    
    try {
      setDeleting(true);
      await deleteStory(id as string, currentUser.uid);
      toast({
        title: "Success",
        description: "Story deleted successfully",
      });
      router.push("/feed");
    } catch (error) {
      console.error("Error deleting story:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete story",
      });
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex justify-center items-center h-screen">Loading...</div>
      </ProtectedRoute>
    )
  }

  if (!story) {
    return (
      <ProtectedRoute>
        <div className="flex justify-center items-center h-screen">Story not found</div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="flex justify-between mt-6 items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{story.title}</h1>
            {story.subtitle && <h2 className="text-xl text-gray-600">{story.subtitle}</h2>}
          </div>
          {currentUser?.uid === story.authorID && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setShowDeleteDialog(true)}
                disabled={deleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button 
                variant="outline" 
                className="flex-shrink-0"
                onClick={() => router.push(`/story/${id}/edit`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>

              <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to delete this story?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your story and remove it from the family tree.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={deleting}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {deleting ? "Deleting..." : "Delete Story"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-4 mb-6">
          {story.eventDate && (
            <div className="flex items-center text-gray-600">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(new Date(story.eventDate.seconds * 1000), "PPP")}
            </div>
          )}
          {story.location && (
            <div className="flex items-center text-gray-600">
              <MapPin className="mr-2 h-4 w-4" />
              {story.location.address}
            </div>
          )}
          <div className="flex items-center text-gray-600">
            <Lock className="mr-2 h-4 w-4" />
            {story.privacy === "family" ? "Family" : story.privacy === "privateAccess" ? "Private" : "Custom"}
          </div>
          {story.peopleInvolved.length > 0 && (
            <div className="flex items-center text-gray-600">
              <Users className="mr-2 h-4 w-4" />
              {story.peopleInvolved.length} people tagged
            </div>
          )}
        </div>

        {story.coverPhotoUrl && (
          <div className="mb-6">
            <Image
              src={story.coverPhotoUrl}
              alt={story.title}
              width={1200}
              height={600}
              className="w-full max-h-96 object-cover rounded-lg"
              priority
              unoptimized={process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true'}
            />
          </div>
        )}

        <div className="space-y-6">
          {story.blocks.map((block) => (
            <div key={block.localId} className="border rounded-lg p-4">
              {block.type === "text" && <p className="whitespace-pre-wrap">{block.data}</p>}
              {block.type === "image" && (
                <Image
                  src={getImageUrl(block.data)}
                  alt="Story image"
                  width={600}
                  height={400}
                  className="rounded-lg object-cover w-full"
                  unoptimized={process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true'}
                />
              )}
              {block.type === "video" && <VideoPlayer url={block.data} />}
              {block.type === "audio" && <AudioPlayer url={block.data} />}
            </div>
          ))}
        </div>
      </div>
    </ProtectedRoute>
  )
} 