"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { type Story } from "@/utils/storyUtils"
import { Button } from "@/components/ui/button"
import { PenSquare, BookOpen } from "lucide-react"
import { StoryCard } from "@/components/Story"
import { getAccessibleStories } from "@/utils/functionUtils"
import { Spinner } from "@/components/ui/spinner"

// Define the enriched story type
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

export default function FeedPage() {
  const { currentUser, firestoreUser } = useAuth()
  const [stories, setStories] = useState<EnrichedStory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true;

    const loadStories = async () => {
      console.log('[Feed] Starting to load stories');
      
      try {
        setLoading(true);
        setError(null);

        if (!currentUser?.uid || !firestoreUser?.familyTreeId) {
          console.log('[Feed] Missing required IDs, skipping story fetch');
          setError('Unable to load feed. Please try logging out and back in.');
          return;
        }
        
        console.log('[Feed] Fetching accessible stories');
        const response = await getAccessibleStories(currentUser.uid, firestoreUser.familyTreeId);
        console.log('[Feed] Stories API response:', response);
        
        if (!mounted) {
          console.log('[Feed] Component unmounted, skipping state update');
          return;
        }
        
        if (!response || !response.stories) {
          console.error('[Feed] Invalid response format:', response);
          setError('Received invalid data format from server');
          return;
        }
        
        const { stories: accessibleStories } = response;
        console.log('[Feed] Processed stories:', {
          count: accessibleStories.length,
          stories: accessibleStories.map(s => ({
            id: s.id,
            title: s.title,
            createdAt: s.createdAt
          }))
        });

        setStories(accessibleStories);
      } catch (error) {
        console.error('[Feed] Error loading stories:', error);
        if (!mounted) return;
        setError(error instanceof Error ? error.message : 'Failed to load stories');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (currentUser && firestoreUser?.familyTreeId) {
      loadStories();
    }

    return () => {
      mounted = false;
    };
  }, [currentUser, firestoreUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="container py-6">
          <div className="text-center py-8">
            <Spinner size="lg" variant="primary" />
            <p className="mt-4 text-[#0A5C36] font-medium">Loading stories...</p>
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
          <h1 className="text-2xl font-bold">Feed</h1>
          <Link href="/create-story">
            <Button>
              <PenSquare className="mr-2 h-4 w-4" />
              Write Story
            </Button>
          </Link>
        </div>

        {stories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <BookOpen className="h-16 w-16 text-gray-400 mb-4" />
            <p className="text-xl text-gray-600 mb-2">No stories to display yet</p>
            <p className="text-gray-500 mb-6">Be the first to share a story with your family!</p>
            <Link href="/create-story">
              <Button>
                <PenSquare className="mr-2 h-4 w-4" />
                Share Your First Story
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