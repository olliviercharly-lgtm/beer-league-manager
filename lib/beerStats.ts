import type { createClient } from '@/lib/supabase/client'

type BrowserClient = ReturnType<typeof createClient>

// Classement des packs de bières : un pack compte quand le joueur était présent,
// s'était proposé pour ramener le pack, et que l'entraînement est passé.
// La saison démarre le 1er août (saison 2026-2027 = août 2026 → juillet 2027).

export function seasonStart(now = new Date()): Date {
  const year = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1
  return new Date(year, 7, 1)
}

export function seasonLabel(now = new Date()): string {
  const start = seasonStart(now).getFullYear()
  return `${start}-${start + 1}`
}

/** Nombre de packs ramenés par joueur sur la saison en cours (option : un seul joueur). */
export async function loadBeerCounts(supabase: BrowserClient, playerId?: string): Promise<Record<string, number>> {
  const now = new Date()
  const [trainingsRes, attendanceRes] = await Promise.all([
    supabase
      .from('trainings')
      .select('id')
      .gte('date_time', seasonStart(now).toISOString())
      .lt('date_time', now.toISOString()),
    (() => {
      let q = supabase
        .from('attendance')
        .select('player_id, training_id')
        .eq('status', 'present')
        .eq('brings_beer', true)
      if (playerId) q = q.eq('player_id', playerId)
      return q
    })(),
  ])

  // Colonne brings_beer absente ou erreur : pas de classement, sans casser la page
  if (trainingsRes.error || attendanceRes.error) return {}

  const pastIds = new Set((trainingsRes.data || []).map((t: { id: string }) => t.id))
  const counts: Record<string, number> = {}
  ;(attendanceRes.data || []).forEach((a: { player_id: string; training_id: string }) => {
    if (!pastIds.has(a.training_id)) return
    counts[a.player_id] = (counts[a.player_id] || 0) + 1
  })
  return counts
}

export function packsLabel(n: number) {
  return `${n} pack${n > 1 ? 's' : ''}`
}
