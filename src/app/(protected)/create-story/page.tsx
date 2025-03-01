"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth"
import { api } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Type, Image as ImageIcon, Video, Mic, GripVertical, X, Plus } from "lucide-react"
import { format } from "date-fns"
import MediaUpload from "@/components/MediaUpload"
import AudioRecorder from "@/components/AudioRecorder"
import LocationPicker from "@/components/LocationPicker"
import { useToast } from "@/components/ui/use-toast"
import { FamilyMemberSelect } from "@/components/FamilyMemberSelect"

type BlockType = "text" | "image" | "video" | "audio"

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

interface FamilyMember {
  id: string
  name: string
  relationship: string
}

export default function CreateStoryPage() {
  const router = useRouter()
  const { currentUser } = useAuth()
  const { toast } = useToast()
  const [blocks, setBlocks] = useState<Block[]>([{ id: 'initial-block', type: 'text', content: '' }])
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [location, setLocation] = useState<Location | undefined>(undefined)
  const [privacy, setPrivacy] = useState<"family" | "personal" | "custom">("family")
  const [taggedMembers, setTaggedMembers] = useState<string[]>([])
  const [customAccessMembers, setCustomAccessMembers] = useState<string[]>([])
  const [familyMembers, setFamilyMembers] = useState<{id: string, name: string}[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [userLocation, setUserLocation] = useState<Location | null>(null)

  // Request location permission on page load
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          // Successfully got permission and location
          console.log("Location permission granted");
          try {
            // Reverse geocode to get the address
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`
            );
            const data = await response.json();
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              address: data.display_name
            });
          } catch (error) {
            console.error("Error getting location address:", error);
          }
        },
        (error) => {
          console.log("Location permission denied or error:", error);
        }
      );
    }
  }, []);

  useEffect(() => {
    const fetchFamilyMembers = async () => {
      // Check for family tree ID in the user object
      if (!currentUser || !currentUser.id) return;
      
      try {
        setIsLoadingMembers(true)
        setErrorMessage(null)
        
        // Get the user's family tree information
        const userResponse = await api.auth.getUser()
        
        if (userResponse.error) {
          throw new Error(userResponse.error.message || "Failed to get user data")
        }
        
        const familyTreeId = userResponse.data?.family_tree_id
        
        if (!familyTreeId) {
          return // No family tree associated with the user
        }
        
        // Call to the familyTree Edge Function to get family members
        const response = await api.familyTree.getFamilyTree(familyTreeId)
        
        if (response.error) {
          throw new Error(response.error.message || "Failed to get family tree data")
        }
        
        if (response.data && response.data.familyTree) {
          // Extract members from the response based on the actual structure
          const members = response.data.familyTree.members || []
          setFamilyMembers(members)
        }
      } catch (error) {
        console.error("Error fetching family members:", error)
        setErrorMessage("Failed to load family members")
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load family members. Some features may be limited."
        })
      } finally {
        setIsLoadingMembers(false)
      }
    }
    
    fetchFamilyMembers()
  }, [currentUser, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a title for your story"
      })
      return
    }

    // Get user's family tree ID using the API instead of direct Supabase query
    const userResponse = await api.auth.getUser()
    
    if (userResponse.error || !userResponse.data?.family_tree_id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You need to be part of a family tree to create stories"
      })
      router.push("/family-tree")
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMessage(null)

      // First, create a temporary story ID for media uploads
      const storyId = Math.random().toString(36).substr(2, 9)

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
              // Define the bucket based on media type
              const bucket = 'stories'
              
              // Upload with progress tracking
              let result;
              
              // Apply compression based on media type using WhatsApp-style settings
              const operations: Array<{
                type: 'resize' | 'compress' | 'convert';
                params: Record<string, unknown>;
              }> = [];
              
              if (block.type === 'image') {
                operations.push({
                  type: 'resize',
                  params: { width: 1600, height: 1600, fit: 'cover' }
                });
                
                operations.push({
                  type: 'compress',
                  params: { quality: 75, format: 'webp' }
                });
              }
              
              // Set up progress tracking callback
              const updateProgress = (progress: number) => {
                setBlocks(currentBlocks =>
                  currentBlocks.map(b =>
                    b.id === block.id
                      ? { ...b, uploadProgress: progress }
                      : b
                  )
                );
              };
              
              // Start with 10% to show activity
              updateProgress(10);
              
              if (operations.length > 0) {
                // Use the Edge Function media API for processing
                result = await api.media.uploadAndProcess(block.content, {
                  bucket,
                  path: `${storyId}/`,
                  operations
                });
              } else {
                // Use the Edge Function storage API for regular uploads
                result = await api.storage.uploadFile(block.content, {
                  bucket,
                  path: `${storyId}/`
                });
              }
              
              // Complete progress
              updateProgress(100);
              
              if (result.error || !result.data) {
                throw new Error(result.error?.message || 'Failed to upload media');
              }
              
              // Handle the URL from the API response
              const url = result.data.url;
              
              return {
                data: url,
                localId: block.id,
                type: block.type
              }
            } catch (error) {
              console.error(`Error uploading ${block.type}:`, error)
              setBlocks(currentBlocks =>
                currentBlocks.map(b =>
                  b.id === block.id
                    ? { ...b, error: (error as Error).message }
                    : b
                )
              )
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

      // Create the story using the Edge Function API
      const storyData = {
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        event_date: date ? date.toISOString() : null,
        location: location || null,
        privacy: privacy,
        custom_access_members: privacy === 'custom' && customAccessMembers.length > 0 
          ? customAccessMembers 
          : null,
        familyTreeId: userResponse.data?.family_tree_id || '',
        people_involved: taggedMembers.length > 0 ? taggedMembers : null,
        blocks: processedBlocks
      };
      
      // Call the Edge Function API
      const result = await api.stories.createStory(storyData);
      
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      toast({
        title: "Success",
        description: "Story created successfully!"
      })
      router.push("/feed") // Redirect to feed page after successful creation
    } catch (error) {
      console.error("Error creating story:", error)
      setErrorMessage((error as Error).message || "Failed to create story")
      toast({
        variant: "destructive",
        title: "Error",
        description: (error as Error).message || "Failed to create story. Please try again."
      })
    } finally {
      setIsSubmitting(false)
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

  const handleAudioRecord = async (id: string, blob: Blob) => {
    // Convert blob to File for consistent handling
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Create a New Story</h1>
      
      {errorMessage && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
          {errorMessage}
        </div>
      )}
      
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
                  {date ? format(date, "PPP") : "Select date"}
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
                    defaultLocation={userLocation || location}
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
            onValueChange={(value: "family" | "personal" | "custom") => setPrivacy(value)}
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

          {blocks.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Plus className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">Add a block to start creating your story</p>
              <div className="flex justify-center gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => addBlock("text")}>
                  <Type className="h-4 w-4 mr-2" />
                  Add Text
                </Button>
                <Button variant="outline" size="sm" onClick={() => addBlock("image")}>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Add Image
                </Button>
              </div>
            </div>
          ) : (
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
                      onChange={(e) => updateBlock(block.id, e.target.value as string)}
                      placeholder="Start writing..."
                      className="w-full min-h-[100px] p-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-[#0A5C36] focus:border-transparent"
                    />
                  )}
                  {(block.type === "image" || block.type === "video" || block.type === "audio") && (
                    <div className="space-y-2">
                      <MediaUpload
                        type={block.type}
                        onFileSelect={(url) => updateBlock(block.id, url)}
                        value={block.content instanceof File ? '' : block.content as string}
                        onRemove={() => updateBlock(block.id, "")}
                        quality="medium"
                        maxWidth={block.type === 'image' ? 1600 : block.type === 'video' ? 1280 : undefined}
                        maxHeight={block.type === 'image' ? 1600 : block.type === 'video' ? 720 : undefined}
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
          )}
        </div>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" className="mb-4" disabled={isSubmitting || !title.trim()}>
            {isSubmitting ? "Creating..." : "Create Story"}
          </Button>
        </div>
      </form>
    </div>
  )
} 