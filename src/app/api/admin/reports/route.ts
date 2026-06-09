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

export async function GET() {
  const auth = await verifyAdmin()
  if ('error' in auth && auth.error) return auth.error

  const admin = createAdminClient()

  // Fetch all reports ordered by newest first
  const { data: reports, error } = await admin
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Collect all unique user IDs to fetch profiles
  const userIds = new Set<string>()
  reports?.forEach((r) => {
    userIds.add(r.reporter_id)
    userIds.add(r.reported_user_id)
  })

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', Array.from(userIds))

  const profileMap = new Map(profiles?.map((p) => [p.id, p]))

  const reportsWithProfiles = reports?.map((r) => ({
    ...r,
    reporter: profileMap.get(r.reporter_id) || null,
    reported_user: profileMap.get(r.reported_user_id) || null,
  }))

  return NextResponse.json({ reports: reportsWithProfiles })
}

// ────────────────────── PATCH ──────────────────────

export async function PATCH(request: NextRequest) {
  const auth = await verifyAdmin()
  if ('error' in auth && auth.error) return auth.error

  const body = await request.json()
  const { report_id, action } = body as {
    report_id: string
    action: 'approved' | 'rejected'
  }

  if (!report_id || !['approved', 'rejected'].includes(action)) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Fetch the report
  const { data: report, error: reportError } = await admin
    .from('reports')
    .select('*')
    .eq('id', report_id)
    .single()

  if (reportError || !report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  // Update report status
  const { error: updateError } = await admin
    .from('reports')
    .update({ status: action })
    .eq('id', report_id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // If approved, ban the reported user
  if (action === 'approved') {
    await admin
      .from('profiles')
      .update({ is_banned: true })
      .eq('id', report.reported_user_id)
  }

  // Create notification for the reporter
  const statusText = action === 'approved' ? 'approved and the user has been banned' : 'rejected'
  await admin.from('notifications').insert({
    recipient_id: report.reporter_id,
    title: 'Report Update',
    content: `Your report has been ${statusText}.`,
    is_broadcast: false,
    is_read: false,
  })

  return NextResponse.json({ success: true })
}
