"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PenSquare, Book } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { type Story } from "@/utils/storyUtils"
import { StoryCard } from "@/components/Story"
import { getUserStories } from "@/utils/functionUtils"
import { Separator } from "@/components/ui/separator"

// Define the enriched story type that includes author and tagged people
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

export default function HistoryBookPage() {
  const { currentUser } = useAuth()
  const [stories, setStories] = useState<EnrichedStory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true;

    const loadStories = async () => {
      console.log('[HistoryBook] Starting to load stories');
      
      try {
        setLoading(true);
        setError(null);

        if (!currentUser?.uid) {
          console.log('[HistoryBook] Missing user ID, skipping story fetch');
          setError('Unable to load stories. Please try logging out and back in.');
          return;
        }
        
        console.log('[HistoryBook] Current user:', {
          uid: currentUser.uid,
          email: currentUser.email,
          emailVerified: currentUser.emailVerified,
          isAnonymous: currentUser.isAnonymous,
          metadata: currentUser.metadata
        });
        
        console.log('[HistoryBook] Fetching user stories');
        let response;
        try {
          response = await getUserStories(currentUser.uid);
          console.log('[HistoryBook] Stories response:', response);
        } catch (error) {
          console.error('[HistoryBook] Error calling getUserStories:', error);
          setError(error instanceof Error ? error.message : 'Failed to fetch stories');
          return;
        }
        
        if (!mounted) {
          console.log('[HistoryBook] Component unmounted, skipping state update');
          return;
        }

        if (!response || !response.stories) {
          console.error('[HistoryBook] Invalid response format:', response);
          setError('Received invalid data format from server');
          return;
        }

        const { stories: userStories } = response;
        console.log('[HistoryBook] Processed stories:', {
          count: userStories.length,
          stories: userStories.map((s: Partial<EnrichedStory>) => ({
            id: s.id,
            title: s.title,
            createdAt: s.createdAt,
            author: s.author || null,
            taggedPeople: s.taggedPeople || [],
            authorID: s.authorID
          }))
        });

        // Transform the stories to ensure they have the expected structure
        const enrichedStories = userStories.map((story: Partial<EnrichedStory>) => {
          console.log(`[HistoryBook] Processing story ${story.id}, author present: ${!!story.author}`);
          
          // The stories are now properly enriched by the backend function
          // Just ensure we have empty arrays for required properties if they're missing
          return {
            ...story as Story,
            blocks: story.blocks || [],
            taggedPeople: story.taggedPeople || [],
            peopleInvolved: story.peopleInvolved || [],
            isDeleted: story.isDeleted || false,
          } as EnrichedStory;
        });

        setStories(enrichedStories);
      } catch (error) {
        console.error('[HistoryBook] Error loading stories:', error);
        if (!mounted) return;
        setError(error instanceof Error ? error.message : 'Failed to load stories');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (currentUser) {
      loadStories();
    }

    return () => {
      mounted = false;
    };
  }, [currentUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="container py-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A5C36] mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading your history book...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="container py-6">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
            <p>{error}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container py-6">
        <div className="flex justify-between my-6 items-center mb-6">
          <h1 className="text-2xl font-bold">My History Book</h1>
          <Link href="/create-story">
            <Button>
              <PenSquare className="mr-2 h-4 w-4" />
              Write Story
            </Button>
          </Link>
        </div>

        <Separator className="my-4" />

        {stories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Book className="h-16 w-16 text-gray-400 mb-4" />
            <p className="text-xl text-gray-600 mb-2">Your history book is empty</p>
            <p className="text-gray-500 mb-6">Start writing your family&apos;s history by creating your first story.</p>
            <Link href="/create-story">
              <Button>
                <PenSquare className="mr-2 h-4 w-4" />
                Write Your First Story
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 my-6">
            {stories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                currentUserId={currentUser?.uid || ''}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
} 