'use client'

import { useState } from 'react'
import NavBar from '@/app/components/NavBar'
import DefisTab from './DefisTab'
import BadgesTab from './BadgesTab'

const CLUB_BLUE = '#003F6E'

export default function DefisPage() {
  const [tab, setTab] = useState<'defis' | 'badges'>('defis')

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: 800, margin: '40px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
        <h1 style={{ marginBottom: 16 }}>Défis</h1>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button
            onClick={() => setTab('defis')}
            style={{
              padding: '8px 16px', borderRadius: 20, border: `1px solid ${CLUB_BLUE}`, cursor: 'pointer',
              background: tab === 'defis' ? CLUB_BLUE : '#fff',
              color: tab === 'defis' ? '#fff' : CLUB_BLUE,
            }}
          >
            Défis
          </button>
          <button
            onClick={() => setTab('badges')}
            style={{
              padding: '8px 16px', borderRadius: 20, border: `1px solid ${CLUB_BLUE}`, cursor: 'pointer',
              background: tab === 'badges' ? CLUB_BLUE : '#fff',
              color: tab === 'badges' ? '#fff' : CLUB_BLUE,
            }}
          >
            Badges
          </button>
        </div>

        {tab === 'defis' ? <DefisTab /> : <BadgesTab />}
      </div>
    </div>
  )
}
