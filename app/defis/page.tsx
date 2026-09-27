'use client'

import { useState } from 'react'
import NavBar from '@/app/components/NavBar'
import DefisTab from './DefisTab'
import BadgesTab from './BadgesTab'

const CLUB_BLUE = '#003F6E'

export default function DefisPage() {
  const [challengeTotals, setChallengeTotals] = useState({ noir: 0, blanc: 0 })
  const [badgeTotals, setBadgeTotals] = useState({ noir: 0, blanc: 0 })

  const noir = challengeTotals.noir + badgeTotals.noir
  const blanc = challengeTotals.blanc + badgeTotals.blanc
  const total = noir + blanc || 1
  const pctNoir = Math.round((noir / total) * 100)

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: 800, margin: '40px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
        <h1 style={{ marginBottom: 8, color: CLUB_BLUE, fontSize: 26 }}>Défis &amp; Badges</h1>
        <p style={{ color: '#666', marginBottom: 20 }}>
          Défis d&apos;équipe à valider pendant les matches et badges débloqués automatiquement — classement combiné sur la saison.
        </p>

        <div className="blm-card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 6 }}>
            <span>Noir — {noir} pts</span>
            <span>Blanc — {blanc} pts</span>
          </div>
          <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ width: `${pctNoir}%`, background: '#111' }} />
            <div style={{ width: `${100 - pctNoir}%`, background: '#ccc' }} />
          </div>
        </div>

        <DefisTab onTotals={setChallengeTotals} />
        <BadgesTab onTotals={setBadgeTotals} />
      </div>
    </div>
  )
}
