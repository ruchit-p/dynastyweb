import { format } from "date-fns"
import { Lock, MapPin, FileText, Video, AudioLines, User, Image as ImageIcon } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { ScrollArea, ScrollBar } from "./ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import type { Story } from "@/utils/storyUtils"
import { Timestamp } from "firebase/firestore"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./ui/card"
import { Badge } from "./ui/badge"
import { useState, useEffect } from "react"
import { preloadImage, getCachedProfilePicture } from "@/utils/imageCache"
import { Separator } from "./ui/separator"
// Define the enriched story type that includes author and tagged people
// This matches the type defined in other components
type EnrichedStory = Story & {
  author: {
    id: string;
    displayName: string;
    profilePicture?: string;
  };
  taggedPeople: Array<{
    id: string;
    displayName: string;
  }>;
};

// Define types for different timestamp formats we might receive
type FirestoreTimestamp = {
  seconds: number;
  nanoseconds: number;
} | {
  _seconds: number;
  _nanoseconds: number;
};

type DateInput = Date | Timestamp | FirestoreTimestamp | string | number | undefined | null;

// Helper function to safely format date with proper error handling
const formatDate = (timestamp: DateInput): string => {
  try {
    // Handle null/undefined
    if (!timestamp) return "Unknown date";
    
    // If it's already a Date object
    if (timestamp instanceof Date) {
      return format(timestamp, 'MMM d, yyyy');
    }
    
    // If it's a number (timestamp in milliseconds)
    if (typeof timestamp === 'number') {
      return format(new Date(timestamp), 'MMM d, yyyy');
    }
    
    // If it's a Firebase Timestamp
    if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
      return format(timestamp.toDate(), 'MMM d, yyyy');
    }
    
    // If it's a Firebase server timestamp object
    if (timestamp && typeof timestamp === 'object') {
      // Handle Firestore timestamp format
      if ('seconds' in timestamp && 'nanoseconds' in timestamp) {
        const milliseconds = timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000;
        return format(new Date(milliseconds), 'MMM d, yyyy');
      }
      
      // Handle alternative Firestore timestamp format
      if ('_seconds' in timestamp && '_nanoseconds' in timestamp) {
        const milliseconds = timestamp._seconds * 1000 + timestamp._nanoseconds / 1000000;
        return format(new Date(milliseconds), 'MMM d, yyyy');
      }
    }
    
    // If it's a string (ISO date string)
    if (typeof timestamp === 'string') {
      return format(new Date(timestamp), 'MMM d, yyyy');
    }
    
    // Fallback for unknown formats
    return "Unknown date";
  } catch (error) {
    console.error("Error formatting date:", error, timestamp);
    return "Unknown date";
  }
};

interface MediaCount {
  text: number
  image: number
  video: number
  audio: number
}

// Define types for story blocks
interface StoryBlock {
  type: 'text' | 'image' | 'video' | 'audio';
  data?: string;
  content?: string;
  localId?: string;
}

export function StoryCard({ story, currentUserId }: { story: EnrichedStory; currentUserId: string }) {
  // State to track image errors
  const [imageError, setImageError] = useState<boolean>(false);
  
  // Preload the author's profile picture if available
  useEffect(() => {
    if (story.author?.profilePicture && !imageError) {
      preloadImage(story.author.profilePicture, story.author.id)
        .catch(err => console.error("Failed to preload profile picture:", err));
    }
  }, [story.author?.id, story.author?.profilePicture, imageError]);
  
  // Get profile picture URL from cache if available
  const profilePicture = story.author?.id 
    ? getCachedProfilePicture(story.author.id, story.author.profilePicture) 
    : undefined;

  // Count different media types
  const mediaCount = story.blocks?.reduce(
    (acc: MediaCount, block: StoryBlock) => {
      if (block.type in acc) {
        acc[block.type]++;
      }
      return acc;
    },
    { text: 0, image: 0, video: 0, audio: 0 }
  ) || { text: 0, image: 0, video: 0, audio: 0 };
  
  // Check if we have any media to show
  const hasMedia = mediaCount.text > 0 || mediaCount.image > 0 || mediaCount.video > 0 || mediaCount.audio > 0;
  
  return (
    <Link href={`/story/${story.id}`} className="block">
      <Card className="rounded-xl border bg-card text-card-foreground shadow hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 mb-1">
                <Avatar className="h-10 w-10">
                  {profilePicture && !imageError ? (
                    <AvatarImage
                      src={profilePicture}
                      alt={`${story.author?.displayName || 'Unknown User'}'s profile picture`}
                      className="object-cover"
                      onError={() => setImageError(true)}
                      loading="eager"
                    />
                  ) : (
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {story.author?.displayName ? (
                        story.author.displayName.charAt(0).toUpperCase()
                      ) : (
                        <User className="h-6 w-6" />
                      )}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <div className="flex items-center gap-1">
                    <p className="font-medium leading-none">{story.author?.displayName || 'Unknown User'}</p>
                    {story.authorID === currentUserId && story.privacy === "privateAccess" && (
                      <Lock className="h-4 w-4 text-destructive flex-shrink-0" />
                    )}
                  </div>
                  {story.eventDate && (
                    <p className="text-sm text-muted-foreground leading-none">
                      Event date: {formatDate(story.eventDate)}
                    </p>
                  )}
                </div>
              </div>
              {story.createdAt && (
                <p className="text-sm text-muted-foreground">
                  Posted {formatDate(story.createdAt)}
                </p>
              )}
            </div>
          </div>
          <CardTitle className="mt-0">{story.title}</CardTitle>
          {story.subtitle && <CardDescription>{story.subtitle}</CardDescription>}
        </CardHeader>
        
        {story.coverPhotoUrl && (
          <div className="px-6 pb-2">
            <Image
              src={story.coverPhotoUrl}
              alt={story.title}
              width={800}
              height={400}
              className="w-full h-48 object-cover rounded-md"
              priority
            />
          </div>
        )}
        
        <CardContent className="pb-2">
          {story.taggedPeople?.length > 0 && (
            <ScrollArea className="w-full whitespace-nowrap mb-2">
              <div className="flex gap-2">
                {story.taggedPeople.map((person) => (
                  <Badge key={person.id} variant="secondary">
                    {person.displayName}
                  </Badge>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
          {story.location && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
              <MapPin className="h-4 w-4" />
              <span>{story.location.address}</span>
            </div>
          )}
        </CardContent>
        {hasMedia && (
            <Separator className="mx-6 my-2 bg-slate-200" />
          )}
        <CardFooter className="flex items-center justify-between pt-2 ">
          <div className="flex items-center gap-4">
            {mediaCount.text > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span className="text-sm">{mediaCount.text}</span>
              </div>
            )}
            {mediaCount.image > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <ImageIcon className="h-4 w-4" />
                <span className="text-sm">{mediaCount.image}</span>
              </div>
            )}
            {mediaCount.video > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Video className="h-4 w-4" />
                <span className="text-sm">{mediaCount.video}</span>
              </div>
            )}
            {mediaCount.audio > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <AudioLines className="h-4 w-4" />
                <span className="text-sm">{mediaCount.audio}</span>
              </div>
            )}
          </div>
        </CardFooter>
      </Card>
    </Link>
  )
} 