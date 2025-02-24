import { format } from "date-fns"
import { Lock, MapPin, FileText, Video, AudioLines, User, Image as ImageIcon } from "lucide-react"
import Link from "next/link"
import { Button } from "./ui/button"
import { ScrollArea, ScrollBar } from "./ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import type { Story } from "@/lib/client/utils/storyUtils"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./ui/card"
import { Badge } from "./ui/badge"

// Helper function to get ordinal suffix for a number
const getOrdinalSuffix = (day: number): string => {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

// Helper function to convert ISO string or Date to Date object
const toDate = (date: string | Date | null | undefined): Date | null => {
  try {
    if (!date) return null;

    // Handle Date object
    if (date instanceof Date) {
      return date;
    }

    // Handle ISO string
    if (typeof date === 'string') {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) return null;
      return parsedDate;
    }

    return null;
  } catch (error) {
    console.error('Error converting date:', error);
    return null;
  }
};

// Helper function to format date with ordinal suffix
const formatDateWithOrdinal = (date: Date): string => {
  const day = date.getDate();
  const suffix = getOrdinalSuffix(day);
  return format(date, `MMMM d'${suffix}', yyyy`);
};

// Helper function to safely format date
const formatEventDate = (date: string | Date | null | undefined): string | null => {
  const parsedDate = toDate(date);
  if (!parsedDate) return null;
  return formatDateWithOrdinal(parsedDate);
};

const formatCreatedDate = (date: string | Date | null | undefined): string | null => {
  const parsedDate = toDate(date);
  if (!parsedDate) return null;
  return formatDateWithOrdinal(parsedDate);
};

interface StoryProps {
  story: Story & {
    author: {
      id: string;
      displayName: string;
      profilePicture?: string;
    };
    taggedPeople: Array<{
      id: string;
      displayName: string;
    }>;
  }
  currentUserId: string
}

interface MediaCount {
  text: number
  image: number
  video: number
  audio: number
}

export function StoryCard({ story, currentUserId }: StoryProps) {
  // Count different media types
  const mediaCount = story.blocks.reduce(
    (acc: MediaCount, block) => {
      acc[block.type as keyof MediaCount]++
      return acc
    },
    { text: 0, image: 0, video: 0, audio: 0 },
  )

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 mb-1">
              <Avatar className="h-10 w-10">
                {story.author.profilePicture ? (
                  <AvatarImage
                    src={story.author.profilePicture}
                    alt={`${story.author.displayName}'s profile picture`}
                    className="object-cover"
                  />
                ) : (
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {story.author.displayName ? (
                      story.author.displayName.charAt(0).toUpperCase()
                    ) : (
                      <User className="h-6 w-6" />
                    )}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <div className="flex items-center gap-1">
                  <p className="font-medium leading-none">{story.author.displayName}</p>
                  {story.authorID === currentUserId && story.privacy === "personal" && (
                    <Lock className="h-4 w-4 text-destructive flex-shrink-0" />
                  )}
                </div>
                {story.eventDate && (
                  <p className="text-sm text-muted-foreground leading-none">
                    Event date: {formatEventDate(story.eventDate) || "Date not available"}
                  </p>
                )}
              </div>
            </div>
            {story.createdAt && (
              <p className="text-sm text-muted-foreground">
                {formatCreatedDate(story.createdAt)
                  ? `Posted ${formatCreatedDate(story.createdAt)}`
                  : "Recently posted"}
              </p>
            )}
          </div>
        </div>
        <CardTitle className="mt-0">{story.title}</CardTitle>
        {story.subtitle && <CardDescription>{story.subtitle}</CardDescription>}
      </CardHeader>
      <CardContent className="pb-2">
        {story.taggedPeople.length > 0 && (
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
      <CardFooter className="flex items-center justify-between pt-2">
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
        <Link href={`/story/${story.id}`}>
          <Button variant="link" className="text-primary">
            Read More
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
} 