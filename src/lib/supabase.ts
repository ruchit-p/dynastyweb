import { createClient } from '@supabase/supabase-js'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
)

// Types for Supabase tables
export type Tables = {
  users: UserTable
  family_trees: FamilyTreeTable
  stories: StoryTable
  invitations: InvitationTable
}

interface UserTable {
  id: string
  display_name: string
  email: string
  date_of_birth: Date
  first_name: string
  last_name: string
  phone_number: string | null
  parent_ids: string[]
  children_ids: string[]
  spouse_ids: string[]
  is_admin: boolean
  can_add_members: boolean
  can_edit: boolean
  is_pending_signup: boolean
  created_at: Date
  updated_at: Date
  gender: string
  family_tree_id?: string
  history_book_id?: string
  email_verified?: boolean
  data_retention_period: 'forever' | 'year' | 'month' | 'week'
  data_retention_last_updated?: Date
}

interface FamilyTreeTable {
  id: string
  name: string
  description?: string
  created_by: string
  created_at: Date
  updated_at: Date
  members: string[]
  admins: string[]
  editors: string[]
  viewers: string[]
  privacy_level: 'private' | 'public' | 'shared'
}

interface StoryTable {
  id: string
  title: string
  content: string
  author_id: string
  family_tree_id: string
  created_at: Date
  updated_at: Date
  media_urls: string[]
  tags: string[]
  likes: string[]
  comments: Comment[]
  privacy_level: 'private' | 'public' | 'shared'
}

interface InvitationTable {
  id: string
  invitee_id: string
  invitee_name: string
  invitee_email: string
  inviter_id: string
  inviter_name: string
  family_tree_id: string
  family_tree_name: string
  created_at: Date
  expires_at: Date
  status: 'pending' | 'accepted' | 'rejected'
  first_name: string
  last_name: string
  date_of_birth?: Date
  gender?: string
  phone_number?: string
  relationship?: string
}

interface Comment {
  id: string
  content: string
  author_id: string
  created_at: Date
  updated_at: Date
} 