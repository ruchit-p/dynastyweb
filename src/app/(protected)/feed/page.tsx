"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useAuth } from "@/components/auth"
import { type Story } from "@/lib/shared/types/story"
import { Button } from "@/components/ui/button"
import { PenSquare, BookOpen } from "lucide-react"
import { StoryCard } from "@/components/Story"
import { getAccessibleStories } from "@/app/actions/stories"

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
  const { user } = useAuth()
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

        if (!user?.id) {
          console.log('[Feed] No user ID available, skipping story fetch');
          setError('Unable to load feed. Please try logging out and back in.');
          return;
        }

        console.log('[Feed] Fetching accessible stories');
        const accessibleStories = await getAccessibleStories(user.id);
        console.log('[Feed] Stories response:', accessibleStories);
        
        if (!mounted) {
          console.log('[Feed] Component unmounted, skipping state update');
          return;
        }

        console.log('[Feed] Processed stories:', {
          count: accessibleStories.length,
          stories: accessibleStories.map(s => ({
            id: s.id,
            title: s.title,
            createdAt: s.createdAt
          }))
        });

        setStories(accessibleStories as EnrichedStory[]);
      } catch (error) {
        console.error('[Feed] Error loading stories:', error);
        if (!mounted) return;
        if (error instanceof Error && error.message === 'User is not part of a family tree') {
          setError('You need to be part of a family tree to view stories. Please create or join a family tree first.');
        } else {
          setError(error instanceof Error ? error.message : 'Failed to load stories');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (user) {
      loadStories();
    }

    return () => {
      mounted = false;
    };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="container py-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A5C36] mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading your feed...</p>
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
          <h1 className="text-2xl font-bold">Family Feed</h1>
          <div className="flex gap-4">
            <Link href="/history-book">
              <Button variant="outline">
                <BookOpen className="mr-2 h-4 w-4" />
                My Stories
              </Button>
            </Link>
            <Link href="/create-story">
              <Button>
                <PenSquare className="mr-2 h-4 w-4" />
                Write Story
              </Button>
            </Link>
          </div>
        </div>

        {stories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <BookOpen className="h-16 w-16 text-gray-400 mb-4" />
            <p className="text-xl text-gray-600 mb-2">No stories yet</p>
            <p className="text-gray-500 mb-6">Be the first to share a story with your family.</p>
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
                currentUserId={user?.id || ''}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
} 