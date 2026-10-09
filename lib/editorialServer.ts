import { createAdminClient } from '@/lib/supabase/admin'
import { resolveEditorial, type EditorialSettings } from '@/lib/editorial'

// À n'utiliser que côté serveur (API routes) : lit les réglages de la Salle de rédaction d'une ligue.
export async function loadEditorial(leagueId: string | null | undefined): Promise<EditorialSettings> {
  if (!leagueId) return resolveEditorial(null)
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('leagues')
      .select('editorial_settings')
      .eq('id', leagueId)
      .single()
    if (error) return resolveEditorial(null)
    return resolveEditorial(data?.editorial_settings)
  } catch {
    return resolveEditorial(null)
  }
}
