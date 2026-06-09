import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { triggerPushNotification } from '@/lib/push'

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

// ────────────────────── POST ──────────────────────

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin()
  if ('error' in auth && auth.error) return auth.error

  const body = await request.json()
  const { title, content, username } = body as {
    title: string
    content: string
    username?: string // If provided → targeted, otherwise → global
  }

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
  }

  const admin = createAdminClient()

  if (username) {
    // ── Targeted push ──
    const { data: targetUser, error: userError } = await admin
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single()

    if (userError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { error } = await admin.from('notifications').insert({
      recipient_id: targetUser.id,
      title,
      content,
      is_broadcast: true,
      is_read: false,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Trigger push notification
    triggerPushNotification(targetUser.id, {
      title,
      body: content,
      url: '/notifications'
    }).catch(console.error)

    return NextResponse.json({ success: true, type: 'targeted', recipient: username })
  } else {
    // ── Global push ──
    const { data: allUsers, error: usersError } = await admin
      .from('profiles')
      .select('id')
      .eq('is_banned', false)
      .eq('is_email_verified', true)

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 })
    }

    if (!allUsers || allUsers.length === 0) {
      return NextResponse.json({ error: 'No active users found' }, { status: 400 })
    }

    const notifications = allUsers.map((u) => ({
      recipient_id: u.id,
      title,
      content,
      is_broadcast: true,
      is_read: false,
    }))

    // Insert in batches of 500 to avoid payload limits
    const batchSize = 500
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize)
      const { error } = await admin.from('notifications').insert(batch)
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // Trigger push notifications in background (fire-and-forget)
    (async () => {
      const promises = allUsers.map((u) =>
        triggerPushNotification(u.id, {
          title,
          body: content,
          url: '/notifications'
        }).catch((err) => console.error(`Error sending broadcast push to user ${u.id}:`, err))
      )
      await Promise.allSettled(promises)
    })().catch(console.error)

    return NextResponse.json({
      success: true,
      type: 'global',
      recipientCount: allUsers.length,
    })
  }
}

// ────────────────────── GET ──────────────────────

export async function GET() {
  const auth = await verifyAdmin()
  if ('error' in auth && auth.error) return auth.error

  const admin = createAdminClient()

  // Fetch recent broadcasts (distinct by title+content+created_at, grouped)
  const { data: broadcasts, error } = await admin
    .from('notifications')
    .select('*')
    .eq('is_broadcast', true)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Deduplicate broadcasts — global broadcasts create many rows with the same title+content at roughly the same time
  const seen = new Set<string>()
  const uniqueBroadcasts: typeof broadcasts = []
  broadcasts?.forEach((b) => {
    const key = `${b.title}::${b.content}::${b.created_at.substring(0, 16)}`
    if (!seen.has(key)) {
      seen.add(key)
      uniqueBroadcasts.push(b)
    }
  })

  // Get recipient info for targeted broadcasts
  const recipientIds = uniqueBroadcasts
    .map((b) => b.recipient_id)
    .filter((id): id is string => id !== null)
  
  let recipientMap: Record<string, string> = {}
  if (recipientIds.length > 0) {
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, username')
      .in('id', recipientIds)
    recipientMap = Object.fromEntries(profiles?.map((p) => [p.id, p.username]) || [])
  }

  const enriched = uniqueBroadcasts.slice(0, 10).map((b) => ({
    ...b,
    recipient_username: b.recipient_id ? recipientMap[b.recipient_id] || null : null,
    type: b.recipient_id ? 'targeted' : 'global',
  }))

  return NextResponse.json({ broadcasts: enriched })
}
