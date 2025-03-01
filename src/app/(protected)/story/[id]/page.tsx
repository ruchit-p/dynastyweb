"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth, AuthGuard } from "@/components/auth"
import { Button } from "@/components/ui/button"
import { CalendarIcon, MapPin, Lock, Users, Trash2, Edit } from "lucide-react"
import { format } from "date-fns"
import Image from "next/image"
import { useToast } from "@/components/ui/use-toast"
import AudioPlayer from "@/components/AudioPlayer"
import VideoPlayer from "@/components/VideoPlayer"
import { api } from '@/lib/api-client'
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

// Helper function to handle both production and emulator image URLs
const getImageUrl = (url: string) => {
  if (!url) return "/placeholder.svg"
  return url
}

interface StoryData {
  id: string
  title: string
  subtitle?: string
  author_id: string
  created_at: string
  event_date?: string
  location?: { lat: number; lng: number; address: string }
  privacy: "family" | "personal" | "custom"
  people_involved: string[]
  blocks: {
    type: "text" | "image" | "video" | "audio"
    data: string
    local_id: string
  }[]
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
  const [error, setError] = useState<string | null>(null)

  // Function to fetch story data
  const fetchStory = async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)
      
      // Call to the stories Edge Function instead of direct Supabase query
      const response = await api.stories.getStory(id as string)
      
      if (response.error) throw new Error(response.error.message)

      if (response.data) {
        setStory(response.data as StoryData)
      } else {
        setError("Story not found")
        toast({
          variant: "destructive",
          title: "Error",
          description: "Story not found",
        })
      }
    } catch (error) {
      console.error("Error fetching story:", error)
      setError((error as Error).message || "Failed to load story details")
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load story details",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStory()
  }, [id, toast])

  const handleDelete = async () => {
    if (!story || !id || !currentUser) return;
    
    try {
      setDeleting(true);
      
      // Call to the stories Edge Function to delete the story
      const response = await api.stories.deleteStory(id as string)
      
      if (response.error) throw new Error(response.error.message)

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
      <AuthGuard>
        <div className="flex justify-center items-center h-screen">Loading...</div>
      </AuthGuard>
    )
  }

  if (!story) {
    return (
      <AuthGuard>
        <div className="flex justify-center items-center h-screen">Story not found</div>
      </AuthGuard>
    )
  }

  return (
    <>
      <AuthGuard>
        <div className="container mx-auto p-4 max-w-4xl">
          <div className="flex justify-between mt-6 items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{story.title}</h1>
              {story.subtitle && <h2 className="text-xl text-gray-600">{story.subtitle}</h2>}
            </div>
            {currentUser?.id === story.author_id && (
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
            {story.event_date && (
              <div className="flex items-center text-gray-600">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(new Date(story.event_date), "PPP")}
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
              {story.privacy === "family" ? "Family" : story.privacy === "personal" ? "Private" : "Custom"}
            </div>
            {story.people_involved.length > 0 && (
              <div className="flex items-center text-gray-600">
                <Users className="mr-2 h-4 w-4" />
                {story.people_involved.length} people tagged
              </div>
            )}
          </div>

          <div className="space-y-6">
            {story.blocks.map((block) => (
              <div key={block.local_id} className="border rounded-lg p-4">
                {block.type === "text" && <p className="whitespace-pre-wrap">{block.data}</p>}
                {block.type === "image" && (
                  <Image
                    src={getImageUrl(block.data)}
                    alt="Story image"
                    width={600}
                    height={400}
                    className="rounded-lg object-cover w-full"
                  />
                )}
                {block.type === "video" && <VideoPlayer url={block.data} />}
                {block.type === "audio" && <AudioPlayer url={block.data} />}
              </div>
            ))}
          </div>
        </div>
      </AuthGuard>
    </>
  )
} 