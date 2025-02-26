"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PenSquare, Book } from "lucide-react"
import { useAuth } from "@/components/auth"
import { type Story } from "@/lib/client/utils/storyUtils"
import { StoryCard } from "@/components/Story"
import { getUserStories } from "@/app/actions/stories"
import type { HistoryBookPrivacyLevel } from "@/lib/shared/types/story"
import { HistoryBookSettingsDialog } from "@/components/HistoryBookSettingsDialog"

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
  const { currentUser: user } = useAuth()
  const [stories, setStories] = useState<EnrichedStory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [privacyLevel, setPrivacyLevel] = useState<HistoryBookPrivacyLevel>('family')
  const [customAccessMembers, setCustomAccessMembers] = useState<string[]>([])
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false)

  useEffect(() => {
    let mounted = true;

    const loadStories = async () => {
      console.log('[HistoryBook] Starting to load stories');
      
      try {
        setLoading(true);
        setError(null);

        if (!user?.id) {
          console.log('[HistoryBook] Missing user ID, skipping story fetch');
          setError('Unable to load stories. Please try logging out and back in.');
          return;
        }
        
        console.log('[HistoryBook] Fetching user stories');
        // Get the default history book ID for the user (or you can use a param/state to select a specific history book)
        // For now, we're just getting all the user's stories
        const userStories = await getUserStories();
        console.log('[HistoryBook] Stories response:', userStories);
        
        if (!mounted) {
          console.log('[HistoryBook] Component unmounted, skipping state update');
          return;
        }

        console.log('[HistoryBook] Processed stories:', {
          count: userStories.length,
          stories: userStories.map(s => ({
            id: s.id,
            title: s.title,
            createdAt: s.created_at
          }))
        });

        // Cast the stories to EnrichedStory since we're adding author and taggedPeople
        setStories(userStories as unknown as EnrichedStory[]);
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

    if (user) {
      loadStories();
    }

    return () => {
      mounted = false;
    };
  }, [user]);

  const handlePrivacyChange = async (newPrivacyLevel: HistoryBookPrivacyLevel) => {
    setIsUpdatingPrivacy(true);
    // Here you would update the history book privacy level in the database
    setPrivacyLevel(newPrivacyLevel);
    // Simulate API call
    setTimeout(() => {
      setIsUpdatingPrivacy(false);
    }, 1000);
  };

  const handleCustomAccessChange = (members: string[]) => {
    setCustomAccessMembers(members);
    // In a real implementation, you would also update the database with the new custom access members
  };

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
          <div className="flex gap-4">
            <HistoryBookSettingsDialog
              privacyLevel={privacyLevel}
              onPrivacyChange={handlePrivacyChange}
              customAccessMembers={customAccessMembers}
              onCustomAccessChange={handleCustomAccessChange}
              isUpdating={isUpdatingPrivacy}
            />
            <Link href="/create-story">
              <Button>
                <PenSquare className="mr-2 h-4 w-4" />
                Write Story
              </Button>
            </Link>
          </div>
        </div>
        
        <div className="mb-6">
          {privacyLevel === 'personal' && (
            <div className="mt-4 bg-blue-50 text-blue-700 p-4 rounded-md">
              <p>Your history book is set to Personal. Only you can see it and all its stories.</p>
            </div>
          )}
          {privacyLevel === 'custom' && customAccessMembers.length > 0 && (
            <div className="mt-4 bg-blue-50 text-blue-700 p-4 rounded-md">
              <p>Your history book is set to Custom. Only you and {customAccessMembers.length} selected family members can see it.</p>
            </div>
          )}
        </div>

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
                currentUserId={user?.id || ''}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
} 