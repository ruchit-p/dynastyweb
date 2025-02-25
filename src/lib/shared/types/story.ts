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
}

/**
 * Represents a full story with all its content
 */
export interface Story {
  id: string;
  title: string;
  subtitle?: string;
  content?: string;
  blocks?: StoryBlock[];
  user_id: string;
  created_at: string;
  updated_at: string;
  event_date?: string;
  location?: string;
  privacy_level: 'family' | 'personal' | 'custom';
  custom_access_members?: string[];
  family_tree_id?: string;
  people_involved?: string[];
  is_deleted: boolean;
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