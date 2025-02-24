import { z } from 'zod'

// Common schemas
export const idSchema = z.string().uuid()
export const emailSchema = z.string().email()
export const dateSchema = z.string().datetime()
export const privacyLevelSchema = z.enum(['private', 'public', 'shared'])
export const dataRetentionPeriodSchema = z.enum(['forever', 'year', 'month', 'week'])
export const invitationStatusSchema = z.enum(['pending', 'accepted', 'rejected'])

// User schemas
export const userCreateSchema = z.object({
  display_name: z.string().min(2).max(100),
  email: emailSchema,
  date_of_birth: dateSchema,
  first_name: z.string().min(1).max(50),
  last_name: z.string().min(1).max(50),
  phone_number: z.string().nullable(),
  gender: z.string(),
  data_retention_period: dataRetentionPeriodSchema,
})

export const userUpdateSchema = userCreateSchema.partial().extend({
  id: idSchema,
})

// Family Tree schemas
export const familyTreeCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable(),
  privacy_level: privacyLevelSchema,
})

export const familyTreeUpdateSchema = familyTreeCreateSchema.partial().extend({
  id: idSchema,
})

export const familyTreeMemberSchema = z.object({
  tree_id: idSchema,
  user_id: idSchema,
  role: z.enum(['admin', 'editor', 'viewer']),
})

// Story schemas
export const storyCreateSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  family_tree_id: idSchema,
  media_urls: z.array(z.string().url()).optional(),
  tags: z.array(z.string()).optional(),
  privacy_level: privacyLevelSchema,
})

export const storyUpdateSchema = storyCreateSchema.partial().extend({
  id: idSchema,
})

// Comment schemas
export const commentCreateSchema = z.object({
  content: z.string().min(1).max(1000),
  story_id: idSchema,
})

export const commentUpdateSchema = commentCreateSchema.partial().extend({
  id: idSchema,
})

// Invitation schemas
export const invitationCreateSchema = z.object({
  invitee_name: z.string().min(1).max(100),
  invitee_email: emailSchema,
  family_tree_id: idSchema,
  first_name: z.string().min(1).max(50),
  last_name: z.string().min(1).max(50),
  date_of_birth: dateSchema.optional(),
  gender: z.string().optional(),
  phone_number: z.string().optional(),
  relationship: z.string().optional(),
  expires_at: dateSchema,
})

export const invitationUpdateSchema = z.object({
  id: idSchema,
  status: invitationStatusSchema,
})

// Auth schemas
export const signupSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(100),
  first_name: z.string().min(1).max(50),
  last_name: z.string().min(1).max(50),
  date_of_birth: dateSchema,
  gender: z.string(),
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string(),
})

export const resetPasswordSchema = z.object({
  email: emailSchema,
})

export const updatePasswordSchema = z.object({
  password: z.string().min(8).max(100),
  token: z.string(),
})

// Permission schemas
export const roleSchema = z.object({
  user_id: idSchema,
  role: z.string(),
})

export const permissionSchema = z.object({
  user_id: idSchema,
  permissions: z.array(z.string()),
}) 