import webPush from 'web-push'
import fs from 'fs'
import path from 'path'
import { createAdminClient } from '@/lib/supabase/admin'

interface VapidKeys {
  publicKey: string
  privateKey: string
}

let cachedKeys: VapidKeys | null = null

export function getVapidKeys(): VapidKeys {
  if (cachedKeys) return cachedKeys

  // 1. Check environment variables first
  if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    cachedKeys = {
      publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
    }
    return cachedKeys
  }

  // 2. Fallback: Load or generate a persistent set of keys locally
  const keysFilePath = path.join(process.cwd(), 'src', 'lib', 'push-keys.json')

  try {
    if (fs.existsSync(keysFilePath)) {
      const fileContent = fs.readFileSync(keysFilePath, 'utf8')
      cachedKeys = JSON.parse(fileContent)
      if (cachedKeys?.publicKey && cachedKeys?.privateKey) {
        return cachedKeys
      }
    }
  } catch (err) {
    console.error('Failed to read push-keys.json:', err)
  }

  // Generate new keys
  console.log('Generating dynamic VAPID keys for Pookiz Web Push...')
  const newKeys = webPush.generateVAPIDKeys()
  cachedKeys = {
    publicKey: newKeys.publicKey,
    privateKey: newKeys.privateKey,
  }

  // Save them to file so they persist across Hot Module Reloads and restarts
  try {
    const dirPath = path.dirname(keysFilePath)
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }
    fs.writeFileSync(keysFilePath, JSON.stringify(cachedKeys, null, 2), 'utf8')
  } catch (err) {
    console.error('Failed to write push-keys.json:', err)
  }

  return cachedKeys
}

// Helper to send a push notification
export async function sendPushNotification(
  subscription: any,
  payload: { title: string; body: string; url?: string }
): Promise<any> {
  const keys = getVapidKeys()
  
  webPush.setVapidDetails(
    'mailto:support@pookiz.codeshastra.tech',
    keys.publicKey,
    keys.privateKey
  )

  try {
    return await webPush.sendNotification(subscription, JSON.stringify(payload))
  } catch (err: any) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      throw new Error('SUB_EXPIRED')
    }
    throw err
  }
}

// Global dispatcher that retrieves user subscriptions and triggers push notifications
export async function triggerPushNotification(
  recipientId: string,
  payload: { title: string; body: string; url?: string },
  context?: { type: 'group' | 'dm'; id: string }
): Promise<void> {
  try {
    const admin = createAdminClient() as any

    // 1. Check if user is currently online (active in the last 45 seconds)
    //    If they are actively using the website, skip push notifications
    const { data: profile } = await admin
      .from('profiles')
      .select('last_seen')
      .eq('id', recipientId)
      .single()

    if (profile?.last_seen) {
      const lastSeenMs = new Date(profile.last_seen).getTime()
      const nowMs = Date.now()
      const secondsAgo = (nowMs - lastSeenMs) / 1000
      if (secondsAgo < 45) {
        // User is online — no push needed, they'll see it in-app
        return
      }
    }

    // 2. Check per-context device mute preference
    if (context?.id) {
      const defaultMuteDevice = context.type === 'group' ? true : false
      const { data: pref } = await admin
        .from('notification_preferences')
        .select('mute_device, notify_all_messages')
        .eq('user_id', recipientId)
        .eq('context_type', context.type)
        .eq('context_id', context.id)
        .maybeSingle()

      const isMuted = pref?.mute_device ?? defaultMuteDevice
      const notifyAll = pref?.notify_all_messages ?? false

      if (context.type === 'group') {
        const isTagOrReply = payload.title === 'Tagged in Message' || payload.title === 'Replied to your Message'
        if (isTagOrReply) {
          if (isMuted) {
            // User has muted tagged/replied notifications for this group
            return
          }
        } else {
          // General group message
          if (!notifyAll) {
            // User did not enable All Messages notifications for this group
            return
          }
        }
      } else if (context.type === 'dm') {
        if (isMuted) {
          return
        }
      }
    }

    // 3. Fetch all push subscriptions for the recipient
    const { data: subscriptions, error } = await admin
      .from('push_subscriptions')
      .select('id, subscription')
      .eq('user_id', recipientId)

    if (error) throw error
    if (!subscriptions || subscriptions.length === 0) return

    // 4. Dispatch push notifications in parallel
    const promises = subscriptions.map(async (subRow: any) => {
      try {
        await sendPushNotification(subRow.subscription, payload)
      } catch (err: any) {
        // If subscription is expired (404/410), delete it from DB
        if (err.message === 'SUB_EXPIRED') {
          console.log(`Deleting expired push subscription: ${subRow.id}`)
          await admin.from('push_subscriptions').delete().eq('id', subRow.id)
        } else {
          console.error(`Failed to send push to subscription ${subRow.id}:`, err.message)
        }
      }
    })

    await Promise.allSettled(promises)
  } catch (err: any) {
    console.error('Error in triggerPushNotification:', err.message)
  }
}

export async function triggerDismissNotification(
  recipientId: string,
  url: string
): Promise<void> {
  try {
    const admin = createAdminClient() as any

    // Check if user is currently online (active in the last 45 seconds)
    // If they are actively using the website, skip sending the push
    const { data: profile } = await admin
      .from('profiles')
      .select('last_seen')
      .eq('id', recipientId)
      .single()

    if (profile?.last_seen) {
      const lastSeenMs = new Date(profile.last_seen).getTime()
      const nowMs = Date.now()
      const secondsAgo = (nowMs - lastSeenMs) / 1000
      if (secondsAgo < 45) {
        // User is online — active tab handles dismissal instantly via DB subscription
        return
      }
    }

    const { data: subscriptions, error } = await admin
      .from('push_subscriptions')
      .select('id, subscription')
      .eq('user_id', recipientId)

    if (error) throw error
    if (!subscriptions || subscriptions.length === 0) return

    const payload = {
      title: 'dismiss',
      body: 'dismiss',
      type: 'dismiss',
      url,
    }

    const promises = subscriptions.map(async (subRow: any) => {
      try {
        await sendPushNotification(subRow.subscription, payload)
      } catch (err: any) {
        if (err.message === 'SUB_EXPIRED') {
          console.log(`Deleting expired push subscription during dismiss: ${subRow.id}`)
          await admin.from('push_subscriptions').delete().eq('id', subRow.id)
        } else {
          console.error(`Failed to send dismiss push to subscription ${subRow.id}:`, err.message)
        }
      }
    })

    await Promise.allSettled(promises)
  } catch (err: any) {
    console.error('Error in triggerDismissNotification:', err.message)
  }
}

export async function sendNotification(
  recipientId: string,
  payload: { title: string; body: string; url?: string },
  context?: { type: 'group' | 'dm'; id: string }
): Promise<void> {
  try {
    const admin = createAdminClient() as any

    // Check if recipient is online and actively viewing this chat
    const { data: profile } = await admin
      .from('profiles')
      .select('active_chat_id, last_seen')
      .eq('id', recipientId)
      .single()

    let isUserOnline = false
    if (profile?.last_seen) {
      const lastSeenMs = new Date(profile.last_seen).getTime()
      const nowMs = Date.now()
      const secondsAgo = (nowMs - lastSeenMs) / 1000
      if (secondsAgo < 45) {
        isUserOnline = true
      }
    }

    if (isUserOnline && profile?.active_chat_id && context) {
      if (context.type === 'group' && profile.active_chat_id === context.id) {
        // Recipient is actively viewing this group chat — suppress notifications completely
        return
      }
      if (context.type === 'dm' && profile.active_chat_id === `dm-${context.id}`) {
        // Recipient is actively viewing this DM thread — suppress notifications completely
        return
      }
    }

    // 1. Check website notification preference
    let shouldInsertWebsite = true
    if (context?.id) {
      const { data: pref } = await admin
        .from('notification_preferences')
        .select('mute_website, notify_all_messages_website')
        .eq('user_id', recipientId)
        .eq('context_type', context.type)
        .eq('context_id', context.id)
        .maybeSingle()

      if (context.type === 'group') {
        const isTagOrReply = payload.title === 'Tagged in Message' || payload.title === 'Replied to your Message'
        if (isTagOrReply) {
          shouldInsertWebsite = !(pref?.mute_website ?? false)
        } else {
          // General group message
          shouldInsertWebsite = pref?.notify_all_messages_website ?? false
        }
      } else if (context.type === 'dm') {
        shouldInsertWebsite = !(pref?.mute_website ?? false)
      }
    }

    // 2. Insert into notifications table (website) if allowed
    if (shouldInsertWebsite) {
      const { error: notifErr } = await admin.from('notifications').insert({
        recipient_id: recipientId,
        title: payload.title,
        content: payload.body,
        is_broadcast: false,
        is_read: false,
      })
      if (notifErr) {
        console.error('Failed to insert website notification in sendNotification:', notifErr)
      }
    }

    // 3. Trigger device push notification
    await triggerPushNotification(recipientId, payload, context)
  } catch (err: any) {
    console.error('Error in sendNotification:', err.message)
  }
}

