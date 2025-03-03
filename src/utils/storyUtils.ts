import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Story {
  id: string;
  title: string;
  subtitle?: string;
  coverPhotoUrl?: string;
  authorID: string;
  createdAt: Timestamp;
  eventDate?: Timestamp;
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  privacy: 'family' | 'privateAccess' | 'custom';
  customAccessMembers?: string[];
  blocks: Array<{
    type: 'text' | 'image' | 'video' | 'audio';
    data: string;
    localId: string;
  }>;
  familyTreeId: string;
  peopleInvolved: string[];
  isDeleted: boolean;
}

export const fetchUserStories = async (userId: string): Promise<Story[]> => {
  try {
    const storiesRef = collection(db, 'stories');
    // Simplified query that only filters by authorID and isDeleted
    const q = query(
      storiesRef,
      where('authorID', '==', userId),
      where('isDeleted', '==', false)
    );

    const querySnapshot = await getDocs(q);
    const stories = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Story[];
    
    // Sort stories by createdAt in descending order
    return stories.sort((a: Story, b: Story) => 
      b.createdAt.toMillis() - a.createdAt.toMillis()
    );
  } catch (error) {
    console.error('Error fetching user stories:', error);
    throw error;
  }
};

export const fetchAccessibleStories = async (
  userId: string,
  familyTreeId: string
): Promise<Story[]> => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    if (!familyTreeId) {
      throw new Error('Family tree ID is required');
    }

    const storiesRef = collection(db, 'stories');
    
    // Get all non-deleted stories from the user's family tree
    const familyStoriesQuery = query(
      storiesRef,
      where('familyTreeId', '==', familyTreeId),
      where('isDeleted', '==', false),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(familyStoriesQuery);
    
    // Filter stories based on privacy settings
    const accessibleStories = querySnapshot.docs
      .map(doc => {
        const data = doc.data();
        // Validate required fields
        if (!data.title || !data.authorID || !data.createdAt || !data.privacy) {
          console.warn(`Story ${doc.id} is missing required fields:`, data);
          return null;
        }
        return {
          id: doc.id,
          ...data
        } as Story;
      })
      .filter((story): story is Story => {
        if (!story) return false;
        
        // User can always see their own stories
        if (story.authorID === userId) return true;

        // For family-wide stories
        if (story.privacy === 'family') return true;

        // For private stories
        if (story.privacy === 'privateAccess') {
          return story.authorID === userId;
        }

        // For custom access stories
        if (story.privacy === 'custom') {
          return story.customAccessMembers?.includes(userId) || false;
        }

        return false;
      });

    return accessibleStories;
  } catch (error) {
    console.error('Error fetching accessible stories:', error);
    throw error instanceof Error 
      ? error 
      : new Error('Failed to fetch accessible stories');
  }
}; 