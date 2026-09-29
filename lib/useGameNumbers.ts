'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Calcule le numéro de match ("Match #1", "#2", ...) de chaque entraînement,
 * basé sur l'ordre chronologique de TOUS les entraînements existants
 * (passés et à venir). Pas de colonne en base : purement calculé côté client.
 */
export function useGameNumbers() {
  const [gameNumbers, setGameNumbers] = useState<Record<string, number>>({})

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('trainings')
      .select('id, date_time')
      .order('date_time', { ascending: true })
      .then(({ data }) => {
        const map: Record<string, number> = {}
        ;(data || []).forEach((t: { id: string }, i: number) => {
          map[t.id] = i + 1
        })
        setGameNumbers(map)
      })
  }, [])

  return gameNumbers
}
