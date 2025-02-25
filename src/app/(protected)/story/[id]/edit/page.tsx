"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { X, GripVertical } from "lucide-react"
import { FamilyMemberSelect } from "@/components/FamilyMemberSelect"
import { DatePicker } from "@/components/ui/date-picker"
import { LocationPicker } from "@/components/LocationPicker"
import { supabaseBrowser } from '@/lib/client/supabase-browser'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
  local_id: string;
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
  const [privacy, setPrivacy] = useState<PrivacyLevel>("family")
  const [customAccessMembers, setCustomAccessMembers] = useState<string[]>([])
  const [taggedMembers, setTaggedMembers] = useState<string[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])
  const [showLocationPicker, setShowLocationPicker] = useState(false)

  useEffect(() => {
    const fetchStory = async () => {
      if (!id || !user) return

      try {
        const { data: storyData, error } = await supabaseBrowser
          .from('stories')
          .select('*')
          .eq('id', id)
          .single()

        if (error) throw error

        if (!storyData) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Story not found",
          })
          router.push("/feed")
          return
        }
        
        // Verify ownership
        if (storyData.author_id !== user.id) {
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
        setDate(storyData.event_date ? new Date(storyData.event_date) : new Date())
        setLocation(storyData.location)
        setPrivacy(storyData.privacy)
        setCustomAccessMembers(storyData.custom_access_members || [])
        setTaggedMembers(storyData.people_involved || [])

        // Convert story blocks to form blocks
        const formBlocks = storyData.blocks.map((block: StoryBlock) => ({
          id: block.local_id,
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
              local_id: block.id,
              type: block.type
            }
          }

          // For media blocks, check if the content is a File (new upload) or URL (already uploaded)
          if (block.content instanceof File) {
            try {
              // Upload to Supabase Storage
              const fileExt = block.content.name.split('.').pop()
              const filePath = `${id}/${block.id}.${fileExt}`
              
              const { error: uploadError } = await supabaseBrowser
                .storage
                .from('story-media')
                .upload(filePath, block.content, {
                  upsert: true
                })

              if (uploadError) throw uploadError

              // Get public URL
              const { data: { publicUrl } } = supabaseBrowser
                .storage
                .from('story-media')
                .getPublicUrl(filePath)

              return {
                data: publicUrl,
                local_id: block.id,
                type: block.type
              }
            } catch (error) {
              console.error(`Error uploading ${block.type}:`, error)
              throw error
            }
          }

          return {
            data: block.content as string,
            local_id: block.id,
            type: block.type
          }
        })
      )

      // Update story in Supabase
      const { error: updateError } = await supabaseBrowser
        .from('stories')
        .update({
          title,
          subtitle: subtitle || null,
          event_date: date.toISOString(),
          location,
          privacy,
          custom_access_members: privacy === 'custom' ? customAccessMembers : [],
          people_involved: taggedMembers,
          blocks: processedBlocks,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('author_id', user.id)

      if (updateError) throw updateError

      toast({
        title: "Success",
        description: "Story updated successfully",
      })

      router.push(`/story/${id}`)
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

        <div className="space-y-2">
          <Label>Event Date</Label>
          <DatePicker
            date={date}
            onSelect={handleDateSelect}
          />
        </div>

        <div className="space-y-2">
          <Label>Location</Label>
          <div className="flex items-center gap-2">
            {location ? (
              <div className="flex-1">
                <Input
                  value={location.address}
                  readOnly
                  onClick={() => setShowLocationPicker(true)}
                  className="cursor-pointer"
                />
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowLocationPicker(true)}
              >
                Add Location
              </Button>
            )}
            {location && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setLocation(undefined)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {showLocationPicker && (
            <LocationPicker
              onSelect={handleLocationSelect}
              onClose={() => setShowLocationPicker(false)}
            />
          )}
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
          <p className="text-sm text-gray-500">
            {privacy === "family" && "Your story will be visible to all family members."}
            {privacy === "personal" && "Your story will only be visible to you."}
            {privacy === "custom" && "Your story will only be visible to selected family members."}
          </p>
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
              {block.type === "image" && (
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileSelect(block.id, file)
                    }}
                    className="hidden"
                    id={`image-upload-${block.id}`}
                  />
                  <label
                    htmlFor={`image-upload-${block.id}`}
                    className="cursor-pointer block w-full aspect-video bg-gray-100 rounded-lg flex items-center justify-center"
                  >
                    {typeof block.content === "string" && block.content ? (
                      <img
                        src={block.content}
                        alt="Story image"
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="text-gray-500">Click to upload image</div>
                    )}
                  </label>
                </div>
              )}
              {block.type === "video" && (
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileSelect(block.id, file)
                    }}
                    className="hidden"
                    id={`video-upload-${block.id}`}
                  />
                  <label
                    htmlFor={`video-upload-${block.id}`}
                    className="cursor-pointer block w-full aspect-video bg-gray-100 rounded-lg flex items-center justify-center"
                  >
                    {typeof block.content === "string" && block.content ? (
                      <video
                        src={block.content}
                        controls
                        className="w-full h-full rounded-lg"
                      />
                    ) : (
                      <div className="text-gray-500">Click to upload video</div>
                    )}
                  </label>
                </div>
              )}
              {block.type === "audio" && (
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileSelect(block.id, file)
                    }}
                    className="hidden"
                    id={`audio-upload-${block.id}`}
                  />
                  <label
                    htmlFor={`audio-upload-${block.id}`}
                    className="cursor-pointer block w-full p-4 bg-gray-100 rounded-lg flex items-center justify-center"
                  >
                    {typeof block.content === "string" && block.content ? (
                      <audio src={block.content} controls className="w-full" />
                    ) : (
                      <div className="text-gray-500">Click to upload audio</div>
                    )}
                  </label>
                </div>
              )}
              {block.uploadProgress !== undefined && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-[#0A5C36] h-2.5 rounded-full"
                      style={{ width: `${block.uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
              {block.error && (
                <p className="mt-2 text-sm text-red-600">{block.error}</p>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => addBlock("text")}>
            Add Text
          </Button>
          <Button type="button" variant="outline" onClick={() => addBlock("image")}>
            Add Image
          </Button>
          <Button type="button" variant="outline" onClick={() => addBlock("video")}>
            Add Video
          </Button>
          <Button type="button" variant="outline" onClick={() => addBlock("audio")}>
            Add Audio
          </Button>
        </div>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/story/${id}`)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  )
} 