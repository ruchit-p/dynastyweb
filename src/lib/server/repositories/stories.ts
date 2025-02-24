import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/lib/shared/types/supabase'
import { BaseRepository } from './base'
import { uploadFile } from '@/app/actions/storage'
import { sanitizeFileName } from '@/lib/shared/validation/storage'
import crypto from 'crypto'

export class StoriesRepository extends BaseRepository<'stories'> {
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase, 'stories')
  }

  // MARK: - Story-specific Operations

  async getByFamilyTreeId(familyTreeId: string) {
    const { data, error } = await this.query
      .select(`
        *,
        author:author_id(id, full_name, avatar_url),
        comments:comments(
          *,
          author:author_id(id, full_name, avatar_url)
        )
      `)
      .eq('family_tree_id', familyTreeId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async getByAuthorId(authorId: string) {
    const { data, error } = await this.query
      .select(`
        *,
        author:author_id(id, full_name, avatar_url),
        comments:comments(
          *,
          author:author_id(id, full_name, avatar_url)
        )
      `)
      .eq('author_id', authorId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async addComment(storyId: string, authorId: string, content: string) {
    const { data, error } = await this.supabase
      .from('comments')
      .insert({
        story_id: storyId,
        author_id: authorId,
        content
      })
      .select(`
        *,
        author:author_id(id, full_name, avatar_url)
      `)
      .single()

    if (error) throw error
    return data
  }

  // MARK: - Story Media Management

  /**
   * Uploads media for a story and returns the public URL
   */
  async uploadMedia(file: File) {
    const fileExt = file.name.split('.').pop()
    const sanitizedName = sanitizeFileName(file.name)
    const fileName = `${crypto.randomUUID()}-${sanitizedName}`
    const filePath = `story-media/${fileName}`

    const { url, error } = await uploadFile(file, 'stories', {
      path: filePath,
      contentType: file.type
    })

    if (error) {
      throw new Error(error)
    }

    return url
  }

  async deleteMedia(mediaUrl: string) {
    const filePath = mediaUrl.split('/').pop()
    if (!filePath) throw new Error('Invalid media URL')

    const { error } = await this.supabase
      .storage
      .from('media')
      .remove([`story-media/${filePath}`])

    if (error) throw error
    return true
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