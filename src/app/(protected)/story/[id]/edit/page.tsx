"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/context/AuthContext"
import { uploadMedia } from "@/utils/mediaUtils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Type, Image as ImageIcon, Video, Mic, GripVertical, X } from "lucide-react"
import { format } from "date-fns"
import MediaUpload from "@/components/MediaUpload"
import AudioRecorder from "@/components/AudioRecorder"
import LocationPicker from "@/components/LocationPicker"
import { useToast } from "@/components/ui/use-toast"
import { FamilyMemberSelect } from "@/components/FamilyMemberSelect"
import { updateStory } from "@/utils/functionUtils"

type BlockType = "text" | "image" | "video" | "audio"
type PrivacyLevel = "family" | "personal" | "custom"

interface Block {
  id: string
  type: BlockType
  content: string | File
  uploadProgress?: number
  error?: string
}

interface Location {
  lat: number
  lng: number
  address: string
}

interface StoryBlock {
  localId: string;
  type: BlockType;
  data: string;
}

export default function EditStoryPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState("")
  const [subtitle, setSubtitle] = useState("")
  const [date, setDate] = useState<Date>(new Date())
  const [location, setLocation] = useState<Location | undefined>(undefined)
  const [privacy, setPrivacy] = useState<"family" | "personal" | "custom">("family")
  const [customAccessMembers, setCustomAccessMembers] = useState<string[]>([])
  const [taggedMembers, setTaggedMembers] = useState<string[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])
  const [showLocationPicker, setShowLocationPicker] = useState(false)

  useEffect(() => {
    const fetchStory = async () => {
      if (!id || !user) return

      try {
        const storyDoc = await getDoc(doc(db, "stories", id as string))
        if (!storyDoc.exists()) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Story not found",
          })
          router.push("/feed")
          return
        }

        const storyData = storyDoc.data()
        
        // Verify ownership
        if (storyData.authorID !== user.uid) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "You don't have permission to edit this story",
          })
          router.push("/feed")
          return
        }

        // Set form data
        setTitle(storyData.title)
        setSubtitle(storyData.subtitle || "")
        setDate(storyData.eventDate ? new Date(storyData.eventDate.seconds * 1000) : new Date())
        setLocation(storyData.location)
        setPrivacy(storyData.privacy === "privateAccess" ? "personal" : storyData.privacy)
        setCustomAccessMembers(storyData.customAccessMembers || [])
        setTaggedMembers(storyData.peopleInvolved || [])

        // Convert story blocks to form blocks
        const formBlocks = storyData.blocks.map((block: StoryBlock) => ({
          id: block.localId,
          type: block.type,
          content: block.data
        }))
        setBlocks(formBlocks)
      } catch (error) {
        console.error("Error fetching story:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load story",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchStory()
  }, [id, user, router, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Title is required"
      })
      return
    }

    if (!id || !user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Missing required data"
      })
      return
    }

    try {
      setLoading(true)

      // Process all blocks and upload media if needed
      const processedBlocks = await Promise.all(
        blocks.map(async (block) => {
          if (block.type === 'text') {
            return {
              data: block.content as string,
              localId: block.id,
              type: block.type
            }
          }

          // For media blocks, check if the content is a File (new upload) or URL (already uploaded)
          if (block.content instanceof File) {
            try {
              const url = await uploadMedia(
                block.content,
                id as string,
                block.type,
                {
                  onProgress: (progress) => {
                    setBlocks(currentBlocks =>
                      currentBlocks.map(b =>
                        b.id === block.id
                          ? { ...b, uploadProgress: progress }
                          : b
                      )
                    )
                  },
                  onError: (error) => {
                    setBlocks(currentBlocks =>
                      currentBlocks.map(b =>
                        b.id === block.id
                          ? { ...b, error: error.message }
                          : b
                      )
                    )
                    throw error // Re-throw to handle in the outer catch
                  }
                }
              )
              return {
                data: url,
                localId: block.id,
                type: block.type
              }
            } catch (error) {
              console.error(`Error uploading ${block.type}:`, error)
              throw error
            }
          }

          return {
            data: block.content as string,
            localId: block.id,
            type: block.type
          }
        })
      )

      // Update the story using the Cloud Function
      await updateStory(id as string, user.uid, {
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        eventDate: date,
        location,
        privacy: privacy === "personal" ? "privateAccess" : privacy,
        customAccessMembers: privacy === "custom" ? customAccessMembers : undefined,
        blocks: processedBlocks,
        peopleInvolved: taggedMembers
      });
      
      toast({
        title: "Success",
        description: "Story updated successfully!"
      })
      router.push(`/story/${id}`) // Redirect to story page after successful update
    } catch (error) {
      console.error("Error updating story:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update story. Please try again."
      })
    } finally {
      setLoading(false)
    }
  }

  const addBlock = (type: BlockType) => {
    const newBlock: Block = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content: "",
    }
    setBlocks([...blocks, newBlock])
  }

  const updateBlock = (id: string, content: string | File) => {
    setBlocks(blocks.map(block => 
      block.id === id ? { ...block, content } : block
    ))
  }

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(block => block.id !== id))
  }

  const handleFileSelect = async (id: string, file: File) => {
    updateBlock(id, file)
  }

  const handleAudioRecord = async (id: string, blob: Blob) => {
    const file = new File([blob], `audio_${Date.now()}.wav`, { type: 'audio/wav' })
    updateBlock(id, file)
  }

  const handleLocationSelect = (loc: Location) => {
    setLocation(loc)
    setShowLocationPicker(false)
  }

  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A5C36]"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 my-6">Edit Story</h1>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl mx-auto">
        <div className="space-y-2">
          <Label htmlFor="title">
            Title <span className="text-red-500">*</span>
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter your story title"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="subtitle">Subtitle</Label>
          <Input
            id="subtitle"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Add a subtitle (optional)"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={`w-full justify-start text-left font-normal`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar 
                  mode="single" 
                  selected={date} 
                  onSelect={handleDateSelect}
                  initialFocus 
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Location</Label>
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start text-left font-normal"
                onClick={() => setShowLocationPicker(!showLocationPicker)}
              >
                {location ? (
                  <span className="truncate">{location.address}</span>
                ) : (
                  <span className="text-muted-foreground">Select location</span>
                )}
              </Button>
              {showLocationPicker && (
                <div className="absolute z-10 mt-1 w-[600px] bg-white rounded-lg shadow-lg border p-4">
                  <LocationPicker
                    onLocationSelect={handleLocationSelect}
                    defaultLocation={location}
                    isOpen={showLocationPicker}
                    onClose={() => setShowLocationPicker(false)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="privacy">Privacy</Label>
          <Select 
            value={privacy} 
            onValueChange={(value: PrivacyLevel) => setPrivacy(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select privacy setting" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="family">Family</SelectItem>
              <SelectItem value="personal">Personal</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {privacy === "custom" && (
          <div className="space-y-2">
            <Label>Custom Access</Label>
            <FamilyMemberSelect
              selectedMembers={customAccessMembers}
              onMemberSelect={setCustomAccessMembers}
              placeholder="Select family members who can access this story"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label>Tag People</Label>
          <FamilyMemberSelect
            selectedMembers={taggedMembers}
            onMemberSelect={setTaggedMembers}
            placeholder="Tag family members in this story"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Story Content</h2>
            <div className="flex items-center gap-2 ml-auto">
              <Button type="button" variant="outline" size="sm" onClick={() => addBlock("text")}>
                <Type className="h-4 w-4 mr-2" />
                Add Text
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addBlock("image")}>
                <ImageIcon className="h-4 w-4 mr-2" />
                Add Image
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addBlock("video")}>
                <Video className="h-4 w-4 mr-2" />
                Add Video
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addBlock("audio")}>
                <Mic className="h-4 w-4 mr-2" />
                Add Audio
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {blocks.map((block) => (
              <div key={block.id} className="group relative border rounded-lg p-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeBlock(block.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-move">
                  <GripVertical className="h-4 w-4 text-gray-400" />
                </div>
                {block.type === "text" && (
                  <textarea
                    value={block.content as string}
                    onChange={(e) => updateBlock(block.id, e.target.value)}
                    placeholder="Start writing..."
                    className="w-full min-h-[100px] p-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-[#0A5C36] focus:border-transparent"
                  />
                )}
                {(block.type === "image" || block.type === "video" || block.type === "audio") && (
                  <div className="space-y-2">
                    <MediaUpload
                      type={block.type}
                      onFileSelect={(file) => handleFileSelect(block.id, file)}
                      value={block.content instanceof File ? '' : block.content as string}
                      onRemove={() => updateBlock(block.id, "")}
                    />
                    {block.uploadProgress !== undefined && block.uploadProgress < 100 && (
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-[#0A5C36] h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${block.uploadProgress}%` }}
                        />
                      </div>
                    )}
                    {block.error && (
                      <div className="text-sm text-red-500 mt-1">
                        {block.error}
                      </div>
                    )}
                    {block.type === "audio" && (
                      <>
                        <div className="text-sm text-gray-500 text-center">or</div>
                        <AudioRecorder
                          onRecordingComplete={(blob) => handleAudioRecord(block.id, blob)}
                        />
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit">
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  )
} 