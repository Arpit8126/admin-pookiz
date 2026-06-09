import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

/**
 * Creates a Supabase client with the service_role key.
 * ⚠️  SERVER-ONLY — never expose the service role key to the browser.
 *
 * Use this for admin operations that bypass Row Level Security,
 * such as user management, data migrations, or background jobs.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
