'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Button,
  Input,
  Card,
  Avatar,
  Badge,
  Spinner,
} from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'

/* ────────────────────── Types ────────────────────── */

interface ProfileMin {
  id: string
  username: string
  avatar_url: string | null
}

interface Report {
  id: string
  reporter_id: string
  reported_user_id: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  reporter: ProfileMin | null
  reported_user: ProfileMin | null
}

interface DirectoryUser {
  id: string
  username: string
  email: string | null
  bio: string | null
  avatar_url: string | null
  university_name: string
  course: string | null
  dob: string | null
  city: string | null
  is_banned: boolean
  sethji: boolean
  created_at: string
  message_count: number
}

interface AuditMessage {
  id: string
  sender_id: string
  recipient_id: string | null
  group_id: string | null
  message_text: string
  is_anonymous: boolean
  created_at: string
  group_name: string | null
  recipient_username: string | null
  context: 'group' | 'dm'
  media_url: string | null
}

interface AuditData {
  profile: DirectoryUser
  messages: AuditMessage[]
  friends: ProfileMin[]
  dm_conversations: {
    partner_id: string
    partner_username: string
    messages: {
      id: string
      sender_id: string
      recipient_id: string
      message_text: string
      created_at: string
      media_url: string | null
    }[]
  }[]
}

interface Broadcast {
  id: string
  title: string
  content: string
  created_at: string
  recipient_username: string | null
  type: 'global' | 'targeted'
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'reports' | 'users' | 'broadcast' | 'feedback' | 'universities' | 'test-users'>('reports')
  const { success: showSuccess, error: showError, info: showInfo } = useToast()
  const supabase = createClient()

  // ─── Tab 4: Feedback States ───
  const [feedbacks, setFeedbacks] = useState<any[]>([])
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false)

  // ─── Tab 1: Reports & Audit States ───
  const [reports, setReports] = useState<Report[]>([])
  const [loadingReports, setLoadingReports] = useState(false)
  const [auditSearch, setAuditSearch] = useState('')
  const [auditData, setAuditData] = useState<AuditData | null>(null)
  const [loadingAudit, setLoadingAudit] = useState(false)
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null)

  // ─── Lightbox Preview State ───
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  // ─── Universities and Applications States ───
  const [universities, setUniversities] = useState<any[]>([])
  const [applications, setApplications] = useState<any[]>([])
  const [loadingUniversities, setLoadingUniversities] = useState(false)
  const [newUnivName, setNewUnivName] = useState('')
  const [newUnivDomain, setNewUnivDomain] = useState('')
  const [newUnivLogoFile, setNewUnivLogoFile] = useState<File | null>(null)
  const [newUnivLogoPreview, setNewUnivLogoPreview] = useState('')
  const [addingUniv, setAddingUniv] = useState(false)
  const [deletingUnivId, setDeletingUnivId] = useState<string | null>(null)
  const [confirmDeleteUnivId, setConfirmDeleteUnivId] = useState<string | null>(null)

  // ─── Test Users States ───
  const [testEmail, setTestEmail] = useState('')
  const [testUsername, setTestUsername] = useState('')
  const [testPassword, setTestPassword] = useState('')
  const [creatingTestUser, setCreatingTestUser] = useState(false)
  const [usernameAvailability, setUsernameAvailability] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [testEmailError, setTestEmailError] = useState('')

  const handleDownload = async (url: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const objectUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = `pookiz_audit_${Date.now()}.webp`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(objectUrl)
    } catch (err) {
      console.error('Failed to download image', err)
      window.open(url, '_blank')
    }
  }

  // ─── Tab 2: User Directory States ───
  const [users, setUsers] = useState<DirectoryUser[]>([])
  const [directorySearch, setDirectorySearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loadingUsers, setLoadingUsers] = useState(false)

  // ─── Tab 3: Broadcast Engine States ───
  const [broadcastTitle, setBroadcastTitle] = useState('')
  const [broadcastContent, setBroadcastContent] = useState('')
  const [broadcastTarget, setBroadcastTarget] = useState('')
  const [sendingBroadcast, setSendingBroadcast] = useState(false)
  const [broadcastsLog, setBroadcastsLog] = useState<Broadcast[]>([])
  const [loadingBroadcasts, setLoadingBroadcasts] = useState(false)

  /* ────────────────────── API Call Handlers ────────────────────── */

  // Fetch Moderation Queue
  const fetchReports = useCallback(async () => {
    setLoadingReports(true)
    try {
      const res = await fetch('/api/admin/reports')
      const data = await res.json()
      if (res.ok) {
        setReports(data.reports || [])
      } else {
        showError(data.error || 'Failed to load reports')
      }
    } catch {
      showError('Network error loading reports')
    } finally {
      setLoadingReports(false)
    }
  }, [showError])

  // Approve / Reject Report
  const handleReportAction = async (reportId: string, action: 'approved' | 'rejected') => {
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId, action }),
      })
      const data = await res.json()
      if (res.ok) {
        showSuccess(`Report successfully ${action === 'approved' ? 'approved' : 'rejected'}`)
        fetchReports()
        // Refresh users directory if user was banned
        if (action === 'approved') fetchUsers()
      } else {
        showError(data.error || 'Failed to update report')
      }
    } catch {
      showError('Error updating report status')
    }
  }

  // Audit User
  const handleAuditSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auditSearch.trim()) return

    setLoadingAudit(true)
    setAuditData(null)
    setSelectedPartnerId(null)
    try {
      const res = await fetch(`/api/admin/audit?username=${encodeURIComponent(auditSearch.trim())}`)
      const data = await res.json()
      if (res.ok) {
        setAuditData(data)
        showSuccess(`Audit records loaded for @${auditSearch}`)
      } else {
        showError(data.error || 'User not found in audit logs')
      }
    } catch {
      showError('Error performing audit search')
    } finally {
      setLoadingAudit(false)
    }
  }

  // Fetch Users Directory
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true)
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(directorySearch)}&page=${page}`)
      const data = await res.json()
      if (res.ok) {
        setUsers(data.users || [])
        setTotalPages(data.totalPages || 1)
      } else {
        showError(data.error || 'Failed to load user directory')
      }
    } catch {
      showError('Error loading user directory')
    } finally {
      setLoadingUsers(false)
    }
  }, [directorySearch, page, showError])

  // Toggle user ban status
  const handleToggleBan = async (userId: string, currentBanStatus: boolean) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, is_banned: !currentBanStatus }),
      })
      const data = await res.json()
      if (res.ok) {
        showSuccess(`User has been ${!currentBanStatus ? 'banned' : 'unbanned'}`)
        fetchUsers()
        // If current audit user is this user, refresh audit data
        if (auditData?.profile.id === userId) {
          setAuditData({
            ...auditData,
            profile: {
              ...auditData.profile,
              is_banned: !currentBanStatus,
            },
          })
        }
      } else {
        showError(data.error || 'Failed to update user status')
      }
    } catch {
      showError('Error updating user ban status')
    }
  }

  // Dispatch Broadcast Notification
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!broadcastTitle.trim() || !broadcastContent.trim()) {
      showError('Title and content are required')
      return
    }

    setSendingBroadcast(true)
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: broadcastTitle.trim(),
          content: broadcastContent.trim(),
          username: broadcastTarget.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        showSuccess(
          data.type === 'global'
            ? `Broadcast sent successfully to all ${data.recipientCount} users`
            : `Targeted notification successfully sent to @${data.recipient}`
        )
        setBroadcastTitle('')
        setBroadcastContent('')
        setBroadcastTarget('')
        fetchBroadcastsLog()
      } else {
        showError(data.error || 'Failed to dispatch notification')
      }
    } catch {
      showError('Error dispatching broadcast')
    } finally {
      setSendingBroadcast(false)
    }
  }

  // Fetch Broadcasts Log
  const fetchBroadcastsLog = useCallback(async () => {
    setLoadingBroadcasts(true)
    try {
      const res = await fetch('/api/admin/broadcast')
      const data = await res.json()
      if (res.ok) {
        setBroadcastsLog(data.broadcasts || [])
      }
    } catch {
      // Fail silently for log feed
    } finally {
      setLoadingBroadcasts(false)
    }
  }, [])

  // Fetch Feedbacks Log
  const fetchFeedbacks = useCallback(async () => {
    setLoadingFeedbacks(true)
    try {
      const res = await fetch('/api/admin/feedback')
      const data = await res.json()
      if (res.ok) {
        setFeedbacks(data.feedbacks || [])
      } else {
        showError(data.error || 'Failed to load feedbacks')
      }
    } catch {
      showError('Error loading feedbacks')
    } finally {
      setLoadingFeedbacks(false)
    }
  }, [showError])

  // Fetch Universities & Applications List
  const fetchUniversitiesAndApps = useCallback(async () => {
    setLoadingUniversities(true)
    try {
      const res = await fetch('/api/admin/universities')
      const data = await res.json()
      if (res.ok) {
        setUniversities(data.universities || [])
        setApplications(data.applications || [])
      } else {
        showError(data.error || 'Failed to load university records')
      }
    } catch {
      showError('Error loading university records')
    } finally {
      setLoadingUniversities(false)
    }
  }, [showError])

  // Add University
  const handleAddUniversity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUnivName.trim() || !newUnivDomain.trim()) return

    setAddingUniv(true)
    try {
      // Upload logo if provided
      let logo_url: string | undefined
      if (newUnivLogoFile) {
        const fileExt = newUnivLogoFile.name.split('.').pop() || 'png'
        const { data: { user }, error: userErr } = await supabase.auth.getUser()
        if (userErr || !user) {
          showError('Failed to verify session: uploader not found')
          setAddingUniv(false)
          return
        }
        const filePath = `${user.id}/university_logos/${newUnivDomain.trim().replace('@','').toLowerCase()}_${Date.now()}.${fileExt}`
        const { error: uploadErr } = await supabase.storage
          .from('avatars')
          .upload(filePath, newUnivLogoFile, { upsert: true })
        if (!uploadErr) {
          const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
          logo_url = publicUrl
        } else {
          console.error('Logo upload error:', uploadErr)
          showError(`Failed to upload logo: ${uploadErr.message}`)
          setAddingUniv(false)
          return
        }
      }

      const res = await fetch('/api/admin/universities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_university',
          name: newUnivName.trim(),
          domain: newUnivDomain.trim().replace('@', '').toLowerCase(),
          logo_url,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        showSuccess(`University "${newUnivName}" added successfully!`)
        setNewUnivName('')
        setNewUnivDomain('')
        setNewUnivLogoFile(null)
        setNewUnivLogoPreview('')
        fetchUniversitiesAndApps()
      } else {
        showError(data.error || 'Failed to add university')
      }
    } catch {
      showError('Error adding university')
    } finally {
      setAddingUniv(false)
    }
  }

  // Delete University (cascade deletes all users of that university)
  const handleDeleteUniversity = async (univId: string) => {
    setDeletingUnivId(univId)
    try {
      const res = await fetch('/api/admin/universities', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: univId }),
      })
      const data = await res.json()
      if (res.ok) {
        showSuccess('University deleted and all associated users removed.')
        setConfirmDeleteUnivId(null)
        fetchUniversitiesAndApps()
        // Also refresh user directory if on that tab
        if (activeTab === 'users') fetchUsers()
      } else {
        showError(data.error || 'Failed to delete university')
      }
    } catch {
      showError('Error deleting university')
    } finally {
      setDeletingUnivId(null)
    }
  }

  // Respond to application (approve/reject)
  const handleRespondApplication = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch('/api/admin/universities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'respond_application',
          id,
          status,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        showSuccess(`Application was ${status === 'approved' ? 'approved' : 'rejected'} successfully.`)
        fetchUniversitiesAndApps()
      } else {
        showError(data.error || 'Failed to update application')
      }
    } catch {
      showError('Error updating application')
    }
  }

  // Create Test User
  const handleCreateTestUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testEmail || !testUsername || !testPassword) return
    if (testEmailError || usernameAvailability === 'taken') return

    setCreatingTestUser(true)
    try {
      const res = await fetch('/api/admin/test-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail.trim().toLowerCase(),
          username: testUsername.trim().toLowerCase(),
          password: testPassword,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        showSuccess(`Test User @${testUsername} created successfully! (Pre-verified)`)
        setTestEmail('')
        setTestUsername('')
        setTestPassword('')
        setUsernameAvailability('idle')
      } else {
        showError(data.error || 'Failed to create test user')
      }
    } catch {
      showError('Error creating test user')
    } finally {
      setCreatingTestUser(false)
    }
  }

  /* ────────────────────── Lifecycle Hooks ────────────────────── */

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReports()
    } else if (activeTab === 'users') {
      fetchUsers()
    } else if (activeTab === 'broadcast') {
      fetchBroadcastsLog()
    } else if (activeTab === 'feedback') {
      fetchFeedbacks()
    } else if (activeTab === 'universities') {
      fetchUniversitiesAndApps()
    }
  }, [activeTab, fetchReports, fetchUsers, fetchBroadcastsLog, fetchFeedbacks, fetchUniversitiesAndApps])

  // Real-time username check for test users
  useEffect(() => {
    if (!testUsername.trim() || testUsername.trim().length < 3) {
      setUsernameAvailability('idle')
      return
    }

    setUsernameAvailability('checking')
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', testUsername.trim().toLowerCase())
        .maybeSingle()

      setUsernameAvailability(data ? 'taken' : 'available')
    }, 500)

    return () => clearTimeout(timer)
  }, [testUsername])

  // Real-time email domain check for test users
  useEffect(() => {
    if (!testEmail) {
      setTestEmailError('')
      return
    }
    const domain = testEmail.split('@')[1]?.toLowerCase().trim()
    if (!domain) {
      setTestEmailError('Invalid email format')
      return
    }

    const matched = universities.find((u) => u.domain.toLowerCase() === domain)
    if (matched) {
      setTestEmailError('')
    } else {
      setTestEmailError(`Domain "@${domain}" is not a registered university.`)
    }
  }, [testEmail, universities])

  // Debounced user directory search
  useEffect(() => {
    if (activeTab === 'users') {
      setPage(1)
      const timer = setTimeout(() => {
        fetchUsers()
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [directorySearch])

  // Fetch audit results when a report is clicked / username pre-filled
  const startAudit = (username: string) => {
    setAuditSearch(username)
    setAuditData(null)
    setSelectedPartnerId(null)
    setLoadingAudit(true)
    fetch(`/api/admin/audit?username=${encodeURIComponent(username)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          showError(data.error)
        } else {
          setAuditData(data)
          showSuccess(`Auditing records for @${username}`)
        }
      })
      .catch(() => showError('Error performing audit search'))
      .finally(() => setLoadingAudit(false))
  }

  /* ────────────────────── Render Sections ────────────────────── */

  const selectedConversation = auditData?.dm_conversations.find(
    (c) => c.partner_id === selectedPartnerId
  )

  return (
    <div className="min-h-screen bg-white text-black p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e6e6e6] pb-6">
        <div>
          <h1 className="text-3xl font-[540] tracking-[-0.5px] text-[#000000]">
            Global Admin Control Panel
          </h1>
          <p className="text-sm text-[#666] mt-1 font-[320]">
            Enforce university guidelines, audit chat logs, manage student status, and dispatch broadcast notifications.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-[#f7f7f5] p-1 rounded-[12px] border border-[#e6e6e6] self-start md:self-auto flex-wrap">
          {(['reports', 'users', 'broadcast', 'feedback', 'universities', 'test-users'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                px-4 py-2 text-sm rounded-lg capitalize transition-all duration-200 cursor-pointer
                ${activeTab === tab
                  ? 'bg-ink text-canvas font-[540] shadow-sm'
                  : 'text-[#999] hover:text-ink font-[320]'
                }
              `}
            >
              {tab === 'reports'
                ? 'Moderation & Audit'
                : tab === 'users'
                ? 'User Directory'
                : tab === 'broadcast'
                ? 'Broadcasts'
                : tab === 'feedback'
                ? 'Feedback'
                : tab === 'universities'
                ? 'Universities'
                : 'Test Users'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full">
        {/* ────────────── TAB 1: REPORTS & AUDIT ────────────── */}
        {activeTab === 'reports' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* Reports Column (Left 1/3) */}
            <div className="xl:col-span-1 space-y-4">
              <h2 className="text-xl font-[540] text-black tracking-[-0.26px] flex items-center gap-2">
                <svg className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
                </svg>
                Moderation Queue
              </h2>

              {loadingReports ? (
                <div className="flex justify-center py-12">
                  <Spinner size="lg" />
                </div>
              ) : reports.length === 0 ? (
                <Card className="text-center py-12 text-[#999] border-[#e6e6e6] bg-white text-sm font-[320]">
                  No pending user reports. Excellent job!
                </Card>
              ) : (
                <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
                  {reports.map((report) => (
                    <Card
                      key={report.id}
                      padding="sm"
                      className={`
                        border transition-all
                        ${report.status === 'pending'
                          ? 'border-[#e6e6e6] bg-[#f4ecd6] text-black'
                          : report.status === 'approved'
                          ? 'border-[#e6e6e6] bg-[#efd4d4] text-black'
                          : 'border-[#e6e6e6] bg-[#c8e6cd] text-black'
                        }
                      `}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-[#666] font-[320]">
                          <span>Reported {format(new Date(report.created_at), 'MMM d, yyyy')}</span>
                          <span className={`
                            px-2 py-0.5 rounded-[50px] font-[540] uppercase text-[10px] tracking-wider border border-[#e6e6e6] bg-white/40
                            ${report.status === 'pending' ? 'text-amber-800' : ''}
                            ${report.status === 'approved' ? 'text-red-600' : ''}
                            ${report.status === 'rejected' ? 'text-[#1ea64a]' : ''}
                          `}>
                            {report.status}
                          </span>
                        </div>

                        {/* Profiles Involved */}
                        <div className="grid grid-cols-2 gap-2 text-xs border-y border-black/5 py-2">
                          <div>
                            <p className="text-[#666] mb-1 font-[320]">Reporter</p>
                            {report.reporter ? (
                              <button
                                onClick={() => startAudit(report.reporter!.username)}
                                className="flex items-center gap-1.5 hover:underline transition cursor-pointer text-left text-black"
                              >
                                <Avatar size="xs" src={report.reporter.avatar_url} name={report.reporter.username} />
                                <span className="font-[540] truncate max-w-[80px]">@{report.reporter.username}</span>
                              </button>
                            ) : (
                              <span className="text-[#999] font-[320]">Unknown</span>
                            )}
                          </div>
                          <div>
                            <p className="text-[#666] mb-1 font-[320]">Reported Offender</p>
                            {report.reported_user ? (
                              <button
                                onClick={() => startAudit(report.reported_user!.username)}
                                className="flex items-center gap-1.5 hover:underline transition cursor-pointer text-left text-black"
                              >
                                <Avatar size="xs" src={report.reported_user.avatar_url} name={report.reported_user.username} />
                                <span className="font-[540] text-red-600 truncate max-w-[80px]">@{report.reported_user.username}</span>
                              </button>
                            ) : (
                              <span className="text-[#999] font-[320]">Unknown</span>
                            )}
                          </div>
                        </div>

                        {/* Reason */}
                        <div className="text-sm bg-white/40 p-2.5 rounded-[8px] border border-black/5">
                          <p className="text-[#666] font-[540] text-xs mb-1 uppercase tracking-wider">Reason Cited:</p>
                          <p className="text-black leading-snug text-xs italic font-[320]">"{report.reason}"</p>
                        </div>

                        {/* Action buttons */}
                        {report.status === 'pending' && (
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReportAction(report.id, 'rejected')}
                              className="text-xs border border-[#e6e6e6]"
                            >
                              Reject
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleReportAction(report.id, 'approved')}
                              className="text-xs"
                            >
                              Approve & Ban
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Audit Engine Column (Right 2/3) */}
            <div className="xl:col-span-2 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-xl font-[540] text-black tracking-[-0.26px] flex items-center gap-2">
                  <svg className="h-5 w-5 text-black" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                  User Chat Audit Engine
                </h2>

                {/* Audit Search Bar */}
                <form onSubmit={handleAuditSearch} className="flex gap-2 max-w-sm w-full">
                  <Input
                    placeholder="Enter username to audit..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    inputSize="sm"
                    className="border-[#e6e6e6]"
                  />
                  <Button type="submit" size="sm" loading={loadingAudit} variant="primary">
                    Audit
                  </Button>
                </form>
              </div>

              {loadingAudit ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 bg-[#f7f7f5] rounded-[24px] border border-[#e6e6e6]">
                  <Spinner size="lg" />
                  <p className="text-sm text-[#666] font-[320]">Retrieving conversation logs and networks...</p>
                </div>
              ) : auditData ? (
                <div className="space-y-6">
                  
                  {/* User Profile Overview */}
                  <Card className="border border-[#e6e6e6] bg-white">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <Avatar size="lg" src={auditData.profile.avatar_url} name={auditData.profile.username} />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-xl font-[540] text-black">@{auditData.profile.username}</h3>
                            {auditData.profile.sethji && <Badge variant="admin">Global Admin</Badge>}
                            <span className={`px-2 py-0.5 text-[10px] font-[540] rounded-[50px] border border-[#e6e6e6] ${
                              auditData.profile.is_banned 
                                ? 'bg-[#efd4d4] text-red-600' 
                                : 'bg-[#c8e6cd] text-[#1ea64a]'
                            }`}>
                              {auditData.profile.is_banned ? 'BANNED' : 'ACTIVE'}
                            </span>
                          </div>
                          <p className="text-xs text-[#666] mt-0.5 font-[320]">{auditData.profile.email}</p>
                          <p className="text-xs text-black mt-1 font-[480]">
                            {auditData.profile.course || 'No course'} • Joined {format(new Date(auditData.profile.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>

                      {/* Global Ban/Unban Switch */}
                      {!auditData.profile.sethji && (
                        <Button
                          variant={auditData.profile.is_banned ? 'primary' : 'danger'}
                          size="sm"
                          onClick={() => handleToggleBan(auditData.profile.id, auditData.profile.is_banned)}
                        >
                          {auditData.profile.is_banned ? 'Unban User' : 'Lifetime Ban'}
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 pt-4 border-t border-[#e6e6e6] text-xs text-black">
                      <div>
                        <span className="font-[540] text-[#999] block uppercase tracking-wider mb-1">Biography</span>
                        <p className="italic bg-[#f7f7f5] p-2.5 rounded-[8px] border border-[#e6e6e6] font-[320]">
                          {auditData.profile.bio ? `"${auditData.profile.bio}"` : 'No bio set.'}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="font-[540] text-[#999] block uppercase tracking-wider mb-0.5">City</span>
                          <p className="font-[480] text-black">{auditData.profile.city || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="font-[540] text-[#999] block uppercase tracking-wider mb-0.5">Date of Birth</span>
                          <p className="font-[480] text-black">
                            {auditData.profile.dob ? format(new Date(auditData.profile.dob), 'MM/dd/yyyy') : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Audit details grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* Message Logs (Group + DMs Sent) */}
                    <Card padding="sm" className="flex flex-col h-[500px] border border-[#e6e6e6] bg-white">
                      <h4 className="text-sm font-[540] text-black mb-3 px-1">Sent Messages Feed ({auditData.messages.length})</h4>
                      {auditData.messages.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-xs text-[#999] italic font-[320]">
                          No messages sent by this user.
                        </div>
                      ) : (
                        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                          {auditData.messages.map((msg) => (
                            <div key={msg.id} className="p-2.5 rounded-[8px] bg-[#f7f7f5] border border-[#e6e6e6] text-xs">
                              <div className="flex items-center justify-between text-[10px] text-[#666] mb-1 font-[320]">
                                <span className="font-[540] text-black">
                                  {msg.context === 'group' ? `[GROUP] ${msg.group_name}` : `[DM] @${msg.recipient_username}`}
                                </span>
                                <span>{format(new Date(msg.created_at), 'MM/dd HH:mm')}</span>
                              </div>
                              {msg.media_url ? (
                                msg.message_text === '🎤 Voice Message' ? (
                                  <div className="flex flex-col gap-1 mt-1">
                                    <span className="text-[10px] text-black font-[540] flex items-center gap-1">🎤 Voice Message</span>
                                    <audio src={msg.media_url} controls className="w-full max-w-xs h-7 text-xs bg-white border border-[#e6e6e6] rounded-lg focus:outline-none" />
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setLightboxUrl(msg.media_url)}
                                    className="text-black hover:opacity-75 underline cursor-pointer text-left font-[540] inline-flex items-center gap-1.5 focus:outline-none"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    {msg.message_text || '📷 Photo'}
                                  </button>
                                )
                              ) : (
                                <p className="text-black leading-snug break-words font-[320]">
                                  {msg.message_text}
                                </p>
                              )}
                              {msg.is_anonymous && (
                                <div className="mt-1 text-[9px] text-amber-800 font-[540] italic flex items-center gap-1">
                                  <svg className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                                  </svg>
                                  Posted Anonymously (Unmasked for Admin Audit)
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>

                    {/* Friend network & 1-on-1 private chat session logs */}
                    <div className="space-y-6 flex flex-col h-[500px]">
                      
                      {/* Friends network component */}
                      <Card padding="sm" className="h-[180px] overflow-hidden flex flex-col border border-[#e6e6e6] bg-white">
                        <h4 className="text-sm font-[540] text-black mb-2 px-1">Friend Network ({auditData.friends.length})</h4>
                        {auditData.friends.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center text-xs text-[#999] italic font-[320]">
                            This user has not established any friendships yet.
                          </div>
                        ) : (
                          <div className="flex-1 overflow-y-auto flex flex-wrap gap-2.5 p-1">
                            {auditData.friends.map((friend) => (
                              <button
                                key={friend.id}
                                onClick={() => startAudit(friend.username)}
                                className="flex items-center gap-1.5 bg-[#f7f7f5] hover:bg-[#e6e6e6] border border-[#e6e6e6] rounded-full pl-1 pr-3 py-1 text-xs transition cursor-pointer text-black"
                              >
                                <Avatar size="xs" src={friend.avatar_url} name={friend.username} />
                                <span className="truncate font-[320]">@{friend.username}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </Card>

                      {/* 1-on-1 DM logs auditor */}
                      <Card padding="sm" className="flex-1 flex flex-col overflow-hidden border border-[#e6e6e6] bg-white">
                        <h4 className="text-sm font-[540] text-black mb-2 px-1">Private DM Session Auditor</h4>
                        {auditData.dm_conversations.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center text-xs text-[#999] italic font-[320]">
                            No direct message logs found for this user.
                          </div>
                        ) : (
                          <div className="flex-1 grid grid-cols-3 gap-2 overflow-hidden h-full">
                            
                            {/* Partner list */}
                            <div className="col-span-1 border-r border-[#e6e6e6] overflow-y-auto pr-1 flex flex-col gap-1">
                              {auditData.dm_conversations.map((conv) => (
                                <button
                                  key={conv.partner_id}
                                  onClick={() => setSelectedPartnerId(conv.partner_id)}
                                  className={`
                                    w-full text-left px-2 py-1.5 rounded-lg text-xs truncate transition cursor-pointer
                                    ${selectedPartnerId === conv.partner_id
                                      ? 'bg-black text-white font-[540]'
                                      : 'hover:bg-[#f7f7f5] text-[#666] font-[320]'
                                    }
                                  `}
                                >
                                  @{conv.partner_username}
                                </button>
                              ))}
                            </div>

                            {/* Chat history display */}
                            <div className="col-span-2 overflow-y-auto p-1.5 flex flex-col gap-2 bg-[#f7f7f5] rounded-[8px] border border-[#e6e6e6]">
                              {selectedConversation ? (
                                selectedConversation.messages.map((m) => {
                                  const isSentByTarget = m.sender_id === auditData.profile.id
                                  return (
                                    <div
                                      key={m.id}
                                      className={`max-w-[85%] rounded-xl p-2 text-xs flex flex-col ${
                                        isSentByTarget
                                          ? 'bg-[#1f1d3d] text-white self-end rounded-tr-none'
                                          : 'bg-white border border-[#e6e6e6] text-black self-start rounded-tl-none'
                                      }`}
                                    >
                                      {m.media_url ? (
                                        m.message_text === '🎤 Voice Message' ? (
                                          <div className="flex flex-col gap-1 mt-1 min-w-[180px]">
                                            <span className={`text-[10px] font-semibold flex items-center gap-1 ${isSentByTarget ? 'text-white' : 'text-black'}`}>🎤 Voice Message</span>
                                            <audio src={m.media_url} controls className="w-full h-7 text-xs bg-white/5 rounded-lg focus:outline-none" />
                                          </div>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => setLightboxUrl(m.media_url)}
                                            className={`underline cursor-pointer text-left font-semibold inline-flex items-center gap-1.5 focus:outline-none ${
                                              isSentByTarget
                                                ? 'text-white hover:text-purple-200'
                                                : 'text-black hover:opacity-75'
                                            }`}
                                          >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            {m.message_text || '📷 Photo'}
                                          </button>
                                        )
                                      ) : (
                                        <p className="leading-snug break-words font-[320] text-left">{m.message_text}</p>
                                      )}
                                      <span className="text-[9px] text-white/55 self-end mt-1 font-mono">
                                        {format(new Date(m.created_at), 'MM/dd HH:mm')}
                                      </span>
                                    </div>
                                  )
                                })
                              ) : (
                                <div className="h-full flex items-center justify-center text-[11px] text-[#999] italic text-center font-[320]">
                                  Select a chat partner to view conversation logs.
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </Card>

                    </div>
                  </div>

                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-[#f7f7f5] rounded-[24px] border border-dashed border-[#e6e6e6] text-center gap-3">
                  <svg className="h-10 w-10 text-[#999]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-[540] text-[#000000]">No Audited User Loaded</h3>
                    <p className="text-xs text-[#666] font-[320] mt-1">Search for a username above to pull logs or click on user buttons.</p>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ────────────── TAB 2: USER DIRECTORY ────────────── */}
        {activeTab === 'users' && (
          <Card className="border border-[#e6e6e6] bg-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-[540] text-black flex items-center gap-2">
                  <svg className="h-5 w-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Registered User Directory
                </h2>
                <p className="text-xs text-[#666] mt-0.5 font-[320]">Browse all active and banned users on the platform.</p>
              </div>

              {/* Directory Filter Search */}
              <div className="max-w-xs w-full">
                <Input
                  placeholder="Search user profile names..."
                  value={directorySearch}
                  onChange={(e) => setDirectorySearch(e.target.value)}
                  inputSize="sm"
                  className="border-[#e6e6e6]"
                />
              </div>
            </div>

            {loadingUsers ? (
              <div className="flex justify-center py-20">
                <Spinner size="lg" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-20 text-[#999] text-sm italic font-[320]">
                No users found matching search criteria.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-[12px] border border-[#e6e6e6]">
                <table className="w-full text-left text-sm text-[#000000]">
                  <thead className="bg-[#f7f7f5] text-xs font-semibold text-black uppercase tracking-wider border-b border-[#e6e6e6]">
                    <tr>
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">University Course</th>
                      <th className="px-6 py-4">Metrics</th>
                      <th className="px-6 py-4">Join Date</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e6e6e6]">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-[#f7f7f5] transition-colors">
                        <td className="px-6 py-4 font-medium text-[#000000]">
                          <div className="flex items-center gap-3">
                            <Avatar size="sm" src={u.avatar_url} name={u.username} />
                            <div>
                              <span className="font-[540]">@{u.username}</span>
                              <span className="block text-[10px] text-[#666] truncate max-w-[120px] font-[320]">
                                {u.city || 'No Location'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-[#666]">
                          {u.email || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-xs font-[320]">
                          {u.course || <span className="text-[#999]">Not specified</span>}
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <span className="px-2 py-0.5 rounded bg-[#f4ecd6] font-semibold font-mono text-black">
                            {u.message_count} messages
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-[#666] font-[320]">
                          {format(new Date(u.created_at), 'MM/dd/yyyy')}
                        </td>
                        <td className="px-6 py-4 text-xs">
                          {u.sethji ? (
                            <Badge variant="admin">Global Admin</Badge>
                          ) : (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border border-[#e6e6e6] ${
                              u.is_banned 
                                ? 'bg-[#efd4d4] text-red-600' 
                                : 'bg-[#c8e6cd] text-[#1ea64a]'
                            }`}>
                              {u.is_banned ? 'Banned' : 'Active'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setActiveTab('reports')
                                startAudit(u.username)
                              }}
                              className="text-xs border border-[#e6e6e6]"
                            >
                              Audit
                            </Button>
                            {!u.sethji && (
                              <Button
                                variant={u.is_banned ? 'primary' : 'danger'}
                                size="sm"
                                onClick={() => handleToggleBan(u.id, u.is_banned)}
                                className="text-xs"
                              >
                                {u.is_banned ? 'Unban' : 'Ban'}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 border-t border-[#e6e6e6] pt-4">
                <span className="text-xs text-[#999] font-[320]">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    className="text-xs border border-[#e6e6e6]"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    className="text-xs border border-[#e6e6e6]"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* ────────────── TAB 3: BROADCAST ENGINE ────────────── */}
        {activeTab === 'broadcast' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Dispatcher Panel */}
            <Card className="border border-[#e6e6e6] bg-white">
              <h2 className="text-xl font-[540] text-black mb-6 flex items-center gap-2">
                <svg className="h-5 w-5 text-black" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" clipRule="evenodd" />
                </svg>
                Broadcast Engine
              </h2>

              <form onSubmit={handleSendBroadcast} className="space-y-4">
                <Input
                  label="Notification Title"
                  placeholder="e.g. Server Maintenance or Weekly Announcement"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  required
                />

                <div>
                  <label className="mb-1.5 block text-sm font-[480] text-black">
                    Notification Content
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Provide detailed context regarding the notification..."
                    value={broadcastContent}
                    onChange={(e) => setBroadcastContent(e.target.value)}
                    className="w-full bg-white text-black placeholder-[#999] border border-[#e6e6e6] rounded-[8px] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black hover:border-[#ccc] transition-all duration-200 font-[320]"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-[480] text-black">
                    Target Username (Optional)
                  </label>
                  <Input
                    placeholder="Specify username for direct alert; leave blank for ALL site members"
                    value={broadcastTarget}
                    onChange={(e) => setBroadcastTarget(e.target.value)}
                    helperText="If targeted, the notification header will automatically append 'Social Media Team'."
                  />
                </div>

                <Button type="submit" fullWidth loading={sendingBroadcast} variant="primary">
                  {broadcastTarget.trim() ? 'Send Targeted Push' : 'Send Global Broadcast Push'}
                </Button>
              </form>
            </Card>

            {/* Broadcast Log */}
            <Card padding="sm" className="border border-[#e6e6e6] bg-white flex flex-col h-[520px]">
              <h3 className="text-sm font-[540] text-black mb-4 px-1 flex items-center justify-between">
                <span>Dispatched Logs Feed (Recent)</span>
                <button
                  onClick={fetchBroadcastsLog}
                  className="text-xs text-black hover:opacity-75 transition cursor-pointer"
                >
                  Refresh
                </button>
              </h3>

              {loadingBroadcasts ? (
                <div className="flex-1 flex items-center justify-center">
                  <Spinner size="lg" />
                </div>
              ) : broadcastsLog.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-xs text-[#999] italic font-[320]">
                  No alerts have been dispatched recently.
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                  {broadcastsLog.map((log) => (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-[12px] bg-[#f7f7f5] border border-[#e6e6e6] text-xs hover:border-[#ccc] transition-all text-left"
                    >
                      <div className="flex items-center justify-between text-[10px] text-[#999] mb-1.5 font-[320]">
                        <span className={`px-2 py-0.5 rounded-[50px] font-bold uppercase tracking-wider text-[9px] border border-[#e6e6e6] ${
                          log.type === 'global'
                            ? 'bg-[#dceeb1] text-[#000000]'
                            : 'bg-[#c5b0f4] text-[#000000]'
                        }`}>
                          {log.type === 'global' ? 'Global Broadcast' : `Targeted: @${log.recipient_username}`}
                        </span>
                        <span>{format(new Date(log.created_at), 'MM/dd/yyyy HH:mm')}</span>
                      </div>
                      <h4 className="font-semibold text-[#000000] text-sm mb-1">{log.title}</h4>
                      <p className="text-[#666] font-[320] leading-snug">{log.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

          </div>
        )}

        {/* ────────────── TAB 4: USER FEEDBACK ────────────── */}
        {activeTab === 'feedback' && (
          <Card className="border border-[#e6e6e6] bg-white flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between mb-6 px-1">
              <div>
                <h2 className="text-xl font-[540] text-black flex items-center gap-2">
                  <svg className="h-5 w-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  User Bugs & Feedback Logs
                </h2>
                <p className="text-xs text-[#666] mt-0.5 font-[320]">Review bug reports and improvement feedback submitted by students.</p>
              </div>
              <button
                onClick={fetchFeedbacks}
                disabled={loadingFeedbacks}
                className="text-xs text-black hover:opacity-75 transition cursor-pointer disabled:opacity-50"
              >
                Refresh
              </button>
            </div>

            {loadingFeedbacks ? (
              <div className="flex-1 flex items-center justify-center py-20">
                <Spinner size="lg" />
              </div>
            ) : feedbacks.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-20 text-[#999] text-sm italic font-[320]">
                No user feedback submitted yet.
              </div>
            ) : (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                {feedbacks.map((item) => (
                  <Card key={item.id} padding="md" className="border border-[#e6e6e6] bg-white text-left">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between text-xs text-[#666] font-[320]">
                        <div className="flex items-center gap-2">
                          <Avatar size="sm" src={item.profile?.avatar_url} name={item.profile?.username} />
                          <span className="font-semibold text-black">@{item.profile?.username || 'unknown'}</span>
                        </div>
                        <span>Submitted {format(new Date(item.created_at), 'MMM d, yyyy HH:mm')}</span>
                      </div>
                      <div className="text-sm bg-[#f7f7f5] p-3 rounded-[8px] border border-[#e6e6e6] whitespace-pre-wrap leading-relaxed text-black font-[320]">
                        {item.content}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* ────────────── TAB 5: UNIVERSITIES ────────────── */}
        {activeTab === 'universities' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Add University Form (Left 1/3) */}
              <div className="lg:col-span-1 space-y-4">
                <Card className="border border-[#e6e6e6] bg-white">
                  <h3 className="text-lg font-[540] text-black mb-4 flex items-center gap-2">
                    <svg className="h-5 w-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Register University
                  </h3>
                  <form onSubmit={handleAddUniversity} className="space-y-4">
                    <Input
                      label="University Name"
                      placeholder="e.g. Galgotias University"
                      value={newUnivName}
                      onChange={(e) => setNewUnivName(e.target.value)}
                      required
                    />
                    <Input
                      label="Email Domain"
                      placeholder="e.g. galgotiasuniversity.edu"
                      value={newUnivDomain}
                      onChange={(e) => setNewUnivDomain(e.target.value)}
                      helperText="Domain format: school.edu (do not include @)"
                      required
                    />
                    {/* Logo Upload */}
                    <div>
                      <label className="mb-1.5 block text-sm font-[480] text-black">University Logo (Optional)</label>
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-full bg-[#f7f7f5] border-2 border-dashed border-[#e6e6e6] flex items-center justify-center shrink-0 overflow-hidden">
                          {newUnivLogoPreview ? (
                            <img src={newUnivLogoPreview} alt="Logo preview" className="h-full w-full object-cover" />
                          ) : (
                            <svg className="w-6 h-6 text-[#999]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          )}
                        </div>
                        <label className="flex-1 cursor-pointer">
                          <div className="w-full py-2 px-4 rounded-xl border border-[#e6e6e6] bg-white hover:bg-[#f7f7f5] text-sm text-[#666] hover:text-[#000000] transition-all text-center">
                            {newUnivLogoFile ? newUnivLogoFile.name : 'Click to upload logo'}
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                setNewUnivLogoFile(file)
                                setNewUnivLogoPreview(URL.createObjectURL(file))
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                    <Button type="submit" fullWidth loading={addingUniv} variant="primary">
                      Add University
                    </Button>
                  </form>
                </Card>
              </div>

              {/* Active Universities List (Right 2/3) */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="border border-[#e6e6e6] bg-white h-full flex flex-col">
                  <h3 className="text-lg font-[540] text-black mb-4 flex items-center gap-2">
                    <svg className="h-5 w-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Active Registered Universities
                  </h3>
                  {loadingUniversities ? (
                    <div className="flex-1 flex justify-center items-center py-12">
                      <Spinner size="lg" />
                    </div>
                  ) : universities.length === 0 ? (
                    <div className="flex-1 flex justify-center items-center text-sm text-[#999] italic py-12 font-[320]">
                      No universities registered yet.
                    </div>
                  ) : (
                    <div className="flex-1 overflow-x-auto rounded-xl border border-[#e6e6e6] max-h-[350px]">
                      <table className="w-full text-left text-sm text-[#000000]">
                        <thead className="bg-[#f7f7f5] text-xs font-semibold text-black uppercase tracking-wider border-b border-[#e6e6e6]">
                          <tr>
                            <th className="px-4 py-3">Logo</th>
                            <th className="px-4 py-3">Name</th>
                            <th className="px-4 py-3">Domain</th>
                            <th className="px-4 py-3">Registered At</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e6e6e6]">
                          {universities.map((univ) => (
                            <tr key={univ.id} className="hover:bg-[#f7f7f5] transition-colors">
                              <td className="px-4 py-3">
                                <div className="h-9 w-9 rounded-full overflow-hidden border border-[#e6e6e6] bg-black/5 flex items-center justify-center text-[11px] font-bold text-black">
                                  {univ.logo_url ? (
                                    <img src={univ.logo_url} alt={univ.name} className="h-full w-full object-cover" />
                                  ) : (
                                    univ.name.charAt(0).toUpperCase()
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 font-semibold text-[#000000]">
                                {univ.name}
                              </td>
                              <td className="px-4 py-3 font-mono text-xs text-black">
                                @{univ.domain}
                              </td>
                              <td className="px-4 py-3 text-xs text-[#999] font-[320]">
                                {univ.created_at ? format(new Date(univ.created_at), 'MM/dd/yyyy') : 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => setConfirmDeleteUnivId(univ.id)}
                                  disabled={deletingUnivId === univ.id}
                                  className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50 cursor-pointer flex justify-end ml-auto"
                                  title="Delete university and all its users"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              </div>
            </div>

            {/* University Applications Table (Full Width) */}
            <Card className="border border-[#e6e6e6] bg-white">
              <h3 className="text-lg font-[540] text-black mb-4 flex items-center gap-2">
                <svg className="h-5 w-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                University Expansion Requests
              </h3>
              {loadingUniversities ? (
                <div className="flex justify-center py-12">
                  <Spinner size="lg" />
                </div>
              ) : applications.length === 0 ? (
                <div className="text-center text-sm text-[#999] italic py-12 font-[320]">
                  No university expansion applications submitted yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#e6e6e6]">
                  <table className="w-full text-left text-sm text-[#000000]">
                    <thead className="bg-[#f7f7f5] text-xs font-semibold text-black uppercase tracking-wider border-b border-[#e6e6e6]">
                      <tr>
                        <th className="px-6 py-4">University Name</th>
                        <th className="px-6 py-4">Suggested Domain</th>
                        <th className="px-6 py-4">Requester Contact</th>
                        <th className="px-6 py-4">Submitted At</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e6e6e6]">
                      {applications.map((app) => (
                        <tr key={app.id} className="hover:bg-[#f7f7f5] transition-colors">
                          <td className="px-6 py-4 font-semibold text-[#000000]">
                            {app.name}
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-black">
                            @{app.domain}
                          </td>
                          <td className="px-6 py-4 text-xs text-[#666] font-[320]">
                            {app.contact_email}
                          </td>
                          <td className="px-6 py-4 text-xs text-[#999] font-[320]">
                            {app.created_at ? format(new Date(app.created_at), 'MM/dd/yyyy HH:mm') : 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-xs">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              app.status === 'pending'
                                ? 'bg-[#f4ecd6] text-amber-800 border-[#e6e6e6]'
                                : app.status === 'approved'
                                ? 'bg-[#c8e6cd] text-[#1ea64a] border-[#e6e6e6]'
                                : 'bg-[#efd4d4] text-red-600 border-[#e6e6e6]'
                            }`}>
                              {app.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {app.status === 'pending' ? (
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRespondApplication(app.id, 'rejected')}
                                  className="text-xs border border-[#e6e6e6] text-red-600 hover:bg-red-50"
                                >
                                  Reject
                                </Button>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleRespondApplication(app.id, 'approved')}
                                  className="text-xs"
                                >
                                  Approve
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-[#999] italic font-[320]">Resolved</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Delete University Confirmation Modal */}
        {confirmDeleteUnivId && (() => {
          const univ = universities.find(u => u.id === confirmDeleteUnivId)
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in p-4">
              <div className="bg-white border border-[#e6e6e6] rounded-[24px] p-6 max-w-sm w-full shadow-2xl animate-scale-in">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-red-50 flex items-center justify-center border border-red-200">
                    <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-[540] text-[#000000] mb-1">Delete {univ?.name}?</h4>
                    <p className="text-xs text-[#666] leading-relaxed font-[320]">
                      This will permanently delete <span className="text-red-600 font-semibold">all students</span> registered with <span className="text-black font-mono">@{univ?.domain}</span> — including their profiles, messages, friendships, and all associated data. <span className="text-red-600 font-bold">This cannot be undone.</span>
                    </p>
                  </div>
                  <div className="flex gap-3 w-full">
                    <Button
                      variant="ghost"
                      fullWidth
                      onClick={() => setConfirmDeleteUnivId(null)}
                      disabled={deletingUnivId === confirmDeleteUnivId}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      fullWidth
                      loading={deletingUnivId === confirmDeleteUnivId}
                      onClick={() => handleDeleteUniversity(confirmDeleteUnivId)}
                    >
                      Delete Everything
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* ────────────── TAB 6: TEST USERS ────────────── */}
        {activeTab === 'test-users' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <Card className="border border-[#e6e6e6] bg-white text-left">
              <div className="mb-6">
                <h3 className="text-xl font-[540] text-black flex items-center gap-2">
                  <svg className="h-5 w-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Generate Pre-Verified Test Account
                </h3>
                <p className="text-xs text-[#666] mt-1 font-[320]">
                  Create pre-verified, immediately active accounts for testing. These accounts are bound to a registered university domain, bypass standard email verification, but have all password-modification paths permanently blocked.
                </p>
              </div>

              <form onSubmit={handleCreateTestUser} className="space-y-4">
                {/* Username Input with Validation */}
                <div className="space-y-1">
                  <Input
                    label="Testing Username"
                    placeholder="e.g. teststudent"
                    value={testUsername}
                    onChange={(e) => setTestUsername(e.target.value)}
                    required
                  />
                  <div className="text-xs mt-1 flex items-center gap-1.5">
                    {usernameAvailability === 'checking' && (
                      <span className="text-[#666] flex items-center gap-1 font-[320]">
                        <Spinner size="sm" /> Checking availability...
                      </span>
                    )}
                    {usernameAvailability === 'available' && (
                      <span className="text-[#1ea64a] font-semibold flex items-center gap-1 font-[540]">
                        ✓ Username is available
                      </span>
                    )}
                    {usernameAvailability === 'taken' && (
                      <span className="text-red-600 font-semibold flex items-center gap-1 font-[540]">
                        ✗ Username is already taken
                      </span>
                    )}
                  </div>
                </div>

                {/* Email Input with Validation */}
                <div className="space-y-1">
                  <Input
                    label="Testing Email Address"
                    placeholder="e.g. testuser@gla.ac.in"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    required
                  />
                  {testEmailError ? (
                    <p className="text-xs text-red-600 font-semibold mt-1 font-[540]">
                      ✗ {testEmailError}
                    </p>
                  ) : testEmail && !testEmailError ? (
                    <p className="text-xs text-[#1ea64a] font-semibold mt-1 font-[540]">
                      ✓ Valid university domain matched
                    </p>
                  ) : null}
                </div>

                {/* Password Input */}
                <Input
                  label="Password"
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={testPassword}
                  onChange={(e) => setTestPassword(e.target.value)}
                  required
                />

                <div className="pt-2">
                  <Button
                    type="submit"
                    fullWidth
                    loading={creatingTestUser}
                    disabled={
                      !testEmail ||
                      !testUsername ||
                      !testPassword ||
                      !!testEmailError ||
                      usernameAvailability !== 'available' ||
                      testPassword.length < 6
                    }
                    variant="primary"
                  >
                    Generate Test User Account
                  </Button>
                </div>
              </form>
            </Card>

            <Card className="border border-[#e6e6e6] bg-[#f4ecd6] p-4 text-xs text-amber-800 font-[320] text-left">
              <strong className="block text-black font-bold mb-1">⚠️ Important Testing Rules:</strong>
              <ul className="list-disc pl-4 space-y-1">
                <li>Testing accounts automatically inherit their respective university's core system groups.</li>
                <li>They can participate normally in conversations, confession rooms, and group creations.</li>
                <li>To maintain account security and prevent lockouts, testing accounts <strong>cannot</strong> reset their passwords via Forgot Password or change their password via the profile settings.</li>
              </ul>
            </Card>
          </div>
        )}

      </div>

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightboxUrl(null)}
        >
          {/* Top Control Bar */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
            <span className="text-xs text-white font-[480] select-none bg-black/75 px-3.5 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Audited Media
            </span>
            <div className="flex items-center gap-3">
              <button 
                onClick={(e) => {
                  e.stopPropagation()
                  handleDownload(lightboxUrl)
                }}
                className="p-2.5 rounded-full bg-white/10 border border-white/15 text-white hover:bg-white/20 hover:border-white/25 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                title="Download image"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              <button 
                onClick={() => setLightboxUrl(null)}
                className="p-2.5 rounded-full bg-white/10 border border-white/15 text-white hover:bg-white/20 hover:border-white/25 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Full Screen Image */}
          <div className="relative max-w-full max-h-[85vh] md:max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxUrl}
              alt="Full-size shared media"
              className="max-w-full max-h-[80vh] md:max-h-[85vh] object-contain rounded-lg shadow-2xl select-none"
            />
          </div>
        </div>
      )}
    </div>
  )
}
