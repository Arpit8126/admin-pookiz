'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Spinner } from '@/components/ui'
import AdminDashboard from '@/components/AdminDashboard'

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  async function checkUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('sethji')
          .eq('id', user.id)
          .maybeSingle()

        if (profile?.sethji) {
          setIsAdmin(true)
        } else {
          // Force logout for non-admins
          await supabase.auth.signOut()
          setIsAdmin(false)
        }
      } else {
        setIsAdmin(false)
      }
    } catch {
      setIsAdmin(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkUser()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoginLoading(true)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })

      if (signInError) {
        setError(signInError.message)
        setLoginLoading(false)
        return
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('sethji')
          .eq('id', data.user.id)
          .maybeSingle()

        if (profile?.sethji) {
          setIsAdmin(true)
        } else {
          await supabase.auth.signOut()
          setError('Access Denied: You do not have administrator privileges.')
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleLogout = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    setIsAdmin(false)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white text-black">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm font-medium text-gray-500 font-sans">Verifying security credentials...</p>
        </div>
      </div>
    )
  }

  // Render Admin Dashboard directly if authenticated
  if (isAdmin) {
    return (
      <div className="min-h-screen bg-white">
        {/* Top bar with a logout option */}
        <header className="flex items-center justify-between px-6 py-4 bg-[#141414] text-white border-b border-[#262626]">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold tracking-tight">Pookiz Staff Portal</span>
            <span className="text-xs bg-white/10 px-2 py-0.5 rounded-[50px] uppercase font-mono">Verified Admin</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs font-semibold px-4 py-2 bg-transparent text-white border border-white/20 rounded-full hover:bg-white/10 transition-all cursor-pointer"
          >
            Log out
          </button>
        </header>
        <AdminDashboard />
      </div>
    )
  }

  // Otherwise, render a clean, high-premium Login page
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f7f7f5] px-4 py-12">
      <div className="w-full max-w-md space-y-8 rounded-[24px] bg-white border border-[#e6e6e6] p-8 shadow-[0_4px_16px_rgba(0,0,0,0.04)] animate-scale-in">
        <div className="text-center">
          <span className="inline-block text-[11px] font-semibold text-black uppercase tracking-wider bg-[#dceeb1] px-3 py-1 rounded-[50px] mb-3">
            Internal Staff Access
          </span>
          <h2 className="text-2xl font-[540] text-[#000000] tracking-[-0.5px]">Pookiz Admin Login</h2>
          <p className="text-xs text-[#666] mt-1.5 font-[320] leading-relaxed">
            Authorized personnel only. Access is monitored and logged.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-[8px] bg-[#efd4d4] border border-[#e53e3e]/20 animate-scale-in">
            <p className="text-[#e53e3e] text-xs font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-[540] text-black mb-1.5 uppercase tracking-wider font-mono">
              Admin Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. admin@pookiz.codeshastra.tech"
              className="w-full px-4 py-3 bg-white border border-[#e6e6e6] rounded-[8px] text-black placeholder-[#999] focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10 hover:border-gray-300 transition-all text-sm font-[320]"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-[540] text-black uppercase tracking-wider font-mono">
                Secret Passcode
              </label>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter secret passcode"
                className="w-full px-4 py-3 pr-10 bg-white border border-[#e6e6e6] rounded-[8px] text-black placeholder-[#999] focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10 hover:border-gray-300 transition-all text-sm font-[320]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#000000] transition-colors"
              >
                {showPassword ? (
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loginLoading}
            className="w-full py-3.5 px-4 rounded-[50px] font-medium text-white bg-black hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 transform active:scale-[0.98] text-sm tracking-wide"
          >
            {loginLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Verifying...
              </span>
            ) : (
              'Verify & Authorize'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
