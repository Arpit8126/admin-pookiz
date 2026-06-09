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
  const search = searchParams.get('search') || ''
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = 20
  const offset = (page - 1) * limit

  const admin = createAdminClient()

  // Build query
  let query = admin
    .from('profiles')
    .select('*', { count: 'exact' })
    .eq('is_email_verified', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.ilike('username', `%${search}%`)
  }

  const { data: users, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fetch message counts for these users
  const userIds = users?.map((u) => u.id) || []

  let messageCounts: Record<string, number> = {}

  if (userIds.length > 0) {
    const { data: messages } = await admin
      .from('messages')
      .select('sender_id')
      .in('sender_id', userIds)

    // Count messages per sender
    if (messages) {
      messageCounts = messages.reduce<Record<string, number>>((acc, msg) => {
        acc[msg.sender_id] = (acc[msg.sender_id] || 0) + 1
        return acc
      }, {})
    }
  }

  const usersWithCounts = users?.map((u) => ({
    ...u,
    message_count: messageCounts[u.id] || 0,
  }))

  return NextResponse.json({
    users: usersWithCounts,
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  })
}

// ────────────────────── PATCH ──────────────────────

export async function PATCH(request: NextRequest) {
  const auth = await verifyAdmin()
  if ('error' in auth && auth.error) return auth.error

  const body = await request.json()
  const { user_id, is_banned } = body as {
    user_id: string
    is_banned: boolean
  }

  if (!user_id || typeof is_banned !== 'boolean') {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('profiles')
    .update({ is_banned })
    .eq('id', user_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
