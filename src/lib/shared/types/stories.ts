import type { Story } from '@/lib/client/utils/storyUtils'

export type StoryActionResponse<T = undefined> = {
  success?: boolean
  error?: string
} & (T extends undefined ? {} : { [K in keyof T]: T[K] })

export type CreateStoryResponse = StoryActionResponse<{ story: Story }>
export type UpdateStoryResponse = StoryActionResponse<{ story: Story }>
export type DeleteStoryResponse = StoryActionResponse
export type AddCommentResponse = StoryActionResponse<{ comment: any }> // TODO: Add Comment type
export type GetFamilyTreeStoriesResponse = StoryActionResponse<{ stories: Story[] }>
export type UploadMediaResponse = StoryActionResponse<{ mediaUrl: string }> 