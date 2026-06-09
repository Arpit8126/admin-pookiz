import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// ────────────────────── Verify Admin ──────────────────────

async function verifyAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('sethji')
    .eq('id', user.id)
    .single()

  if (!profile?.sethji) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { userId: user.id }
}

// ────────────────────── GET ──────────────────────

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin()
  if ('error' in auth && auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username')

  if (!username) {
    return NextResponse.json({ error: 'Username required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // 1. Fetch user profile by username
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const userId = profile.id

  // 2. Fetch all messages by this user (both group + DM)
  const { data: messages } = await admin
    .from('messages')
    .select('*')
    .eq('sender_id', userId)
    .order('created_at', { ascending: false })
    .limit(500)

  // Enrich messages with group names
  const groupIds = [...new Set(messages?.filter((m) => m.group_id).map((m) => m.group_id!))]
  let groupMap: Record<string, string> = {}
  if (groupIds.length > 0) {
    const { data: groups } = await admin
      .from('groups')
      .select('id, name')
      .in('id', groupIds)
    groupMap = Object.fromEntries(groups?.map((g) => [g.id, g.name]) || [])
  }

  // Enrich messages with recipient usernames
  const recipientIds = [...new Set(messages?.filter((m) => m.recipient_id).map((m) => m.recipient_id!))]
  let recipientMap: Record<string, string> = {}
  if (recipientIds.length > 0) {
    const { data: recipients } = await admin
      .from('profiles')
      .select('id, username')
      .in('id', recipientIds)
    recipientMap = Object.fromEntries(recipients?.map((r) => [r.id, r.username]) || [])
  }

  const enrichedMessages = messages?.map((m) => ({
    ...m,
    group_name: m.group_id ? groupMap[m.group_id] || 'Unknown Group' : null,
    recipient_username: m.recipient_id ? recipientMap[m.recipient_id] || 'Unknown' : null,
    context: m.group_id ? 'group' : 'dm',
  }))

  // 3. Fetch friends (both directions)
  const { data: friendsRaw } = await admin
    .from('friends')
    .select('*')
    .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
    .eq('status', 'accepted')

  const friendUserIds = friendsRaw?.map((f) =>
    f.user_id_1 === userId ? f.user_id_2 : f.user_id_1
  ) || []

  let friendProfiles: Array<{ id: string; username: string; avatar_url: string | null }> = []
  if (friendUserIds.length > 0) {
    const { data: fProfiles } = await admin
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', friendUserIds)
    friendProfiles = fProfiles || []
  }

  // 4. Fetch DM conversations — get unique conversation partners
  const { data: dmMessages } = await admin
    .from('messages')
    .select('*')
    .is('group_id', null)
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: true })
    .limit(2000)

  // Group DMs by conversation partner
  const conversations: Record<string, {
    partner_id: string
    partner_username: string
    messages: typeof dmMessages
  }> = {}

  // Collect all partner IDs
  const partnerIds = new Set<string>()
  dmMessages?.forEach((m) => {
    const partnerId = m.sender_id === userId ? m.recipient_id! : m.sender_id
    partnerIds.add(partnerId)
  })

  // Fetch partner profiles
  let partnerMap: Record<string, string> = {}
  if (partnerIds.size > 0) {
    const { data: partners } = await admin
      .from('profiles')
      .select('id, username')
      .in('id', Array.from(partnerIds))
    partnerMap = Object.fromEntries(partners?.map((p) => [p.id, p.username]) || [])
  }

  dmMessages?.forEach((m) => {
    const partnerId = m.sender_id === userId ? m.recipient_id! : m.sender_id
    if (!conversations[partnerId]) {
      conversations[partnerId] = {
        partner_id: partnerId,
        partner_username: partnerMap[partnerId] || 'Unknown',
        messages: [],
      }
    }
    conversations[partnerId].messages!.push(m)
  })

  return NextResponse.json({
    profile,
    messages: enrichedMessages,
    friends: friendProfiles,
    dm_conversations: Object.values(conversations),
  })
}
