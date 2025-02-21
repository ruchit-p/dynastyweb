import { format } from "date-fns"
import { Lock, MapPin, Image, FileText, Video, AudioLines, User } from "lucide-react"
import Link from "next/link"
import { Button } from "./ui/button"
import { ScrollArea, ScrollBar } from "./ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import type { Story } from "@/utils/storyUtils"
import { useEffect, useState } from "react"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface StoryProps {
  story: Story
  currentUserId: string
  authorName?: string
  authorProfilePic?: string
}

interface MediaCount {
  text: number
  image: number
  video: number
  audio: number
}

interface TaggedPerson {
  id: string
  displayName: string
}

export function StoryCard({ story, currentUserId, authorName, authorProfilePic }: StoryProps) {
  const [taggedPeople, setTaggedPeople] = useState<TaggedPerson[]>([])

  useEffect(() => {
    const fetchTaggedPeople = async () => {
      if (!story.peopleInvolved?.length) return;

      const peoplePromises = story.peopleInvolved.map(async (personId) => {
        try {
          const personDoc = await getDoc(doc(db, "users", personId));
          if (personDoc.exists()) {
            const data = personDoc.data();
            return {
              id: personId,
              displayName: data.displayName || `${data.firstName} ${data.lastName}`.trim() || 'Unknown'
            };
          }
          return { id: personId, displayName: 'Unknown' };
        } catch (error) {
          console.error(`Error fetching person ${personId}:`, error);
          return { id: personId, displayName: 'Unknown' };
        }
      });

      const people = await Promise.all(peoplePromises);
      setTaggedPeople(people);
    };

    fetchTaggedPeople();
  }, [story.peopleInvolved]);

  // Count different media types
  const mediaCount = story.blocks.reduce((acc: MediaCount, block) => {
    acc[block.type as keyof MediaCount]++
    return acc
  }, { text: 0, image: 0, video: 0, audio: 0 })

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
      {/* Author Info & Date */}
      <div className="flex items-center gap-3 mb-4">
        <Avatar className="h-10 w-10">
          <AvatarImage src={authorProfilePic} alt={authorName} />
          <AvatarFallback>
            <User className="h-6 w-6 text-gray-400" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 -space-y-4">
          <p className="font-medium leading-none">{authorName}</p>
          {story.eventDate && (
            <p className="text-sm text-gray-500">
              {format(story.eventDate.toDate(), 'MMMM d, yyyy')}
            </p>
          )}
        </div>
        {story.authorID === currentUserId && story.privacy === 'privateAccess' && (
          <Lock className="h-4 w-4 text-red-400 flex-shrink-0" />
        )}
      </div>

      {/* Title & Subtitle */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-1">{story.title}</h2>
        {story.subtitle && <p className="text-gray-600">{story.subtitle}</p>}
      </div>

      {/* Tagged People */}
      {taggedPeople.length > 0 && (
        <div className="mb-4">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2">
              {taggedPeople.map((person) => (
                <span
                  key={person.id}
                  className="inline-block bg-gray-100 rounded-full px-3 py-1 text-sm text-gray-600"
                >
                  {person.displayName}
                </span>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}

      {/* Location */}
      {story.location && (
        <div className="mb-4">
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <MapPin className="h-4 w-4" />
            <span>{story.location.address}</span>
          </div>
        </div>
      )}

      {/* Media Type Indicators */}
      <div className="flex items-center gap-4 pt-4 border-t">
        {mediaCount.text > 0 && (
          <div className="flex items-center gap-1 text-gray-500">
            <FileText className="h-4 w-4" />
            <span className="text-sm">{mediaCount.text}</span>
          </div>
        )}
        {mediaCount.image > 0 && (
          <div className="flex items-center gap-1 text-gray-500">
            <Image className="h-4 w-4" />
            <span className="text-sm">{mediaCount.image}</span>
          </div>
        )}
        {mediaCount.video > 0 && (
          <div className="flex items-center gap-1 text-gray-500">
            <Video className="h-4 w-4" />
            <span className="text-sm">{mediaCount.video}</span>
          </div>
        )}
        {mediaCount.audio > 0 && (
          <div className="flex items-center gap-1 text-gray-500">
            <AudioLines className="h-4 w-4" />
            <span className="text-sm">{mediaCount.audio}</span>
          </div>
        )}
        <div className="flex-1" />
        <Link href={`/story/${story.id}`}>
          <Button variant="link" className="text-[#0A5C36]">
            Read More
          </Button>
        </Link>
      </div>
    </div>
  )
} 