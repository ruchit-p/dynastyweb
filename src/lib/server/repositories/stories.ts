import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/shared/types/supabase'
import { BaseRepository } from './base'
import { uploadFile } from '@/app/actions/storage'
import { sanitizeFileName } from '@/lib/shared/validation/storage'
import crypto from 'crypto'

type Story = Database['public']['Tables']['stories']['Row']
type StoryInsert = Database['public']['Tables']['stories']['Insert']
type StoryUpdate = Database['public']['Tables']['stories']['Update']

export class StoriesRepository extends BaseRepository<'stories'> {
  constructor(private supabase: SupabaseClient<Database>) {
    super(supabase, 'stories')
  }

  async create(data: StoryInsert) {
    const { data: story, error } = await this.supabase
      .from('stories')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return story
  }

  async update(id: string, data: StoryUpdate) {
    const { data: story, error } = await this.supabase
      .from('stories')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return story
  }

  async delete(id: string) {
    const { error } = await this.supabase
      .from('stories')
      .update({ is_deleted: true })
      .eq('id', id)

    if (error) throw error
  }

  async getById(id: string) {
    const { data: story, error } = await this.supabase
      .from('stories')
      .select(`
        *,
        author:author_id(id, full_name, avatar_url),
        tagged_people:story_tags(
          user:user_id(id, full_name)
        )
      `)
      .eq('id', id)
      .eq('is_deleted', false)
      .single()

    if (error) throw error
    return story
  }

  async getByFamilyTreeId(familyTreeId: string) {
    const { data: stories, error } = await this.supabase
      .from('stories')
      .select(`
        *,
        author:author_id(id, full_name, avatar_url),
        tagged_people:story_tags(
          user:user_id(id, full_name)
        )
      `)
      .eq('family_tree_id', familyTreeId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (error) throw error
    return stories
  }

  async addComment(storyId: string, userId: string, content: string) {
    const { data: comment, error } = await this.supabase
      .from('story_comments')
      .insert({
        story_id: storyId,
        user_id: userId,
        content,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return comment
  }

  async uploadMedia(file: File) {
    const { data, error } = await this.supabase
      .storage
      .from('story-media')
      .upload(`${Date.now()}-${file.name}`, file)

    if (error) throw error
    
    const { data: { publicUrl } } = this.supabase
      .storage
      .from('story-media')
      .getPublicUrl(data.path)

    return publicUrl
  }

  // MARK: - Advanced Queries

  async search(query: string) {
    const { data, error } = await this.query
      .select(`
        *,
        author:author_id(id, full_name, avatar_url)
      `)
      .textSearch('title', query, {
        config: 'english'
      })
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async getByTag(tag: string) {
    const { data, error } = await this.query
      .select(`
        *,
        author:author_id(id, full_name, avatar_url)
      `)
      .contains('tags', [tag])
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }
} 