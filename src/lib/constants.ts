// ============================================================
// Pookiz Constants
// ============================================================

export const APP_NAME = 'Pookiz' as const

// University configuration
export const UNIVERSITY_NAME = 'GLA University' as const
export const EMAIL_DOMAIN = '@gla.ac.in' as const

// Content limits
export const MAX_BIO_LENGTH = 160
export const MAX_MESSAGE_LENGTH = 1000
export const MAX_USERNAME_LENGTH = 30
export const MIN_USERNAME_LENGTH = 3
export const MAX_GROUP_NAME_LENGTH = 50
export const MAX_GROUP_DESCRIPTION_LENGTH = 500

// File limits
export const MAX_AVATAR_SIZE = 200 * 1024 // 200 KB
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

// Roles
export const ROLES = {
  ADMIN: 'admin',
  COADMIN: 'coadmin',
  MOD: 'mod',
  MEMBER: 'member',
} as const

export type RoleKey = keyof typeof ROLES
export type RoleValue = (typeof ROLES)[RoleKey]

// Role → Tailwind text color class
export const ROLE_COLORS = {
  admin: 'text-red-400',
  coadmin: 'text-orange-400',
  mod: 'text-yellow-400',
  member: 'text-gray-400',
} as const

// Role → Tailwind badge background class
export const ROLE_BADGE_COLORS = {
  admin: 'bg-red-500/20 text-red-400 border-red-500/30',
  coadmin: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  mod: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  member: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
} as const

// Role hierarchy (higher number = more privileges)
export const ROLE_HIERARCHY: Record<string, number> = {
  member: 0,
  mod: 1,
  coadmin: 2,
  admin: 3,
} as const

// System groups
export const SYSTEM_GROUPS = {
  GLA: 'GLA University Group',
  ANONYMOUS: 'Anonymous Group',
  WELCOME: 'Welcome Group',
} as const

// Privacy type labels
export const PRIVACY_LABELS = {
  public: 'Public',
  university_only: 'University Only',
  password_protected: 'Password Protected',
} as const

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  VERIFY: '/verify',
  ONBOARDING: '/onboarding',
  DASHBOARD: '/dashboard',
  GROUPS: '/groups',
  DMS: '/dms',
  FRIENDS: '/friends',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  ADMIN: '/admin',
} as const

// Realtime channels
export const REALTIME_CHANNELS = {
  MESSAGES: 'messages',
  NOTIFICATIONS: 'notifications',
  PRESENCE: 'presence',
  GROUP_MEMBERS: 'group_members',
} as const
