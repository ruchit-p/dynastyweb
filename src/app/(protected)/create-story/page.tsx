"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { uploadMedia } from "@/utils/mediaUtils"
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
import { createStory } from "@/utils/functionUtils"

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

export default function CreateStoryPage() {
  const router = useRouter()
  const { currentUser, firestoreUser, refreshFirestoreUser } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState("")
  const [subtitle, setSubtitle] = useState("")
  const [coverPhoto, setCoverPhoto] = useState<File | string>("")
  const [coverPhotoProgress, setCoverPhotoProgress] = useState<number | undefined>(undefined)
  const [coverPhotoError, setCoverPhotoError] = useState<string | undefined>(undefined)
  const [date, setDate] = useState<Date>(new Date())
  const [location, setLocation] = useState<Location | undefined>(undefined)
  const [privacy, setPrivacy] = useState<"family" | "personal" | "custom">("family")
  const [customAccessMembers, setCustomAccessMembers] = useState<string[]>([])
  const [taggedMembers, setTaggedMembers] = useState<string[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [userLocation, setUserLocation] = useState<Location | null>(null)
  const [locationPickerKey, setLocationPickerKey] = useState(0)

  // Handle setting members to ensure current user is filtered
  const setFilteredCustomAccessMembers = useCallback((members: string[]) => {
    if (currentUser?.uid) {
      setCustomAccessMembers(members.filter(id => id !== currentUser.uid));
    } else {
      setCustomAccessMembers(members);
    }
  }, [currentUser?.uid]);
  
  const setFilteredTaggedMembers = useCallback((members: string[]) => {
    if (currentUser?.uid) {
      setTaggedMembers(members.filter(id => id !== currentUser.uid));
    } else {
      setTaggedMembers(members);
    }
  }, [currentUser?.uid]);

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

  // Check if user has a family tree ID
  useEffect(() => {
    if (!currentUser?.uid) {
      console.log("No user ID available");
      return;
    }

    if (!firestoreUser) {
      console.log("No Firestore user data available");
      return;
    }

    console.log("Firestore user data:", firestoreUser);
    
    // Add more detailed logging to help diagnose the issue
    console.log("Family tree ID:", firestoreUser.familyTreeId);
    console.log("User document:", JSON.stringify(firestoreUser, null, 2));
    
    if (!firestoreUser.familyTreeId) {
      console.error("No family tree ID found in user document");
      toast({
        variant: "destructive",
        title: "Error",
        description: "You need to be part of a family tree to create stories. Please create or join a family tree first."
      });
      router.push("/family-tree");
    } else {
      console.log("Family tree ID found:", firestoreUser.familyTreeId);
    }
  }, [currentUser?.uid, firestoreUser, router, toast]);

  // Force refresh of firestore user data when component mounts
  useEffect(() => {
    if (currentUser?.uid) {
      // Call the function to refresh the user data
      refreshFirestoreUser().then(() => {
        console.log("Refreshed Firestore user data");
      }).catch(error => {
        console.error("Error refreshing Firestore user data:", error);
      });
    }
  }, [currentUser?.uid, refreshFirestoreUser]);

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

    if (!firestoreUser?.familyTreeId) {
      console.error("No family tree ID found during form submission. Current firestore user:", firestoreUser);
      toast({
        variant: "destructive",
        title: "Error",
        description: "You need to be part of a family tree to create stories. Please create or join a family tree first."
      });
      router.push("/family-tree");
      return;
    }

    // Extra validation to ensure familyTreeId is a valid string
    const familyTreeId = firestoreUser.familyTreeId.trim();
    if (!familyTreeId) {
      console.error("Family tree ID is empty string");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Invalid family tree data. Please try again or contact support."
      });
      return;
    }

    console.log("Proceeding with story creation. Family tree ID:", familyTreeId);

    try {
      setLoading(true)

      // First, create a temporary story ID for media uploads
      const storyId = Math.random().toString(36).substr(2, 9)

      // Upload cover photo if provided
      let coverPhotoUrl = ""
      if (coverPhoto && coverPhoto instanceof File) {
        try {
          coverPhotoUrl = await uploadMedia(
            coverPhoto,
            storyId,
            "image",
            {
              onProgress: (progress) => {
                setCoverPhotoProgress(progress)
              },
              onError: (error) => {
                setCoverPhotoError(error.message)
                throw error
              }
            }
          )
        } catch (error) {
          console.error("Error uploading cover photo:", error)
          throw error
        }
      }

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
                storyId,
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

      // Create story via Cloud Function
      console.log("Creating story with family tree ID:", familyTreeId);
      
      if (!currentUser) {
        throw new Error("User not authenticated");
      }
      
      const response = await createStory({
        authorID: currentUser.uid,
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        coverPhotoUrl: coverPhotoUrl || undefined,
        eventDate: date,
        location: location,
        privacy: privacy === "personal" ? "privateAccess" : privacy,
        customAccessMembers: privacy === "custom" ? 
          customAccessMembers.filter(uid => uid !== currentUser.uid) : 
          undefined,
        blocks: processedBlocks,
        familyTreeId: familyTreeId,
        peopleInvolved: taggedMembers.filter(uid => uid !== currentUser.uid)
      });

      console.log("Story created successfully:", response);
      
      // Show success message and redirect
      toast({
        title: "Success",
        description: "Your story has been created!"
      })
      router.push("/feed")
    } catch (error) {
      console.error("Error creating story:", error);
      
      let errorMessage = "An error occurred while creating your story. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage
      });
      
      setLoading(false);
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
    // Store the file object directly in the block content
    // It will be uploaded when the form is submitted
    updateBlock(id, file)
  }

  const handleAudioRecord = async (id: string, blob: Blob) => {
    // Convert blob to File for consistent handling
    const file = new File([blob], `audio_${Date.now()}.wav`, { type: 'audio/wav' })
    updateBlock(id, file)
  }

  const handleLocationSelect = (loc: Location) => {
    setLocation(loc);
    // Close the location picker after a selection
    toggleLocationPicker();
  }

  // Toggle location picker with improved handling
  const toggleLocationPicker = () => {
    if (showLocationPicker) {
      setShowLocationPicker(false);
    } else {
      // Force a re-render with a new key before showing
      setLocationPickerKey(prev => prev + 1);
      // Show the picker in the next frame for smooth transition
      requestAnimationFrame(() => {
        setShowLocationPicker(true);
      });
    }
  }

  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate)
    }
  }

  // Handle cover photo selection
  const handleCoverPhotoSelect = (file: File) => {
    setCoverPhoto(file)
    setCoverPhotoError(undefined)
    setCoverPhotoProgress(undefined)
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
      <h1 className="text-2xl font-bold mb-4 mt-4 sm:mt-6">Create New Story</h1>
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

        <div>
          <Label className="block text-sm font-medium mb-2">
            Cover Photo
          </Label>
          <MediaUpload
            type="image"
            onFileSelect={handleCoverPhotoSelect}
            value={coverPhoto instanceof File ? "" : coverPhoto as string}
            onRemove={() => setCoverPhoto("")}
          />
          {coverPhotoProgress !== undefined && coverPhotoProgress < 100 && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div
                className="bg-[#0A5C36] h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${coverPhotoProgress}%` }}
              />
            </div>
          )}
          {coverPhotoError && (
            <div className="text-sm text-red-500 mt-1">
              {coverPhotoError}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                onClick={toggleLocationPicker}
              >
                {location ? (
                  <span className="truncate">{location.address}</span>
                ) : (
                  <span className="text-muted-foreground">Select location</span>
                )}
              </Button>
              {showLocationPicker && (
                <div 
                  className="absolute z-10 mt-1 bg-white rounded-lg shadow-lg border p-4"
                  style={{ 
                    width: "100%",
                    maxWidth: "600px",
                    left: "0",
                    visibility: showLocationPicker ? "visible" : "hidden",
                    opacity: showLocationPicker ? "1" : "0",
                    transition: "opacity 0.3s ease-in-out, visibility 0.3s ease-in-out"
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <LocationPicker
                    key={locationPickerKey}
                    onLocationSelect={handleLocationSelect}
                    defaultLocation={userLocation || location}
                    isOpen={showLocationPicker}
                    onClose={toggleLocationPicker}
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
        </div>

        {privacy === "custom" && (
          <div className="space-y-2">
            <Label>Custom Access</Label>
            <FamilyMemberSelect
              selectedMembers={customAccessMembers}
              onMemberSelect={setFilteredCustomAccessMembers}
              placeholder="Select family members who can access this story"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label>Tag People</Label>
          <FamilyMemberSelect
            selectedMembers={taggedMembers}
            onMemberSelect={setFilteredTaggedMembers}
            placeholder="Tag family members in this story"
          />
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h2 className="text-lg font-semibold">Story Content</h2>
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:ml-auto mt-2 sm:mt-0">
              <Button type="button" variant="outline" size="sm" onClick={() => addBlock("text")} className="px-3 py-2 h-auto">
                <Type className="h-4 w-4 mr-2" />
                Add Text
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addBlock("image")} className="px-3 py-2 h-auto">
                <ImageIcon className="h-4 w-4 mr-2" />
                Add Image
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addBlock("video")} className="px-3 py-2 h-auto">
                <Video className="h-4 w-4 mr-2" />
                Add Video
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addBlock("audio")} className="px-3 py-2 h-auto">
                <Mic className="h-4 w-4 mr-2" />
                Add Audio
              </Button>
            </div>
          </div>

          {blocks.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Plus className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">Add a block to start creating your story</p>
              <div className="grid grid-cols-2 gap-2 mt-4 max-w-xs mx-auto">
                <Button variant="outline" size="sm" onClick={() => addBlock("text")} className="px-3 py-2 h-auto">
                  <Type className="h-4 w-4 mr-2" />
                  Add Text
                </Button>
                <Button variant="outline" size="sm" onClick={() => addBlock("image")} className="px-3 py-2 h-auto">
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Add Image
                </Button>
                <Button variant="outline" size="sm" onClick={() => addBlock("video")} className="px-3 py-2 h-auto">
                  <Video className="h-4 w-4 mr-2" />
                  Add Video
                </Button>
                <Button variant="outline" size="sm" onClick={() => addBlock("audio")} className="px-3 py-2 h-auto">
                  <Mic className="h-4 w-4 mr-2" />
                  Add Audio
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
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-end gap-3 sm:gap-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={loading}
            className="w-full mb-4 sm:w-auto"
          >
            {loading ? "Creating..." : "Create Story"}
          </Button>
        </div>
      </form>
    </div>
  )
} 