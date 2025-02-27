// Import types needed for server action responses
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { ServerActionResult } from '@/lib/shared/types/actions';

/**
 * Represents the metadata for a story
 */
export interface StoryMetaData {
  id: string;
  title: string;
  subtitle?: string;
  eventDate?: string;
  location?: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  privacy: 'family' | 'personal' | 'custom';
  customAccessMembers?: string[];
}

/**
 * Represents a block of content in a story
 */
export interface StoryBlock {
  id: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'quote';
  content: string;
  metadata?: Record<string, string | number | boolean>;
  localId?: string;  // For client-side block identification
}

/**
 * Represents a full story with all its content
 */
export interface Story {
  id: string;
  title: string;
  subtitle?: string;
  content?: string;  // Raw content (optional)
  blocks?: StoryBlock[];  // Structured content blocks
  
  // Fields with different naming for Supabase DB compatibility
  user_id: string;  // Database field
  authorID?: string;  // Client-side alias
  
  created_at: string;  // Database field
  createdAt?: string;  // Client-side alias
  
  updated_at: string;
  event_date?: string;  // Database field
  eventDate?: string;  // Client-side alias

  // Location can be string or object
  location?: string | {
    lat: number;
    lng: number;
    address: string;
  };
  
  privacy_level: 'family' | 'personal' | 'custom';  // Database field
  privacy?: 'family' | 'personal' | 'custom';  // Client-side alias
  
  custom_access_members?: string[];  // Database field
  customAccessMembers?: string[];  // Client-side alias
  
  family_tree_id?: string;  // Database field
  familyTreeId?: string;  // Client-side alias
  
  people_involved?: string[];  // Database field
  peopleInvolved?: string[];  // Client-side alias
  
  is_deleted: boolean;
  isDeleted?: boolean;  // Client-side alias
  
  tags?: string[];
  media_urls?: string[];
}

/**
 * Represents a history book privacy level
 */
export type HistoryBookPrivacyLevel = 'family' | 'personal' | 'custom';

/**
 * Represents a history book
 */
export interface HistoryBook {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  privacy_level: HistoryBookPrivacyLevel;
  custom_access_members?: string[];
  data_retention_period: string;
  viewers: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Represents a comment on a story
 */
export interface Comment {
  id: string;
  story_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
} 