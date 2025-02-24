// Database table names
export const TABLES = {
  USERS: 'users',
  USER_ROLES: 'user_roles',
  USER_PERMISSIONS: 'user_permissions',
  STORIES: 'stories',
  FAMILY_TREES: 'family_trees'
} as const

// User roles
export const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  GUEST: 'guest'
} as const

// User permissions
export const PERMISSIONS = {
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
  MANAGE_USERS: 'manage_users'
} as const

// API endpoints
export const API_ENDPOINTS = {
  AUTH: '/auth',
  USERS: '/users',
  STORIES: '/stories',
  FAMILY_TREES: '/family-trees'
} as const 