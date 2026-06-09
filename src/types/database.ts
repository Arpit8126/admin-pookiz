// ============================================================
// Pookiz Database Types
// Comprehensive TypeScript types for the Supabase database
// ============================================================

// ---- Enums ----

export type PrivacyType = 'public' | 'university_only' | 'password_protected'
export type GroupRole = 'member' | 'mod' | 'coadmin' | 'admin'
export type FriendStatus = 'pending' | 'accepted'
export type ReportStatus = 'pending' | 'approved' | 'rejected'

// ---- Row Types ----

export type University = {
  id: string
  name: string
  domain: string
  logo_url: string | null
  created_at: string
}

export type Profile = {
  id: string
  username: string
  bio: string | null
  avatar_url: string | null
  university_name: string | null
  course: string | null
  dob: string | null
  city: string | null
  is_banned: boolean
  sethji: boolean
  is_onboarded: boolean
  is_email_verified: boolean
  is_testing_user: boolean
  university_id: string | null
  last_seen: string | null
  session_token: string | null
  created_at: string
  updated_at: string
  full_name: string | null
  year_of_study: string | null
  allow_calls?: 'always' | 'only_online' | 'never'
  is_muted_ringtone?: boolean
  active_chat_id?: string | null
}

export type Group = {
  id: string
  name: string
  bio: string | null
  description: string | null
  creator_id: string
  privacy_type: PrivacyType
  password_hash: string | null
  is_system_group: boolean
  avatar_url: string | null
  university_id: string | null
  created_at: string
  updated_at: string
}

export type GroupMember = {
  id: string
  group_id: string
  user_id: string
  role: GroupRole
  is_group_banned: boolean
  joined_at: string
}

export type Message = {
  id: string
  sender_id: string
  recipient_id: string | null
  group_id: string | null
  message_text: string
  is_anonymous: boolean
  created_at: string
  media_url: string | null
  read_at: string | null
}

export type Friend = {
  id: string
  user_id_1: string
  user_id_2: string
  status: FriendStatus
  created_at: string
}

export type Block = {
  id: string
  blocker_id: string
  blocked_id: string
  created_at: string
}

export type Report = {
  id: string
  reporter_id: string
  reported_user_id: string
  reason: string
  status: ReportStatus
  created_at: string
}

export type Notification = {
  id: string
  recipient_id: string | null
  title: string
  content: string
  is_broadcast: boolean
  is_read: boolean
  created_at: string
}

export type Feedback = {
  id: string
  user_id: string
  content: string
  created_at: string
}

export type MessageReaction = {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
}

// ---- Insert Types (omit auto-generated fields) ----

export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at' | 'bio' | 'avatar_url' | 'university_name' | 'course' | 'dob' | 'city' | 'is_banned' | 'sethji' | 'is_onboarded' | 'last_seen' | 'session_token' | 'full_name' | 'year_of_study'> & {
  bio?: string | null
  avatar_url?: string | null
  university_name?: string | null
  course?: string | null
  dob?: string | null
  city?: string | null
  is_banned?: boolean
  sethji?: boolean
  is_onboarded?: boolean
  last_seen?: string | null
  session_token?: string | null
  created_at?: string
  updated_at?: string
  full_name?: string | null
  year_of_study?: string | null
  active_chat_id?: string | null
}

export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at'>> & {
  updated_at?: string
}

export type GroupInsert = Omit<Group, 'id' | 'created_at' | 'updated_at' | 'bio' | 'description' | 'password_hash' | 'is_system_group' | 'avatar_url'> & {
  id?: string
  bio?: string | null
  description?: string | null
  password_hash?: string | null
  is_system_group?: boolean
  avatar_url?: string | null
  created_at?: string
  updated_at?: string
}

export type GroupUpdate = Partial<Omit<Group, 'id' | 'created_at'>> & {
  updated_at?: string
}

export type GroupMemberInsert = Omit<GroupMember, 'id' | 'joined_at' | 'is_group_banned'> & {
  id?: string
  is_group_banned?: boolean
  joined_at?: string
}

export type GroupMemberUpdate = Partial<Omit<GroupMember, 'id' | 'group_id' | 'user_id' | 'joined_at'>>

export type MessageInsert = Omit<Message, 'id' | 'created_at' | 'recipient_id' | 'group_id' | 'is_anonymous' | 'media_url' | 'read_at'> & {
  id?: string
  recipient_id?: string | null
  group_id?: string | null
  is_anonymous?: boolean
  created_at?: string
  media_url?: string | null
  read_at?: string | null
}

export type FriendInsert = Omit<Friend, 'id' | 'created_at' | 'status'> & {
  id?: string
  status?: FriendStatus
  created_at?: string
}

export type FriendUpdate = Partial<Pick<Friend, 'status'>>

export type BlockInsert = Omit<Block, 'id' | 'created_at'> & {
  id?: string
  created_at?: string
}

export type ReportInsert = Omit<Report, 'id' | 'created_at' | 'status'> & {
  id?: string
  status?: ReportStatus
  created_at?: string
}

export type ReportUpdate = Partial<Pick<Report, 'status'>>

export type NotificationInsert = Omit<Notification, 'id' | 'created_at' | 'recipient_id' | 'is_broadcast' | 'is_read'> & {
  id?: string
  recipient_id?: string | null
  is_broadcast?: boolean
  is_read?: boolean
  created_at?: string
}

export type NotificationUpdate = Partial<Pick<Notification, 'is_read'>>

export type FeedbackInsert = Omit<Feedback, 'id' | 'created_at'> & {
  id?: string
  created_at?: string
}

export type FeedbackUpdate = Partial<Omit<Feedback, 'id' | 'created_at'>>

export type MessageReactionInsert = Omit<MessageReaction, 'id' | 'created_at'> & {
  id?: string
  created_at?: string
}

export type MessageReactionUpdate = Partial<Omit<MessageReaction, 'id' | 'created_at'>>

export type UniversityInsert = Omit<University, 'id' | 'created_at'> & {
  id?: string
  created_at?: string
}

export type UniversityUpdate = Partial<Omit<University, 'id' | 'created_at'>>

export type UniversityApplication = {
  id: string
  name: string
  domain: string
  contact_email: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export type UniversityApplicationInsert = Omit<UniversityApplication, 'id' | 'created_at' | 'status'> & {
  id?: string
  status?: 'pending' | 'approved' | 'rejected'
  created_at?: string
}

export type UniversityApplicationUpdate = Partial<Omit<UniversityApplication, 'id' | 'created_at'>>

export type ActiveCallRecord = {
  id: string
  room_name: string
  group_id: string | null
  creator_id: string
  call_type: 'voice' | 'video'
  created_at: string
  ended_at: string | null
}

export type ActiveCallInsert = Omit<ActiveCallRecord, 'id' | 'created_at' | 'ended_at' | 'group_id'> & {
  id?: string
  group_id?: string | null
  created_at?: string
  ended_at?: string | null
}

export type ActiveCallUpdate = Partial<Omit<ActiveCallRecord, 'id' | 'created_at'>>


// ---- Supabase Database Type ----

export interface Database {
  public: {
    Tables: {
      universities: {
        Row: University
        Insert: UniversityInsert
        Update: UniversityUpdate
        Relationships: []
      }
      university_applications: {
        Row: UniversityApplication
        Insert: UniversityApplicationInsert
        Update: UniversityApplicationUpdate
        Relationships: []
      }
      profiles: {
        Row: Profile
        Insert: ProfileInsert
        Update: ProfileUpdate
        Relationships: []
      }
      groups: {
        Row: Group
        Insert: GroupInsert
        Update: GroupUpdate
        Relationships: []
      }
      group_members: {
        Row: GroupMember
        Insert: GroupMemberInsert
        Update: GroupMemberUpdate
        Relationships: []
      }
      messages: {
        Row: Message
        Insert: MessageInsert
        Update: Partial<Message>
        Relationships: []
      }
      friends: {
        Row: Friend
        Insert: FriendInsert
        Update: FriendUpdate
        Relationships: []
      }
      blocks: {
        Row: Block
        Insert: BlockInsert
        Update: Partial<Block>
        Relationships: []
      }
      reports: {
        Row: Report
        Insert: ReportInsert
        Update: ReportUpdate
        Relationships: []
      }
      notifications: {
        Row: Notification
        Insert: NotificationInsert
        Update: NotificationUpdate
        Relationships: []
      }
      chat_clears: {
        Row: {
          id: string
          user_id: string
          friend_id: string | null
          group_id: string | null
          cleared_at: string
        }
        Insert: {
          id?: string
          user_id: string
          friend_id?: string | null
          group_id?: string | null
          cleared_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          friend_id?: string | null
          group_id?: string | null
          cleared_at?: string
        }
        Relationships: []
      }
      deleted_messages: {
        Row: {
          id: string
          user_id: string
          message_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          message_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          message_id?: string
          created_at?: string
        }
        Relationships: []
      }
      feedbacks: {
        Row: Feedback
        Insert: FeedbackInsert
        Update: FeedbackUpdate
        Relationships: []
      }
      message_reactions: {
        Row: MessageReaction
        Insert: MessageReactionInsert
        Update: MessageReactionUpdate
        Relationships: []
      }
      active_calls: {
        Row: ActiveCallRecord
        Insert: ActiveCallInsert
        Update: ActiveCallUpdate
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      privacy_type: PrivacyType
      group_role: GroupRole
      friend_status: FriendStatus
      report_status: ReportStatus
    }
  }
}

// ---- Joined / Composite Types ----

export interface MessageWithSender extends Message {
  sender: Pick<Profile, 'id' | 'username' | 'avatar_url'> | null
}

export interface MessageWithRecipient extends Message {
  recipient: Pick<Profile, 'id' | 'username' | 'avatar_url'> | null
}

export interface MessageWithSenderAndRecipient extends Message {
  sender: Pick<Profile, 'id' | 'username' | 'avatar_url'> | null
  recipient: Pick<Profile, 'id' | 'username' | 'avatar_url'> | null
}

export interface GroupMemberWithProfile extends GroupMember {
  profile: Pick<Profile, 'id' | 'username' | 'avatar_url' | 'university_name'>
}

export interface GroupWithCreator extends Group {
  creator: Pick<Profile, 'id' | 'username' | 'avatar_url'>
}

export interface GroupWithMembership extends Group {
  member: GroupMember | null
  member_count: number
}

export interface FriendWithProfile extends Friend {
  friend_profile: Pick<Profile, 'id' | 'username' | 'avatar_url' | 'university_name' | 'course' | 'city'>
}

export interface ReportWithProfiles extends Report {
  reporter: Pick<Profile, 'id' | 'username' | 'avatar_url'>
  reported_user: Pick<Profile, 'id' | 'username' | 'avatar_url'>
}

export interface NotificationWithCount {
  notifications: Notification[]
  unread_count: number
}

export interface BlockWithProfile extends Block {
  blocked_user: Pick<Profile, 'id' | 'username' | 'avatar_url'>
}

// ---- Conversation Preview (for DM list) ----

export interface ConversationPreview {
  user: Pick<Profile, 'id' | 'username' | 'avatar_url'>
  last_message: Pick<Message, 'id' | 'message_text' | 'created_at' | 'sender_id'>
  unread_count: number
}

// ---- Group Chat Preview (for group list) ----

export interface GroupChatPreview {
  group: Pick<Group, 'id' | 'name' | 'avatar_url' | 'privacy_type' | 'is_system_group'>
  last_message: Pick<Message, 'id' | 'message_text' | 'created_at' | 'sender_id'> | null
  member_count: number
  my_role: GroupRole | null
}
