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
import { 
  CalendarIcon, 
  Type, 
  ImageIcon, 
  Mic, 
  GripVertical, 
  X, 
  Camera,
  MapPin,
  Lock,
  Users,
  PlusCircle,
  Check
} from "lucide-react"
import { format } from "date-fns"
import MediaUpload from "@/components/MediaUpload"
import AudioRecorder from "@/components/AudioRecorder"
import LocationPicker from "@/components/LocationPicker"
import { useToast } from "@/components/ui/use-toast"
import { FamilyMemberSelect } from "@/components/FamilyMemberSelect"
import { createStory } from "@/utils/functionUtils"
import Image from "next/image"
import ImageCropper from "@/components/ImageCropper"
import DynastyCarousel from "@/components/DynastyCarousel"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type BlockType = "text" | "image" | "video" | "audio"

interface Block {
  id: string
  type: BlockType
  content: string | File | File[]
  files?: File[]
  currentFileIndex?: number
  uploadProgress?: number
  error?: string
  localId?: string
}

interface Location {
  lat: number
  lng: number
  address: string
}

export default function CreateStoryPage() {
  const router = useRouter()
  const { currentUser, firestoreUser } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState("")
  const [subtitle, setSubtitle] = useState("")
  const [showSubtitle, setShowSubtitle] = useState(false)
  const [date, setDate] = useState<Date>(new Date())
  const [showDate, setShowDate] = useState(false)
  const [location, setLocation] = useState<Location | undefined>(undefined)
  const [showLocation, setShowLocation] = useState(false)
  const [privacy, setPrivacy] = useState<"family" | "personal" | "custom">("family")
  const [customAccessMembers, setCustomAccessMembers] = useState<string[]>([])
  const [taggedMembers, setTaggedMembers] = useState<string[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])
  const [coverPhoto, setCoverPhoto] = useState<File | null>(null)
  const [showCoverPhoto, setShowCoverPhoto] = useState(false)
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(null)
  const [coverPhotoError, setCoverPhotoError] = useState<string | null>(null)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [userLocation, setUserLocation] = useState<Location | null>(null)
  const [locationPickerKey, setLocationPickerKey] = useState(0)
  const [tempCoverPhotoUrl, setTempCoverPhotoUrl] = useState<string | null>(null)
  const [showCropModal, setShowCropModal] = useState(false)

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
    if (!firestoreUser.familyTreeId) {
      console.error("No family tree ID found in user document");
      toast({
        variant: "destructive",
        title: "Error",
        description: "You need to be part of a family tree to create stories. Please create or join a family tree first."
      });
      router.push("/family-tree");
    }
  }, [currentUser?.uid, firestoreUser, router, toast]);

  // Add a useEffect to clean up object URLs when unmounting
  useEffect(() => {
    return () => {
      // Clean up any existing object URLs when component unmounts
      if (coverPhotoPreview && coverPhotoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(coverPhotoPreview);
      }
      if (tempCoverPhotoUrl) {
        URL.revokeObjectURL(tempCoverPhotoUrl);
      }
    };
  }, [coverPhotoPreview, tempCoverPhotoUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    console.log("🚀 Starting story creation process");

    try {
      if (!title.trim()) {
        console.log("❌ Title is empty - stopping");
        toast({
          title: "Title is required",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!blocks.length) {
        console.log("❌ No content blocks - stopping");
        toast({
          title: "Add at least one content block",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!firestoreUser?.familyTreeId) {
        console.log("❌ No family tree ID found - stopping");
        toast({
          title: "You must be part of a family tree to create a story",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      console.log("✅ Initial validation passed");
      console.log("📦 Preparing to upload media", { 
        blockCount: blocks.length,
        mediaBlocks: blocks.filter(b => b.type !== "text").length 
      });

      // Upload all media files first
      const uploadPromises = blocks
        .filter((block) => block.type !== "text")
        .flatMap((block) => {
          if (block.type === "text" || typeof block.content === "string") {
            return [];
          }
          
          const filesToUpload = Array.isArray(block.content) ? block.content : [block.content as File];
          console.log(`🔄 Processing ${block.type} block with ${filesToUpload.length} files`, { blockId: block.id });
          
          return filesToUpload.map((file) => {
            return new Promise<{ blockId: string; url: string }>((resolve, reject) => {
              console.log(`⬆️ Starting upload for file in block ${block.id}`, { fileName: file.name, fileSize: file.size });
              uploadMedia(
                file,
                firestoreUser!.familyTreeId!, // Use family tree ID as story ID until real ID is created
                block.type as "image" | "video" | "audio", // Cast to expected type
                {
                  onProgress: (progress) => {
                    if (progress % 20 === 0) {
                      console.log(`📊 Upload progress: ${progress}%`, { blockId: block.id });
                    }
                    setBlocks((prev) =>
                      prev.map((b) =>
                        b.id === block.id
                          ? { ...b, uploadProgress: progress }
                          : b
                      )
                    );
                  },
                  onError: (error) => {
                    console.error(`❌ Upload error for block ${block.id}:`, error);
                    setBlocks((prev) =>
                      prev.map((b) =>
                        b.id === block.id
                          ? { ...b, error: error.message }
                          : b
                      )
                    );
                    reject(error);
                  }
                }
              ).then(url => {
                console.log(`✅ Upload complete for file in block ${block.id}`, { url });
                resolve({ blockId: block.id, url });
              });
            });
          });
        });

      // Upload cover photo if it exists
      let coverPhotoUrl: string | undefined;
      if (coverPhoto) {
        console.log("🖼️ Starting cover photo upload", { fileName: coverPhoto.name, fileSize: coverPhoto.size });
        try {
          coverPhotoUrl = await uploadMedia(
            coverPhoto,
            firestoreUser!.familyTreeId!,
            'image',
            {
              onProgress: (progress) => {
                if (progress % 20 === 0) {
                  console.log(`📊 Cover photo upload progress: ${progress}%`);
                }
              },
              onError: (error) => {
                console.error("❌ Cover photo upload error:", error);
                setCoverPhotoError(error.message);
                throw error;
              }
            }
          );
          console.log("✅ Cover photo upload complete", { url: coverPhotoUrl });
        } catch (error) {
          console.error("❌ Cover photo upload failed:", error);
          toast({
            title: "Failed to upload cover photo",
            description: coverPhotoError || "An error occurred while uploading the cover photo.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      console.log("⏳ Waiting for all media uploads to complete");
      const uploadedUrls = await Promise.all(uploadPromises);
      console.log("✅ All media uploads complete", { uploadCount: uploadedUrls.length });

      // Group uploaded URLs by block ID
      const urlsByBlockId = uploadedUrls.reduce((acc, { blockId, url }) => {
        if (!acc[blockId]) acc[blockId] = [];
        acc[blockId].push(url);
        return acc;
      }, {} as Record<string, string[]>);

      // Map the uploaded URLs to their respective blocks
      const processedBlocks = blocks.map((block) => {
        if (block.type === "text") {
          return {
            type: block.type,
            data: block.content as string,
            localId: block.id,
          };
        }

        const urls = urlsByBlockId[block.id] || [];
        
        return {
          type: block.type,
          data: urls.length === 1 ? urls[0] : urls,
          localId: block.id,
        };
      });

      // Create the story with all data
      const privacyValue = privacy === "personal" ? "privateAccess" : privacy;
      
      const storyData = {
        authorID: currentUser!.uid,
        title,
        subtitle: showSubtitle ? subtitle : undefined,
        eventDate: showDate ? date : undefined,
        location: showLocation ? location : undefined,
        privacy: privacyValue as "family" | "privateAccess" | "custom",
        customAccessMembers:
          privacy === "custom" ? customAccessMembers : undefined,
        blocks: processedBlocks.map(block => ({
          type: block.type,
          data: block.data, // Don't convert arrays to single items
          localId: block.localId
        })),
        familyTreeId: firestoreUser!.familyTreeId,
        peopleInvolved: taggedMembers,
        coverPhoto: showCoverPhoto ? coverPhotoUrl : undefined,
      };

      console.log("📦 Story data prepared", { 
        title,
        blocksCount: processedBlocks.length,
        hasCoverPhoto: !!coverPhotoUrl,
        privacy: privacyValue,
        familyTreeId: firestoreUser!.familyTreeId
      });

      console.log("🔄 Calling createStory function");
      const { id: storyId } = await createStory(storyData);
      console.log("✅ Story created successfully", { storyId });

      toast({
        title: "Story created successfully!",
        description: "Your story has been published.",
      });

      router.push(`/story/${storyId}`);
    } catch (error) {
      console.error("❌ Error creating story:", error);
      toast({
        title: "Failed to create story",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addBlock = (type: BlockType) => {
    const newBlock: Block = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content: type === "text" ? "" : [],
      files: type !== "text" ? [] : undefined,
      currentFileIndex: 0,
    }
    setBlocks([...blocks, newBlock])
  }

  const updateBlock = (id: string, content: string | File | File[]) => {
    setBlocks(blocks.map(block => {
      if (block.id === id) {
        // Handle different content types
        let filesArray: File[] | undefined;
        
        if (typeof content !== "string") {
          filesArray = Array.isArray(content) 
            ? content.slice() // Create a copy of the array
            : [content];      // Single file as array
        }
        
        return { 
          ...block, 
          content,
          files: filesArray,
          currentFileIndex: 0
        };
      }
      return block;
    }))
  }

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(block => block.id !== id))
  }

  const handleFileSelect = async (id: string, file: File) => {
    const block = blocks.find(b => b.id === id);
    
    if (!block) return;
    
    if (Array.isArray(block.content)) {
      // Add to existing files
      updateBlock(id, [...block.content, file]);
    } else {
      // First file for this block
      updateBlock(id, [file]);
    }
  }

  const handleMultipleFilesSelect = (id: string, files: File[]) => {
    const block = blocks.find(b => b.id === id);
    
    if (!block) return;
    
    if (Array.isArray(block.content)) {
      // Add all new files to existing files
      updateBlock(id, [...block.content, ...files]);
    } else {
      // First files for this block
      updateBlock(id, files);
    }
  }

  const handleAudioRecord = async (id: string, blob: Blob) => {
    // Convert blob to File for consistent handling
    const file = new File([blob], `audio_${Date.now()}.wav`, { type: 'audio/wav' })
    const block = blocks.find(b => b.id === id);
    
    if (!block) return;
    
    if (Array.isArray(block.content)) {
      // Add to existing files
      updateBlock(id, [...block.content, file]);
    } else {
      // First file for this block
      updateBlock(id, [file]);
    }
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

  const handleCoverPhotoSelect = (file: File) => {
    // Create a temporary URL for the cropper
    const tempUrl = URL.createObjectURL(file);
    setTempCoverPhotoUrl(tempUrl);
    setShowCropModal(true);
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    try {
      console.log("Received cropped blob:", croppedBlob.size, "bytes");
      
      // Convert the cropped blob to a File
      const croppedFile = new File([croppedBlob], "cover-photo.jpg", { 
        type: "image/jpeg",
        lastModified: Date.now()
      });
      
      // Set the cover photo to the cropped file
      setCoverPhoto(croppedFile);
      setCoverPhotoError(null);
      
      // Create a direct object URL for the cropped blob
      const objectUrl = URL.createObjectURL(croppedBlob);
      console.log("Created object URL for preview:", objectUrl);
      setCoverPhotoPreview(objectUrl);
      
      // Clean up
      setShowCropModal(false);
      if (tempCoverPhotoUrl) {
        URL.revokeObjectURL(tempCoverPhotoUrl);
        setTempCoverPhotoUrl(null);
      }
    } catch (error) {
      console.error("Error handling cropped image:", error);
      setCoverPhotoError("Failed to process cropped image");
      setShowCropModal(false);
    }
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    if (tempCoverPhotoUrl) {
      URL.revokeObjectURL(tempCoverPhotoUrl);
      setTempCoverPhotoUrl(null);
    }
  };

  const removeCoverPhoto = () => {
    // Clean up the preview URL if it's an object URL
    if (coverPhotoPreview && coverPhotoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(coverPhotoPreview);
    }
    setCoverPhoto(null);
    setCoverPhotoPreview(null);
  };

  const privacyLabels = {
    family: "Shared with Family",
    personal: "Private (Only You)",
    custom: "Custom Access"
  };

  const privacyIcons = {
    family: <Users className="h-4 w-4 mr-2" />,
    personal: <Lock className="h-4 w-4 mr-2" />,
    custom: <Users className="h-4 w-4 mr-2" />
  };
  
  const removeMediaItem = (blockId: string, index: number) => {
    setBlocks(blocks.map(block => {
      if (block.id === blockId && Array.isArray(block.content)) {
        const newContent = [...block.content];
        newContent.splice(index, 1);
        
        return {
          ...block,
          content: newContent.length > 0 ? newContent : [],
          files: newContent.length > 0 ? 
            (block.files ? block.files.filter((_, i) => i !== index) : undefined) 
            : undefined,
          currentFileIndex: Math.min(block.currentFileIndex || 0, newContent.length - 1)
        };
      }
      return block;
    }));
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {showCropModal && tempCoverPhotoUrl && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="max-w-3xl w-full bg-white rounded-lg overflow-hidden">
              <ImageCropper
                imageSrc={tempCoverPhotoUrl}
                onCropComplete={handleCropComplete}
                onCancel={handleCropCancel}
                aspectRatio={1} // 1:1 square aspect ratio
              />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Cover Photo Section - Square container above title */}
            {showCoverPhoto && (
              <div className="mb-6 flex flex-col items-center">
                <Label className="text-base font-medium self-center">Cover Photo</Label>
                <div className="relative w-1/2 aspect-square bg-gray-100 mt-2 rounded-md overflow-hidden max-w-md">
                  {coverPhotoPreview ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <div className="relative w-full h-full overflow-hidden">
                        <Image 
                          src={coverPhotoPreview} 
                          alt="Cover photo" 
                          width={1080}
                          height={1080}
                          className="object-cover w-full h-full"
                          priority
                          onLoad={() => console.log("Cover photo image loaded successfully")}
                          onError={(e) => {
                            console.error("Error loading cover photo image:", e);
                            setCoverPhotoError("Failed to display image");
                          }}
                        />
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-4 right-4 rounded-full shadow-lg"
                        onClick={removeCoverPhoto}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div 
                      className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
                      onClick={() => document.getElementById('cover-photo-input')?.click()}
                    >
                      <Camera className="h-10 w-10 text-gray-400 mb-2" />
                      <p className="text-gray-600 font-medium">Add a Cover Photo</p>
                      <p className="text-sm text-gray-500">Square 1080 x 1080</p>
                      <input 
                        id="cover-photo-input"
                        type="file"
                        accept=".png,.jpg,.jpeg,.webp"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleCoverPhotoSelect(e.target.files[0])}
                      />
                    </div>
                  )}
                </div>
                {coverPhotoError && (
                  <p className="text-red-500 text-sm mt-1">{coverPhotoError}</p>
                )}
              </div>
            )}
            
            {/* Title - Always shown */}
            <div>
              <Label htmlFor="title" className="text-base font-medium">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter your story title"
                className="mt-1"
                required
              />
            </div>
            
            {/* Optional Fields - Only shown when selected */}
            {showSubtitle && (
              <div className="relative mt-6">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute -right-2 -top-2 opacity-0 hover:opacity-100 transition-opacity bg-white shadow-sm hover:bg-gray-100"
                  onClick={() => setShowSubtitle(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Label htmlFor="subtitle" className="text-base font-medium">
                  Subtitle
                </Label>
                <Input
                  id="subtitle"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Add a subtitle"
                  className="mt-1"
                />
              </div>
            )}
            
            {showDate && (
              <div className="relative mt-6">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute -right-2 -top-2 opacity-0 hover:opacity-100 transition-opacity bg-white shadow-sm hover:bg-gray-100"
                  onClick={() => setShowDate(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Label className="text-base font-medium">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className="w-full justify-start text-left font-normal mt-1"
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
            )}
            
            {showLocation && (
              <div className="relative mt-6">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute -right-2 -top-2 opacity-0 hover:opacity-100 transition-opacity bg-white shadow-sm hover:bg-gray-100"
                  onClick={() => setShowLocation(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Label className="text-base font-medium">Location</Label>
                <div className="relative mt-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    onClick={toggleLocationPicker}
                  >
                    <MapPin className="mr-2 h-4 w-4" />
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
            )}
            
            {/* Add Story Details Button - centered with dashed border */}
            <div className="flex justify-center my-6">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="rounded-full border-dashed border-gray-300 hover:border-gray-400"
                  >
                    <PlusCircle className="h-5 w-5 mr-2" />
                    Add Story Details
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                  <DropdownMenuItem onClick={() => setShowSubtitle(!showSubtitle)}>
                    {showSubtitle && <Check className="h-4 w-4 mr-2" />}
                    {showSubtitle ? "Remove Subtitle" : "Add Subtitle"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowCoverPhoto(!showCoverPhoto)}>
                    {showCoverPhoto && <Check className="h-4 w-4 mr-2" />}
                    {showCoverPhoto ? "Remove Cover Photo" : "Add Cover Photo"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowDate(!showDate)}>
                    {showDate && <Check className="h-4 w-4 mr-2" />}
                    {showDate ? "Remove Date" : "Add Date"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowLocation(!showLocation)}>
                    {showLocation && <Check className="h-4 w-4 mr-2" />}
                    {showLocation ? "Remove Location" : "Add Location"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Privacy and Tag People on the same row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="privacy" className="text-base font-medium">
                  Privacy
                </Label>
                <Select 
                  value={privacy} 
                  onValueChange={(value: "family" | "personal" | "custom") => setPrivacy(value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue>
                      <div className="flex items-center">
                        {privacyIcons[privacy]}
                        {privacyLabels[privacy]}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="family">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        Shared with Family
                      </div>
                    </SelectItem>
                    <SelectItem value="personal">
                      <div className="flex items-center">
                        <Lock className="h-4 w-4 mr-2" />
                        Private (Only You)
                      </div>
                    </SelectItem>
                    <SelectItem value="custom">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        Custom Access
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-base font-medium">
                  Tag People
                </Label>
                <div className="mt-1">
                  <FamilyMemberSelect
                    selectedMembers={taggedMembers}
                    onMemberSelect={setFilteredTaggedMembers}
                    placeholder="Tag family members in this story"
                  />
                </div>
              </div>
            </div>

            {privacy === "custom" && (
              <div>
                <Label className="text-base font-medium">
                  Custom Access
                </Label>
                <div className="mt-1">
                  <FamilyMemberSelect
                    selectedMembers={customAccessMembers}
                    onMemberSelect={setFilteredCustomAccessMembers}
                    placeholder="Select family members who can access this story"
                  />
                </div>
              </div>
            )}

            {/* Story Content Section */}
            <div className="border-t pt-6 mt-6">
              <h2 className="text-lg font-semibold mb-6">Story Content</h2>
              
              {blocks.length === 0 ? (
                <div className="flex justify-center my-8">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="rounded-full border-dashed border-gray-300 hover:border-gray-400"
                      >
                        <PlusCircle className="h-5 w-5 mr-2" />
                        Add Story Block
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center">
                      <DropdownMenuItem onClick={() => addBlock("text")}>
                        <Type className="h-4 w-4 mr-2" />
                        Add Text
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => addBlock("image")}>
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Add Media
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => addBlock("audio")}>
                        <Mic className="h-4 w-4 mr-2" />
                        Record Audio
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <div className="space-y-6">
                  {blocks.map((block) => (
                    <div key={block.id} className="group relative border rounded-lg p-4 hover:border-gray-400 transition-colors">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-sm hover:bg-gray-100"
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
                          {/* Display carousel if multiple files exist */}
                          {Array.isArray(block.content) && block.content.length > 1 ? (
                            <div>
                              <DynastyCarousel
                                items={block.content as File[]}
                                itemType={block.type === "image" ? "image" : block.type === "audio" ? "audio" : "video"}
                                onItemClick={(index: number) => removeMediaItem(block.id, index)}
                              />
                              <p className="text-xs text-gray-500 mt-2 text-center">Click on an item to remove it</p>
                            </div>
                          ) : Array.isArray(block.content) && block.content.length === 1 ? (
                            <MediaUpload
                              type={block.type}
                              onFileSelect={(file) => handleFileSelect(block.id, file)}
                              onMultipleFilesSelect={(files) => handleMultipleFilesSelect(block.id, files)}
                              value={
                                URL.createObjectURL(block.content[0] as File)
                              }
                              onRemove={() => updateBlock(block.id, [])}
                              showMultiple={true}
                              allowMultiple={true}
                            />
                          ) : (
                            // Empty state - show MediaUpload with appropriate type
                            <MediaUpload
                              type={block.type === "image" ? "media" : block.type}
                              onFileSelect={(file) => handleFileSelect(block.id, file)}
                              onMultipleFilesSelect={(files) => handleMultipleFilesSelect(block.id, files)}
                              showMultiple={true}
                              allowMultiple={true}
                            />
                          )}
                          
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
                          
                          {block.type === "audio" && Array.isArray(block.content) && block.content.length === 0 && (
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
                  
                  {/* Add Block Button for after initial blocks - centered rounded button */}
                  <div className="flex justify-center my-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="rounded-full border-dashed border-gray-300 hover:border-gray-400"
                          size="sm"
                        >
                          <PlusCircle className="h-4 w-4 mr-2" />
                          Add Story Block
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center">
                        <DropdownMenuItem onClick={() => addBlock("text")}>
                          <Type className="h-4 w-4 mr-2" />
                          Add Text
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addBlock("image")}>
                          <ImageIcon className="h-4 w-4 mr-2" />
                          Add Media
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addBlock("audio")}>
                          <Mic className="h-4 w-4 mr-2" />
                          Record Audio
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:justify-end gap-3 mt-8 pt-4 border-t">
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
                className="w-full sm:w-auto"
              >
                {loading ? "Creating..." : "Create Story"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
} 