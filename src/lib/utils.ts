import { ROLE_COLORS, ROLE_BADGE_COLORS } from '@/lib/constants'

/**
 * Format a date string to HH:MM (24-hour).
 */
export function formatTime(date: string): string {
  const d = new Date(date)
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/**
 * Format a date string to a human-readable date.
 * e.g. "22 May 2026"
 */
export function formatDate(date: string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Format a date string relative to now.
 * e.g. "2m ago", "3h ago", "Yesterday", "22 May"
 */
export function formatRelativeTime(date: string): string {
  const now = new Date()
  const d = new Date(date)
  const diffMs = now.getTime() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay === 1) return 'Yesterday'
  if (diffDay < 7) return `${diffDay}d ago`
  return formatDate(date)
}

/**
 * Get 2-letter initials from a name / username.
 * e.g. "John Doe" → "JD", "alice" → "AL"
 */
export function getInitials(name: string): string {
  if (!name) return '??'

  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

/**
 * Get the Tailwind text color class for a group role.
 */
export function getRoleColor(role: string): string {
  return ROLE_COLORS[role as keyof typeof ROLE_COLORS] ?? ROLE_COLORS.member
}

/**
 * Get the Tailwind badge background color class for a group role.
 */
export function getRoleBadgeColor(role: string): string {
  return ROLE_BADGE_COLORS[role as keyof typeof ROLE_BADGE_COLORS] ?? ROLE_BADGE_COLORS.member
}

/**
 * Merge class names, filtering out falsy values.
 * A lightweight alternative to clsx/classnames.
 */
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

/**
 * Truncate text to a maximum length, appending "…" if truncated.
 */
export function truncateText(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max).trimEnd() + '…'
}

/**
 * Create a debounced version of a function.
 * The debounced function delays invoking `fn` until after `delay` ms
 * have elapsed since the last invocation.
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delay)
  }
}

// ---- Image Compression Helpers ----

export interface CompressImageOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  type?: 'image/jpeg' | 'image/png' | 'image/webp'
}

/**
 * Compress an image file using OffscreenCanvas / Canvas.
 * Returns a compressed Blob.
 */
export async function compressImage(
  file: File,
  options: CompressImageOptions = {}
): Promise<Blob> {
  const {
    maxWidth = 2048,
    maxHeight = 2048,
    quality = 0.92,
    type = 'image/webp',
  } = options

  return new Promise<Blob>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img

      // Scale proportionally
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Canvas toBlob returned null'))
          }
        },
        type,
        quality
      )
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Format a last_seen timestamp.
 * If offline: show last seen in hour and minute format (24-hour style),
 * and if greater than 24 hours, show the date of last seen.
 */
export function formatLastSeen(lastSeenStr: string | null | undefined): string {
  if (!lastSeenStr) return 'recently'
  const lastSeen = new Date(lastSeenStr)
  const now = new Date()
  const diffMs = now.getTime() - lastSeen.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)

  if (diffHours < 24) {
    return lastSeen.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  } else {
    return lastSeen.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }
}

/**
 * Format a timestamp into a friendly date group header.
 * e.g. "Today", "Yesterday", or "12 May 2026"
 */
export function formatGroupDate(dateString: string): string {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  } else {
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }
}

