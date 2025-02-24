import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/shared/types/supabase'

export class BaseRepository<T extends keyof Database['public']['Tables']> {
  constructor(
    protected readonly supabase: SupabaseClient<Database>,
    protected readonly table: T
  ) {}

  protected get query() {
    return this.supabase.from(this.table)
  }

  // MARK: - Common Operations

  async getById(id: string) {
    const { data, error } = await this.query
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  }

  async getAll() {
    const { data, error } = await this.query
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  }

  async create(data: Database['public']['Tables'][T]['Insert']) {
    const { data: created, error } = await this.query
      .insert(data)
      .select()
      .single()
    
    if (error) throw error
    return created
  }

  async update(id: string, data: Database['public']['Tables'][T]['Update']) {
    const { data: updated, error } = await this.query
      .update(data)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return updated
  }

  async delete(id: string) {
    const { error } = await this.query
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
  }

  // MARK: - Pagination

  async getPaginated(page: number = 1, limit: number = 10) {
    const start = (page - 1) * limit
    const end = start + limit - 1

    const { data, error, count } = await this.query
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(start, end)
    
    if (error) throw error
    return {
      data,
      metadata: {
        total: count || 0,
        page,
        limit,
        totalPages: count ? Math.ceil(count / limit) : 0
      }
    }
  }

  // MARK: - Error Handling

  protected handleError(error: unknown) {
    console.error(`${this.table} repository error:`, error)
    throw error
  }
} 