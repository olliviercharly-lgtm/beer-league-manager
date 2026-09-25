import { createClient } from '@supabase/supabase-js'

// Client "admin" : utilise la clé service_role, qui contourne les
// sécurités RLS. À n'utiliser QUE côté serveur (API routes), jamais
// dans un composant "use client" ou exposé au navigateur.
export function createAdminClient() {
  return createClient(
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
