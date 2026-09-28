'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type LeagueTeams = {
  noirName: string
  blancName: string
  noirColor: string
  blancColor: string
}

const DEFAULT_TEAMS: LeagueTeams = {
  noirName: 'Noir',
  blancName: 'Blanc',
  noirColor: '#1A1A1A',
  blancColor: '#FFFFFF',
}

export function getContrastText(hex: string): string {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return '#fff'
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#1A1A1A' : '#fff'
}

export function useLeagueTeams(): LeagueTeams {
  const [teams, setTeams] = useState<LeagueTeams>(DEFAULT_TEAMS)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: player } = await supabase
        .from('players')
        .select('league_id')
        .eq('auth_user_id', user.id)
        .maybeSingle()
      if (!player) return

      const { data: league } = await supabase
        .from('leagues')
        .select('team_noir_name, team_blanc_name, team_noir_color, team_blanc_color')
        .eq('id', player.league_id)
        .maybeSingle()

      if (league && !cancelled) {
        setTeams({
          noirName: league.team_noir_name,
          blancName: league.team_blanc_name,
          noirColor: league.team_noir_color,
          blancColor: league.team_blanc_color,
        })
      }
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
    return () => { cancelled = true }
  }, [])

  return teams
}
